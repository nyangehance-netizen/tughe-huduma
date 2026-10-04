-- =====================================================================
-- TUGHE Huduma — database schema
-- Members report workplace problems; officers resolve them on deadlines.
-- Run with:  supabase db push   (or paste into the SQL editor)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin create type public.user_role    as enum ('member','officer','admin');                          exception when duplicate_object then null; end $$;
do $$ begin create type public.case_status  as enum ('received','review','action','resolved','closed');      exception when duplicate_object then null; end $$;
do $$ begin create type public.case_urgency as enum ('normal','high');                                      exception when duplicate_object then null; end $$;
do $$ begin create type public.msg_kind     as enum ('member','officer','bot');                              exception when duplicate_object then null; end $$;

-- ---------- profiles (one per signed-in person) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  email       text,
  check_no    text,
  member_no   text,
  employer    text,
  station     text,
  region      text,
  role        public.user_role not null default 'member',
  lang        text not null default 'sw' check (lang in ('sw','en')),
  push_token  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- problem categories (editable by admins) ----------
create table if not exists public.categories (
  id        text primary key,
  name_sw   text not null,
  name_en   text not null,
  urgent    boolean not null default false,
  docs_sw   text[] not null default '{}',
  docs_en   text[] not null default '{}',
  sort      int not null default 0
);

insert into public.categories (id,name_sw,name_en,urgent,docs_sw,docs_en,sort) values
 ('salary','Mshahara na malimbikizo','Salary and arrears',false,
   array['Hati za mshahara za miezi husika','Barua ya stahiki (kupandishwa/uhamisho)','Nakala ya barua uliyomwandikia mwajiri'],
   array['Payslips for the months concerned','Entitlement letter (promotion/transfer)','Copy of your letter to the employer'],1),
 ('promotion','Kupandishwa daraja / cheo','Promotion and grading',false,
   array['Barua ya ajira na ya daraja la mwisho','Fomu za OPRAS za miaka 3 iliyopita','Vyeti vya elimu vilivyohakikiwa'],
   array['Appointment letter and last grading letter','OPRAS forms for the last 3 years','Verified academic certificates'],2),
 ('transfer','Uhamisho','Transfer',false,
   array['Barua ya uhamisho','Barua ya kuripoti kituo kipya','Risiti za gharama za usafiri (kama zipo)'],
   array['Transfer letter','Reporting letter at the new station','Travel cost receipts (if any)'],3),
 ('discipline','Nidhamu na kuachishwa kazi','Discipline and dismissal',true,
   array['Hati ya mashtaka / barua ya tuhuma','Barua ya kusimamishwa au kuachishwa kazi','Majibu yako ya utetezi (kama umeandika)'],
   array['Charge sheet / letter of allegations','Suspension or termination letter','Your written defence (if any)'],4),
 ('leave','Likizo na stahiki','Leave and entitlements',false,
   array['Barua ya maombi ya likizo','Majibu ya mwajiri (kama yapo)','Cheti cha daktari (likizo ya ugonjwa/uzazi)'],
   array['Leave application letter','Employer''s reply (if any)','Medical certificate (sick/maternity leave)'],5),
 ('safety','Usalama na afya kazini','Health and safety at work',false,
   array['Ripoti ya ajali / fomu ya WCF','Taarifa ya daktari','Picha au maelezo ya mazingira hatarishi'],
   array['Accident report / WCF form','Medical report','Photos or description of the hazard'],6),
 ('pension','Mafao na pensheni','Pension and benefits',false,
   array['Taarifa ya michango ya PSSSF','Namba ya uanachama wa PSSSF','Barua ya kustaafu (kama ipo)'],
   array['PSSSF contribution statement','PSSSF membership number','Retirement letter (if any)'],7),
 ('membership','Uanachama na michango','Membership and dues',false,
   array['Hati ya mshahara inayoonyesha makato','Nakala ya fomu ya uanachama'],
   array['Payslip showing deductions','Copy of membership form'],8),
 ('harassment','Unyanyasaji na ubaguzi','Harassment and discrimination',true,
   array['Maelezo ya matukio (tarehe, mahali)','Majina ya mashahidi (kama wapo)','Ujumbe au barua zinazohusika'],
   array['Account of incidents (dates, places)','Names of witnesses (if any)','Related messages or letters'],9),
 ('other','Mengineyo','Other',false,'{}','{}',10)
