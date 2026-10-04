-- =====================================================================
-- TUGHE Huduma — privacy & security additions
--   • consent record on each profile
--   • every officer view of a case is recorded, and the member can see who looked
--   • members can delete their account (via the delete-account function)
-- =====================================================================

alter table public.profiles add column if not exists consent_at timestamptz;
alter table public.profiles add column if not exists consent_version text;

-- Who opened which case, and when. Members see the views of their own cases.
create table if not exists public.case_views (
  id           bigint generated always as identity primary key,
  case_id      uuid not null references public.cases(id) on delete cascade,
  officer_id   uuid references public.profiles(id) on delete set null,
  officer_name text,
  viewed_at    timestamptz not null default now()
);
create index if not exists case_views_case_idx on public.case_views(case_id, viewed_at desc);
alter table public.case_views enable row level security;

drop policy if exists "views read" on public.case_views;
create policy "views read" on public.case_views for select using (
  public.is_officer() or exists (select 1 from public.cases c where c.id = case_id and c.member_id = auth.uid()));
-- No insert/update/delete policies: rows are only written by log_case_view() below, and nobody can edit them.

-- Officers call this when they open a case. At most one entry per officer per case every 12 hours.
create or replace function public.log_case_view(p_case uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_officer() then return; end if;
  if exists (select 1 from public.case_views
              where case_id = p_case and officer_id = auth.uid() and viewed_at > now() - interval '12 hours') then
    return;
  end if;
  insert into public.case_views(case_id, officer_id, officer_name) values (p_case, auth.uid(), public.my_name());
end $$;
revoke all on function public.log_case_view(uuid) from public;
grant execute on function public.log_case_view(uuid) to authenticated;

-- Members may only change their own contact details, not identity or role fields set by TUGHE.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- the SQL editor / service role (no signed-in user) may set roles; in the app only admins can
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

-- Message bodies are append-only: there are no update or delete policies on public.messages,
-- so row level security refuses both for everyone using the app.
