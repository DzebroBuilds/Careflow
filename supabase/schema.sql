-- CareFlow schema. Apply once to a new Supabase project using its SQL editor.
-- No live project has been changed by preparing this file.
begin;
create schema if not exists careflow_private;
revoke all on schema careflow_private from public;
grant usage on schema careflow_private to authenticated;

create table public.homes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 name text not null check (char_length(btrim(name)) between 1 and 120),
 license_due date not null,
 created_at timestamptz not null default now()
);
create table public.home_members (
 home_id uuid not null references public.homes(id),
 user_id uuid not null references auth.users(id),
 role text not null check (role in ('admin','staff','viewer')),
 primary key(home_id,user_id)
);
create index home_members_user_idx on public.home_members(user_id);
create table public.records (
 id uuid primary key default gen_random_uuid(),
 home_id uuid not null references public.homes(id),
 category text not null check (category in ('Residents','Staff orientation','Medication records','Incidents','Inspection binder','Corrective actions','Monthly reviews')),
 title text not null check (char_length(btrim(title)) between 1 and 200),
 subject text not null default '' check (char_length(subject)<=200),
 assignee text not null default '' check (char_length(assignee)<=120),
 due_date date not null,
 priority text not null default 'Normal' check (priority in ('Normal','High')),
 status text not null default 'Open' check (status in ('Open','In review','Complete')),
 notes text not null default '' check (char_length(notes)<=10000),
 evidence_path text,
 evidence_name text,
 updated_at timestamptz not null default now(),
 check ((evidence_path is null and evidence_name is null) or (evidence_path is not null and evidence_name is not null and evidence_path like home_id::text || '/' || id::text || '/%'))
);
create index records_home_due_idx on public.records(home_id,due_date);
create table public.activity (
 id uuid primary key default gen_random_uuid(),
 home_id uuid not null references public.homes(id),
 record_id uuid,
 action text not null,
 actor_id uuid,
 created_at timestamptz not null default now()
);
create index activity_home_time_idx on public.activity(home_id,created_at desc);

-- Staff directory (see supabase/migrations/20261123130000_staff_directory.sql
-- and docs/staff-directory.md). Compensation is deliberately out of CareFlow
-- v1: no salary, bank, tax, or SSN column exists in these tables.
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
  check ((external_source is null) = (external_id is null)),
  check ((status = 'unmapped' and home_id is null and user_id is null)
      or (status in ('active', 'inactive') and home_id is not null))
);
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

-- Necessary definer lookup avoids recursive membership RLS; the only identity
-- accepted is auth.uid(), never a caller-supplied user or editable JWT metadata.
create function careflow_private.home_role(target uuid) returns text
language sql stable security definer set search_path = ''
as $$
 select case when h.owner_id = (select auth.uid()) then 'owner'
 else (select m.role from public.home_members m where m.home_id=h.id and m.user_id=(select auth.uid())) end
 from public.homes h where h.id=target and (select auth.uid()) is not null and (select auth.jwt()->>'aal')='aal2'
$$;
revoke all on function careflow_private.home_role(uuid) from public,anon;
grant execute on function careflow_private.home_role(uuid) to authenticated;

alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.records enable row level security;
alter table public.activity enable row level security;
alter table public.employees enable row level security;
alter table public.employee_home_assignments enable row level security;
alter table public.employee_credentials enable row level security;
revoke all on public.homes,public.home_members,public.records,public.activity from anon,authenticated;
revoke all on public.employees, public.employee_home_assignments, public.employee_credentials from anon, authenticated;
grant select,insert,update on public.homes to authenticated;
grant select,insert,update,delete on public.home_members to authenticated;
grant select,insert,update on public.records to authenticated;
grant select on public.activity to authenticated;
-- No delete grant on any staff table: employees are deactivated with
-- status 'inactive', assignments are ended with end_date. History stays.
grant select, insert, update on public.employees to authenticated;
grant select, insert, update on public.employee_home_assignments to authenticated;
grant select, insert, update on public.employee_credentials to authenticated;