on conflict (id) do nothing;

-- ---------- service-time settings (working days) ----------
create table if not exists public.sla_settings (
  urgency        public.case_urgency primary key,
  respond_days   int not null,
  resolve_days   int not null
);
insert into public.sla_settings values ('normal',3,21),('high',1,7) on conflict do nothing;

-- ---------- cases ----------
create table if not exists public.cases (
  id                 uuid primary key default gen_random_uuid(),
  ref                text unique,
  member_id          uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category           text not null references public.categories(id),
  title              text not null check (char_length(title) between 3 and 160),
  description        text not null check (char_length(description) between 10 and 6000),
  urgency            public.case_urgency not null default 'normal',
  auto_urgent        boolean not null default false,
  contact_pref       text not null default 'phone' check (contact_pref in ('phone','sms','office')),
  status             public.case_status not null default 'received',
  -- snapshot of the member's details at submission
  member_name        text, member_phone text, check_no text, member_no text,
  employer           text, station text, region text,
  -- handling
  officer_id         uuid references public.profiles(id),
  officer_name       text,
  respond_by         timestamptz,
  due_at             timestamptz,
  first_response_at  timestamptz,
  resolved_at        timestamptz,
  resolution         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists cases_member_idx on public.cases(member_id, updated_at desc);
create index if not exists cases_open_idx   on public.cases(status, due_at);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  sender_id   uuid default auth.uid() references public.profiles(id) on delete set null,
  sender_name text,
  kind        public.msg_kind not null,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);
create index if not exists messages_case_idx on public.messages(case_id, created_at);

-- internal notes: officers only
create table if not exists public.case_notes (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.cases(id) on delete cascade,
  author_id   uuid default auth.uid() references public.profiles(id) on delete set null,
  author_name text,
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now()
);

