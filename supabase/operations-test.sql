begin;
create table public.operations_test_workspaces(
 owner_id uuid primary key references auth.users(id),
 revision integer not null check(revision>0),
 payload jsonb not null,
 updated_at timestamptz not null default now()
);
create table public.operations_test_history(
 owner_id uuid not null references auth.users(id),
 revision integer not null,
 payload jsonb not null,
 saved_at timestamptz not null default now(),
 primary key(owner_id,revision)
);
alter table public.operations_test_workspaces enable row level security;
alter table public.operations_test_history enable row level security;
revoke all on public.operations_test_workspaces,public.operations_test_history from public,anon,authenticated;
grant select,insert,update on public.operations_test_workspaces to authenticated;
grant select on public.operations_test_history to authenticated;
create policy operations_owner_read on public.operations_test_workspaces for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2');
create policy operations_owner_insert on public.operations_test_workspaces for insert to authenticated with check(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2' and exists(select 1 from public.homes where owner_id=(select auth.uid())));
create policy operations_owner_update on public.operations_test_workspaces for update to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2') with check(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2');
create policy operations_history_read on public.operations_test_history for select to authenticated using(owner_id=(select auth.uid()) and (select auth.jwt()->>'aal')='aal2');
create function careflow_private.guard_operations_test() returns trigger language plpgsql security invoker set search_path='' as $$
declare section text; item jsonb; ref text; duration integer;
begin
 if tg_op='UPDATE' and (new.owner_id<>old.owner_id or new.revision<>old.revision+1) then raise exception 'Invalid revision'; end if;
 if tg_op='INSERT' and new.revision<>1 then raise exception 'First revision must be 1';end if;
 if new.payload->>'version' is distinct from '1' or octet_length(new.payload::text)>3000000 then raise exception 'Invalid payload';end if;
 foreach section in array array['staff','shifts','time','expenses'] loop
  if jsonb_typeof(new.payload->section) is distinct from 'array' or jsonb_array_length(new.payload->section)>5000 then raise exception 'Invalid collection';end if;
  if exists(select 1 from jsonb_array_elements(new.payload->section) x where coalesce(x->>'id','')!~'^[A-Za-z0-9-]{1,80}$') or (select count(*) from jsonb_array_elements(new.payload->section))<>(select count(distinct x->>'id') from jsonb_array_elements(new.payload->section) x) then raise exception 'Invalid or duplicate ID';end if;
 end loop;
 for item in select * from jsonb_array_elements(new.payload->'staff') loop
  if length(btrim(coalesce(item->>'name',''))) not between 1 and 120 or length(btrim(coalesce(item->>'job',''))) not between 1 and 80 or coalesce(item->>'status','') not in ('Active','Onboarding','Inactive') or jsonb_typeof(item->'homeIds') is distinct from 'array' then raise exception 'Invalid staff profile';end if;
  for ref in select jsonb_array_elements_text(item->'homeIds') loop
   if not exists(select 1 from public.homes where id::text=ref and owner_id=new.owner_id) then raise exception 'Home is not owned by this account';end if;
  end loop;
  if item ? 'hourlyCents' and (jsonb_typeof(item->'hourlyCents')<>'number' or (item->>'hourlyCents')::numeric<>trunc((item->>'hourlyCents')::numeric) or (item->>'hourlyCents')::numeric not between 1 and 100000) then raise exception 'Invalid rate';end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(new.payload->'staff') x where coalesce(x->>'employeeCode','')<>'' group by x->>'employeeCode' having count(*)>1) then raise exception 'Duplicate employee code';end if;
 foreach section in array array['shifts','time','expenses'] loop
  for item in select * from jsonb_array_elements(new.payload->section) loop
   if not exists(select 1 from public.homes where id::text=item->>'homeId' and owner_id=new.owner_id) then raise exception 'Home is not owned by this account';end if;
   if section<>'expenses' and item->>'staffId' is not null and not exists(select 1 from jsonb_array_elements(new.payload->'staff') x where x->>'id'=item->>'staffId') then raise exception 'Missing employee';end if;
   if section='shifts' then
    if coalesce(item->>'date','')!~'^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date::text<>item->>'date' or coalesce(item->>'start','')!~'^([01]\d|2[0-3]):[0-5]\d$' or coalesce(item->>'end','')!~'^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'Invalid shift';end if;
    duration=extract(epoch from ((item->>'end')::time-(item->>'start')::time))::integer/60;if duration<=0 then duration=duration+1440;end if;
    if duration>960 then raise exception 'Shift exceeds 16 hours';end if;
   end if;
   if section='time' and (item->>'staffId' is null or coalesce(item->>'status','') not in ('Submitted','Approved') or coalesce(item->>'date','')!~'^\d{4}-\d{2}-\d{2}$' or (item->>'date')::date::text<>item->>'date' or jsonb_typeof(item->'minutes') is distinct from 'number' or (item->>'minutes')::numeric<>trunc((item->>'minutes')::numeric) or (item->>'minutes')::numeric not between 1 and 1440) then raise exception 'Invalid time';end if;
   if section='expenses' and (coalesce(item->>'status','') not in ('Submitted','Approved') or length(btrim(coalesce(item->>'vendor',''))) not between 1 and 120 or length(btrim(coalesce(item->>'description',''))) not between 1 and 240 or jsonb_typeof(item->'cents') is distinct from 'number' or (item->>'cents')::numeric<>trunc((item->>'cents')::numeric) or (item->>'cents')::numeric not between 1 and 10000000) then raise exception 'Invalid expense';end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements(new.payload->'time') x group by x->>'staffId',x->>'homeId',x->>'date' having count(*)>1) then raise exception 'Duplicate employee time';end if;
 new.updated_at=clock_timestamp();return new;
end $$;
revoke all on function careflow_private.guard_operations_test() from public,anon,authenticated;
create trigger guard_operations_test before insert or update on public.operations_test_workspaces for each row execute function careflow_private.guard_operations_test();
-- Only the trigger can append history. Clients have read-only access to their own revisions.
create function careflow_private.audit_operations_test() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.operations_test_history(owner_id,revision,payload,saved_at) values(new.owner_id,new.revision,new.payload,new.updated_at);return new;
end $$;
revoke all on function careflow_private.audit_operations_test() from public,anon,authenticated;
create trigger audit_operations_test after insert or update on public.operations_test_workspaces for each row execute function careflow_private.audit_operations_test();
commit;