create policy home_read on public.homes for select to authenticated using (careflow_private.home_role(id) is not null);
create policy home_create on public.homes for insert to authenticated with check (owner_id=(select auth.uid()) and (select auth.uid()) is not null and (select auth.jwt()->>'aal')='aal2');
create policy home_update on public.homes for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy member_read on public.home_members for select to authenticated using ((user_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2') or careflow_private.home_role(home_id) in ('owner','admin'));
-- Only the owner provisions access, preventing admin privilege escalation.
create policy member_create on public.home_members for insert to authenticated with check (careflow_private.home_role(home_id)='owner');
create policy member_update on public.home_members for update to authenticated using (careflow_private.home_role(home_id)='owner') with check (careflow_private.home_role(home_id)='owner');
create policy member_delete on public.home_members for delete to authenticated using (careflow_private.home_role(home_id)='owner');
create policy record_read on public.records for select to authenticated using (careflow_private.home_role(home_id) is not null);
create policy record_create on public.records for insert to authenticated with check (
 careflow_private.home_role(home_id) in ('owner','admin') or (careflow_private.home_role(home_id)='staff' and status<>'Complete')
);
create policy record_update on public.records for update to authenticated using (
 careflow_private.home_role(home_id) in ('owner','admin') or (careflow_private.home_role(home_id)='staff' and status<>'Complete')
) with check (
 careflow_private.home_role(home_id) in ('owner','admin') or (careflow_private.home_role(home_id)='staff' and status<>'Complete')
);
create policy activity_read on public.activity for select to authenticated using (careflow_private.home_role(home_id) is not null);

-- Mapped employees are visible to every member of their home. Unmapped rows
-- belong to no home, so they are visible only to owners (any home owner) at
-- MFA assurance aal2, so an owner can find and map them.
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

-- Credentials are scoped through their employee's home.
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

create function careflow_private.record_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.id<>old.id or new.home_id<>old.home_id) then raise exception 'Record identity and home cannot change'; end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function careflow_private.record_guard() from public,anon,authenticated;
create trigger records_guard before insert or update on public.records for each row execute function careflow_private.record_guard();

-- Audit writes run only through triggers. Authenticated clients cannot forge,
-- rewrite, or delete events. Payload omits clinical notes and record titles.
create function careflow_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null then return new; end if;
 if TG_TABLE_NAME='homes' then
 insert into public.activity(home_id,action,actor_id) values(new.id,case when TG_OP='INSERT' then 'Home created' else 'Home updated' end,(select auth.uid()));
 elsif TG_TABLE_NAME='records' then
 insert into public.activity(home_id,record_id,action,actor_id) values(new.home_id,new.id,
 case when TG_OP='INSERT' then 'Record created' when new.status is distinct from old.status then 'Record status changed to '||new.status else 'Record updated' end,(select auth.uid()));
 end if;
 return new;
end $$;
revoke all on function careflow_private.audit_change() from public,anon,authenticated;
create trigger homes_audit after insert or update on public.homes for each row execute function careflow_private.audit_change();
create trigger records_audit after insert or update on public.records for each row execute function careflow_private.audit_change();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('evidence','evidence',false,10485760,array['application/pdf','image/png','image/jpeg','text/plain']);
create policy evidence_read on storage.objects for select to authenticated using (
 bucket_id='evidence' and exists(select 1 from public.homes h where h.id::text=(storage.foldername(objects.name))[1] and careflow_private.home_role(h.id) is not null)
);
create policy evidence_create on storage.objects for insert to authenticated with check (
 bucket_id='evidence' and exists(select 1 from public.homes h where h.id::text=(storage.foldername(objects.name))[1] and careflow_private.home_role(h.id) in ('owner','admin','staff'))
);
-- Files are immutable. Only uploader may remove an unreferenced upload after a failed save.
create policy evidence_cleanup on storage.objects for delete to authenticated using (
 bucket_id='evidence' and owner_id=(select auth.uid())::text
 and exists(select 1 from public.homes h where h.id::text=(storage.foldername(objects.name))[1] and careflow_private.home_role(h.id) in ('owner','admin','staff'))
 and not exists(select 1 from public.records r where r.evidence_path=objects.name)
);

-- Additional owner/team permission change history.
create function careflow_private.audit_membership() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is not null then
 insert into public.activity(home_id,action,actor_id)
 values(case when TG_OP='DELETE' then old.home_id else new.home_id end,
 case when TG_OP='DELETE' then 'Team access removed' else 'Team access assigned' end,(select auth.uid()));
 end if;
 if TG_OP='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function careflow_private.audit_membership() from public,anon,authenticated;
create trigger members_audit after insert or update or delete on public.home_members for each row execute function careflow_private.audit_membership();

-- Assignment changes are audited in public.activity, following the
-- audit_membership pattern above. Assignment rows are never deleted.
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