-- activity log: officers only
create table if not exists public.case_events (
  id          bigint generated always as identity primary key,
  case_id     uuid not null references public.cases(id) on delete cascade,
  actor_id    uuid,
  actor_name  text,
  event       text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists case_events_case_idx on public.case_events(case_id, created_at);

-- ---------- helpers ----------
create or replace function public.is_officer() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('officer','admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(full_name,''), 'TUGHE') from public.profiles where id = auth.uid();
$$;

-- add n working days (Mon–Fri) in Tanzanian time; deadline is 17:00 that day
create or replace function public.add_work_days(start_ts timestamptz, n int) returns timestamptz
language plpgsql stable as $$
declare d date := (start_ts at time zone 'Africa/Dar_es_Salaam')::date; k int := 0;
begin
  while k < n loop
    d := d + 1;
    if extract(isodow from d) < 6 then k := k + 1; end if;
  end loop;
  return (d + time '17:00') at time zone 'Africa/Dar_es_Salaam';
end $$;

create or replace function public.log_event(p_case uuid, p_event text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into public.case_events(case_id, actor_id, actor_name, event, detail)
  values (p_case, auth.uid(), public.my_name(), p_event, p_detail);
$$;

-- ---------- new user -> profile ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, email)
  values (new.id, new.phone, new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- members cannot promote themselves
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- the SQL editor / service role (no signed-in user) may set roles; in the app only admins can
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

-- ---------- case submission: reference, snapshot, triage, deadlines ----------
create or replace function public.before_case_insert() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare p public.profiles; s public.sla_settings; cat public.categories;
begin
  select * into p from public.profiles where id = new.member_id;
  select * into cat from public.categories where id = new.category;

  new.ref := 'TGH-' || to_char(now() at time zone 'Africa/Dar_es_Salaam','YYMMDD') || '-' ||
             upper(substr(encode(gen_random_bytes(4),'hex'),1,4));
  new.status := 'received';
  new.officer_id := null; new.officer_name := null;
  new.first_response_at := null; new.resolved_at := null; new.resolution := null;
  new.created_at := now(); new.updated_at := now();
  new.member_name := p.full_name; new.member_phone := coalesce(p.phone, new.member_phone);
  new.check_no := p.check_no; new.member_no := p.member_no;
  new.employer := p.employer; new.station := p.station; new.region := p.region;

  -- automatic triage: urgent categories or urgent words
  if new.urgency <> 'high' and (coalesce(cat.urgent,false) or
     (new.title || ' ' || new.description) ~* '(kufukuz|kuachishwa|kusimamish|unyanyas|ajali|jeraha|dismiss|terminat|suspend|harass|injur|accident)') then
    new.urgency := 'high'; new.auto_urgent := true;
  end if;

  select * into s from public.sla_settings where urgency = new.urgency;
  new.respond_by := public.add_work_days(now(), s.respond_days);
  new.due_at     := public.add_work_days(now(), s.resolve_days);
  return new;
end $$;
drop trigger if exists cases_before_insert on public.cases;
create trigger cases_before_insert before insert on public.cases
  for each row execute function public.before_case_insert();

-- bot acknowledgement with document checklist
create or replace function public.after_case_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare cat public.categories; lang text; docs text[]; body text; due text;
begin
  select * into cat from public.categories where id = new.category;
  select coalesce(p.lang,'sw') into lang from public.profiles p where p.id = new.member_id;
  due := to_char(new.respond_by at time zone 'Africa/Dar_es_Salaam', 'DD/MM/YYYY');
  if lang = 'en' then
    docs := cat.docs_en;
    body := 'Hello ' || split_part(coalesce(new.member_name,''),' ',1) || '. Your case ' || new.ref || ' (' || cat.name_en ||
            ') has been received. A TUGHE officer will reply before ' || due || '.';
    if new.auto_urgent then body := body || E'\n\nThis case has been marked URGENT.'; end if;
    if array_length(docs,1) > 0 then body := body || E'\n\nTo speed things up, prepare:\n• ' || array_to_string(docs, E'\n• '); end if;
  else
    docs := cat.docs_sw;
    body := 'Habari ' || split_part(coalesce(new.member_name,''),' ',1) || '. Shauri lako ' || new.ref || ' (' || cat.name_sw ||
            ') limepokelewa. Afisa wa TUGHE atakujibu kabla ya ' || due || '.';
    if new.auto_urgent then body := body || E'\n\nShauri hili limewekwa kama la HARAKA.'; end if;
    if array_length(docs,1) > 0 then body := body || E'\n\nIli kuharakisha, andaa:\n• ' || array_to_string(docs, E'\n• '); end if;
  end if;
  insert into public.messages(case_id, sender_id, sender_name, kind, body)
  values (new.id, null, 'TUGHE', 'bot', body);
  perform public.log_event(new.id, 'created', new.urgency::text);
  return new;
end $$;
drop trigger if exists cases_after_insert on public.cases;
create trigger cases_after_insert after insert on public.cases
  for each row execute function public.after_case_insert();

-- officer updates: first response, resolution rules, timestamps
create or replace function public.before_case_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- identity fields never change after submission
  new.id := old.id; new.ref := old.ref; new.member_id := old.member_id; new.created_at := old.created_at;
  new.updated_at := now();
  if new.status is distinct from old.status and old.status = 'received' and new.first_response_at is null then
    new.first_response_at := now();
  end if;
  if new.status in ('resolved','closed') and old.status not in ('resolved','closed') then
    if coalesce(btrim(new.resolution),'') = '' then
      raise exception 'RESOLUTION_REQUIRED' using hint = 'Write how the case was resolved before closing it.';
    end if;
    new.resolved_at := now();
  elsif new.status not in ('resolved','closed') then
    new.resolved_at := null;
  end if;
  return new;
end $$;
drop trigger if exists cases_before_update on public.cases;
create trigger cases_before_update before update on public.cases
  for each row execute function public.before_case_update();

create or replace function public.after_case_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare lang text;
begin
  if new.status is distinct from old.status then
    perform public.log_event(new.id, 'status', new.status::text);
    if new.status = 'resolved' then
      select coalesce(p.lang,'sw') into lang from public.profiles p where p.id = new.member_id;
      insert into public.messages(case_id, sender_id, sender_name, kind, body)
      values (new.id, auth.uid(), coalesce(new.officer_name, public.my_name()), 'officer',
              case when lang='en' then 'Your case has been resolved: ' else 'Shauri lako limetatuliwa: ' end || new.resolution);
    end if;
  end if;
  if new.officer_id is distinct from old.officer_id or new.officer_name is distinct from old.officer_name then
    perform public.log_event(new.id, 'assigned', coalesce(new.officer_name,'—'));
  end if;
  if new.due_at is distinct from old.due_at then
    perform public.log_event(new.id, 'extended', to_char(new.due_at at time zone 'Africa/Dar_es_Salaam','DD/MM/YYYY'));
  end if;
  return new;
end $$;
drop trigger if exists cases_after_update on public.cases;
create trigger cases_after_update after update on public.cases
  for each row execute function public.after_case_update();

-- messages: officer reply counts as first response; keep case "updated_at" fresh
create or replace function public.after_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'officer' then
    update public.cases
       set first_response_at = coalesce(first_response_at, now()),
           status = case when status = 'received' then 'review'::public.case_status else status end,
           officer_id = coalesce(officer_id, new.sender_id),
           officer_name = coalesce(officer_name, new.sender_name)
     where id = new.case_id;
    perform public.log_event(new.case_id, 'reply', null);
  elsif new.kind = 'member' then
    update public.cases set updated_at = now() where id = new.case_id;
  end if;
  return new;
end $$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.after_message_insert();

create or replace function public.before_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.kind <> 'bot' then
    new.sender_id := auth.uid();
    new.sender_name := public.my_name();
  end if;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages
  for each row execute function public.before_message_insert();

create or replace function public.before_note_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_id := auth.uid(); new.author_name := public.my_name(); new.created_at := now();
  perform public.log_event(new.case_id, 'note', null);
  return new;
end $$;
drop trigger if exists notes_before_insert on public.case_notes;
create trigger notes_before_insert before insert on public.case_notes
  for each row execute function public.before_note_insert();

-- ---------- row level security ----------
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.sla_settings enable row level security;
alter table public.cases        enable row level security;
alter table public.messages     enable row level security;
alter table public.case_notes   enable row level security;
alter table public.case_events  enable row level security;

drop policy if exists "profiles read"   on public.profiles;
drop policy if exists "profiles update" on public.profiles;
create policy "profiles read"   on public.profiles for select using (id = auth.uid() or public.is_officer());
create policy "profiles update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "categories read"  on public.categories;
drop policy if exists "categories admin" on public.categories;
create policy "categories read"  on public.categories for select using (true);
create policy "categories admin" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "sla read"  on public.sla_settings;
drop policy if exists "sla admin" on public.sla_settings;
create policy "sla read"  on public.sla_settings for select using (true);
create policy "sla admin" on public.sla_settings for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cases read"   on public.cases;
drop policy if exists "cases insert" on public.cases;
drop policy if exists "cases update" on public.cases;
create policy "cases read"   on public.cases for select using (member_id = auth.uid() or public.is_officer());
create policy "cases insert" on public.cases for insert with check (member_id = auth.uid());
create policy "cases update" on public.cases for update using (public.is_officer()) with check (public.is_officer());

drop policy if exists "messages read"   on public.messages;
drop policy if exists "messages insert" on public.messages;
create policy "messages read" on public.messages for select using (
  public.is_officer() or exists (select 1 from public.cases c where c.id = case_id and c.member_id = auth.uid()));
create policy "messages insert" on public.messages for insert with check (
  (kind = 'member'  and exists (select 1 from public.cases c where c.id = case_id and c.member_id = auth.uid() and c.status <> 'closed'))
  or (kind = 'officer' and public.is_officer()));

drop policy if exists "notes officers"  on public.case_notes;
drop policy if exists "events officers" on public.case_events;
create policy "notes officers"  on public.case_notes  for all    using (public.is_officer()) with check (public.is_officer());
create policy "events officers" on public.case_events for select using (public.is_officer());

-- ---------- live updates ----------
do $$ begin
  alter publication supabase_realtime add table public.cases;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.case_notes;
exception when others then null; end $$;

-- ---------- officer dashboard numbers ----------
create or replace view public.desk_stats with (security_invoker = on) as
select
  count(*) filter (where status not in ('resolved','closed'))                                         as open_cases,
  count(*) filter (where status not in ('resolved','closed') and (due_at < now()
                    or (first_response_at is null and respond_by < now())))                            as overdue,
  count(*) filter (where status not in ('resolved','closed') and due_at >= now()
                    and due_at < now() + interval '2 days')                                           as due_soon,
  count(*) filter (where status not in ('resolved','closed') and officer_id is null)                   as unassigned,
  count(*) filter (where resolved_at > now() - interval '30 days')                                    as resolved_30d,
  round(avg(extract(epoch from (resolved_at - created_at)) / 86400.0)
        filter (where resolved_at is not null)::numeric, 1)                                            as avg_days_to_resolve
from public.cases;
