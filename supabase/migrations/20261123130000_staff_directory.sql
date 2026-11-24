-- CareFlow staff directory. Apply once to a Supabase project using its
-- SQL editor, after supabase/schema.sql.
-- No live project has been changed by preparing this file.
-- This is a reviewed bootstrap script, not an applied migration.
--
-- Purpose: a real, home-scoped staff directory to replace the fictional
-- /people prototype (docs/PEOPLE_PAYROLL_FOUNDATION.md). It adds employee
-- profiles, history-preserving home assignments, and credential / training
-- expiry records. It fixes the "unassigned source directory" gap in
-- docs/PRODUCTION_RELEASE.md item 5: Intuit sandbox employees are imported
-- as status 'unmapped' rows and stay unmapped until an owner explicitly
-- maps each one to a home and a CareFlow user.
--
-- Compensation is deliberately OUT of CareFlow v1. There is no salary,
-- bank, tax, or SSN column anywhere in this migration. Payroll execution,
-- tax filings, and direct deposit stay with the licensed payroll provider.
-- Only names, roles, dates, and assignment / credential records are
-- stored here. Never store bank details, SSNs, or other payroll identifiers.
begin;

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  home_id uuid references public.homes(id),
  user_id uuid references auth.users(id),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 200),
  role_text text not null default '' check (char_length(role_text) <= 120),
  hire_date date,
  status text not null default 'unmapped' check (status in ('active', 'inactive', 'unmapped')),
  external_source text check (external_source is null or char_length(btrim(external_source)) between 1 and 60),
  external_id text check (external_id is null or char_length(btrim(external_id)) between 1 and 120),
  created_at timestamptz not null default now(),
  -- An external row always carries both source and id, or neither.
  check ((external_source is null) = (external_id is null)),
  -- Unmapped rows belong to no home and no CareFlow user yet. A mapped
  -- row (active / inactive) always belongs to exactly one home.
  check ((status = 'unmapped' and home_id is null and user_id is null)
      or (status in ('active', 'inactive') and home_id is not null))
);
-- Idempotent external sync: one row per (source, external id). Re-running
-- an Intuit sandbox sync must update, never duplicate, the same rows.
create unique index employees_external_idx on public.employees(external_source, external_id) where external_id is not null;
create index employees_home_idx on public.employees(home_id);
create index employees_user_idx on public.employees(user_id) where user_id is not null;

create table public.employee_home_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  home_id uuid not null references public.homes(id),
  role text not null check (role in ('admin', 'staff', 'viewer')),
  start_date date not null,
  end_date date,
  assigned_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
-- History-preserving: assignments are never deleted. Ending an assignment
-- sets end_date; at most one open (end_date is null) assignment may exist
-- per employee and home.
create unique index employee_assignments_open_idx on public.employee_home_assignments(employee_id, home_id) where end_date is null;
create index employee_assignments_employee_idx on public.employee_home_assignments(employee_id, start_date desc);

create table public.employee_credentials (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id),
  credential_type text not null check (credential_type in ('orientation', 'training', 'license', 'other')),
  issued_date date,
  expiry_date date,
  evidence_record_id uuid references public.records(id),
  created_at timestamptz not null default now(),
  check (expiry_date is null or issued_date is null or expiry_date >= issued_date)
);
create index employee_credentials_employee_idx on public.employee_credentials(employee_id, expiry_date);

alter table public.employees enable row level security;
alter table public.employee_home_assignments enable row level security;
alter table public.employee_credentials enable row level security;
revoke all on public.employees, public.employee_home_assignments, public.employee_credentials from anon, authenticated;
-- No delete grant on any staff table: employees are deactivated with
-- status 'inactive', assignments are ended with end_date. History stays.
grant select, insert, update on public.employees to authenticated;
grant select, insert, update on public.employee_home_assignments to authenticated;
grant select, insert, update on public.employee_credentials to authenticated;

-- Mapped employees are visible to every member of their home (owner,
-- admin, staff, viewer). Unmapped rows belong to no home, so they are
-- visible only to owners (any home owner) at MFA assurance aal2, so an
-- owner can find and map them. No other caller can see the unmapped pool.
create policy employee_read on public.employees for select to authenticated using (
  careflow_private.home_role(home_id) is not null
  or (home_id is null and status = 'unmapped'
      and (select auth.jwt()->>'aal') = 'aal2'
      and exists (select 1 from public.homes h where h.owner_id = (select auth.uid())))
);
create policy employee_create on public.employees for insert to authenticated with check (
  (home_id is not null and careflow_private.home_role(home_id) in ('owner', 'admin'))
  or (home_id is null and status = 'unmapped'
      and (select auth.jwt()->>'aal') = 'aal2'
      and exists (select 1 from public.homes h where h.owner_id = (select auth.uid())))
);
create policy employee_update on public.employees for update to authenticated using (
  careflow_private.home_role(home_id) in ('owner', 'admin')
  or (home_id is null and status = 'unmapped'
      and (select auth.jwt()->>'aal') = 'aal2'
      and exists (select 1 from public.homes h where h.owner_id = (select auth.uid())))
) with check (
  careflow_private.home_role(home_id) in ('owner', 'admin')
  or (home_id is null and status = 'unmapped'
      and (select auth.jwt()->>'aal') = 'aal2'
      and exists (select 1 from public.homes h where h.owner_id = (select auth.uid())))
);

create policy assignment_read on public.employee_home_assignments for select to authenticated using (
  careflow_private.home_role(home_id) is not null
);
create policy assignment_create on public.employee_home_assignments for insert to authenticated with check (
  careflow_private.home_role(home_id) in ('owner', 'admin')
);
create policy assignment_update on public.employee_home_assignments for update to authenticated using (
  careflow_private.home_role(home_id) in ('owner', 'admin')
) with check (
  careflow_private.home_role(home_id) in ('owner', 'admin')
);

-- Credentials are scoped through their employee's home. An employee with
-- no home (unmapped) has no credentials yet, so no unmapped exception
-- is needed here.
create policy credential_read on public.employee_credentials for select to authenticated using (
  exists (select 1 from public.employees e
    where e.id = employee_credentials.employee_id
    and careflow_private.home_role(e.home_id) is not null)
);
create policy credential_create on public.employee_credentials for insert to authenticated with check (
  exists (select 1 from public.employees e
    where e.id = employee_credentials.employee_id
    and careflow_private.home_role(e.home_id) in ('owner', 'admin'))
);
create policy credential_update on public.employee_credentials for update to authenticated using (
  exists (select 1 from public.employees e
    where e.id = employee_credentials.employee_id
    and careflow_private.home_role(e.home_id) in ('owner', 'admin'))
) with check (
  exists (select 1 from public.employees e
    where e.id = employee_credentials.employee_id
    and careflow_private.home_role(e.home_id) in ('owner', 'admin'))
);

-- Assignment changes are audited in public.activity, following the
-- audit_membership pattern in schema.sql. Assignment rows themselves are
-- never deleted, so the history is preserved in both places.
create function careflow_private.audit_assignment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is not null then
  insert into public.activity(home_id, action, actor_id)
  values(new.home_id,
    case when TG_OP = 'INSERT' then 'Assignment started'
         when new.end_date is distinct from old.end_date and new.end_date is not null then 'Assignment ended'
         else 'Assignment updated' end,
    (select auth.uid()));
 end if;
 return new;
end $$;
revoke all on function careflow_private.audit_assignment() from public, anon, authenticated;
create trigger assignments_audit after insert or update on public.employee_home_assignments for each row execute function careflow_private.audit_assignment();

commit;
