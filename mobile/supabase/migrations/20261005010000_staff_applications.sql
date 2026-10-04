-- =====================================================================
-- TUGHE Huduma — officers apply through their own app (TUGHE Dawati)
-- and an administrator approves them before they can see any member data.
-- =====================================================================

create table if not exists public.staff_applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique default auth.uid() references public.profiles(id) on delete cascade,
  full_name       text not null check (char_length(full_name) between 3 and 120),
  staff_no        text not null check (char_length(staff_no) between 2 and 40),
  position        text not null check (position in ('zonal','regional','branch','legal','hq','ict')),
  office_region   text not null,
  work_email      text not null check (work_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone           text,
  pledge_at       timestamptz not null default now(),
  status          text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  reason          text,
  decided_by      uuid references public.profiles(id) on delete set null,
  decided_by_name text,
  decided_at      timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.staff_applications enable row level security;

drop policy if exists "applications read"   on public.staff_applications;
drop policy if exists "applications insert" on public.staff_applications;
create policy "applications read"   on public.staff_applications for select using (user_id = auth.uid() or public.is_admin());
create policy "applications insert" on public.staff_applications for insert with check (user_id = auth.uid());
-- No update/delete policies: decisions are made only through decide_staff_application().

-- An application always starts as "pending", for the person who sent it.
create or replace function public.before_application_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.status := 'pending';
  new.reason := null; new.decided_by := null; new.decided_by_name := null; new.decided_at := null;
  new.pledge_at := now(); new.created_at := now();
  select phone into new.phone from public.profiles where id = auth.uid();
  -- keep the profile in step with the work details
  update public.profiles
     set full_name = new.full_name, check_no = new.staff_no, employer = 'TUGHE', station = new.position, region = new.office_region,
         email = coalesce(email, new.work_email)
   where id = auth.uid();
  return new;
end $$;
drop trigger if exists applications_before_insert on public.staff_applications;
create trigger applications_before_insert before insert on public.staff_applications
  for each row execute function public.before_application_insert();

-- Administrator decision. Approving makes the person an officer; rejecting or suspending removes officer access at once.
create or replace function public.decide_staff_application(p_id uuid, p_decision text, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare a public.staff_applications;
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if p_decision not in ('approved','rejected','suspended') then raise exception 'BAD_DECISION'; end if;
  select * into a from public.staff_applications where id = p_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if a.user_id = auth.uid() then raise exception 'CANNOT_DECIDE_OWN'; end if;
  update public.staff_applications
     set status = p_decision, reason = nullif(btrim(coalesce(p_reason,'')), ''),
         decided_by = auth.uid(), decided_by_name = public.my_name(), decided_at = now()
   where id = p_id;
  -- admins are never demoted from here
  update public.profiles
     set role = case when p_decision = 'approved' then 'officer'::public.user_role else 'member'::public.user_role end
   where id = a.user_id and role <> 'admin';
end $$;
revoke all on function public.decide_staff_application(uuid, text, text) from public;
grant execute on function public.decide_staff_application(uuid, text, text) to authenticated;

-- Officer accounts don't sign in to the members' app and vice versa; the apps check this.
-- The database already enforces what each role can read (see the earlier migrations).
