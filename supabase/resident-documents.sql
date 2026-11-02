-- Run after schema.sql. Additive resident/document structure; existing records remain unassigned.
begin;
create table public.residents (
 id uuid primary key default gen_random_uuid(),
 home_id uuid not null references public.homes(id),
 name text not null check(char_length(btrim(name)) between 1 and 120),
 reference_code text not null default '' check(char_length(reference_code)<=80),
 status text not null default 'Active' check(status in ('Active','Archived')),
 admission_date date not null default current_date,
 document_types text[] not null default array['mar','progress','behavior']::text[],
 applicability_notes text not null default '' check(char_length(applicability_notes)<=2000),
 updated_at timestamptz not null default now(),
 unique(home_id,id),
 check(document_types <@ array['mar','progress','behavior']::text[] and cardinality(document_types)>0),
 check(cardinality(document_types)=3 or char_length(btrim(applicability_notes))>=5)
);
create index residents_home_status_idx on public.residents(home_id,status);
alter table public.residents enable row level security;
revoke all on public.residents from public,anon,authenticated;
grant select,insert,update on public.residents to authenticated;
create policy residents_read on public.residents for select to authenticated using(careflow_private.home_role(home_id) is not null);
create policy residents_create on public.residents for insert to authenticated with check(careflow_private.home_role(home_id) in ('owner','admin'));
create policy residents_update on public.residents for update to authenticated using(careflow_private.home_role(home_id) in ('owner','admin')) with check(careflow_private.home_role(home_id) in ('owner','admin'));

alter table public.records
 add column resident_id uuid,
 add column document_type text check(document_type in ('mar','progress','behavior','incident')),
 add column document_period text check(document_period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 add column document_data jsonb not null default '{}'::jsonb check(jsonb_typeof(document_data)='object' and octet_length(document_data::text)<=100000),
 add column template_version integer not null default 1 check(template_version=1),
 add constraint records_resident_home_fk foreign key(home_id,resident_id) references public.residents(home_id,id),
 add constraint records_document_identity check(
   (resident_id is null and document_type is null and document_period is null and document_data='{}'::jsonb)
   or (resident_id is not null and document_type is not null and document_period is not null)
 ),
 add constraint records_document_category check(
   document_type is null or (document_type='mar' and category='Medication records')
   or (document_type in ('progress','behavior') and category='Residents')
   or (document_type='incident' and category='Incidents')
 );
create index records_resident_period_idx on public.records(home_id,resident_id,document_period);
create unique index records_monthly_document_unique on public.records(home_id,resident_id,document_type,document_period)
 where document_type in ('mar','progress','behavior');

create function careflow_private.resident_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and (new.id<>old.id or new.home_id<>old.home_id) then raise exception 'Resident identity and home cannot change'; end if;
 if cardinality(new.document_types)<>(select count(distinct item) from unnest(new.document_types) item) then raise exception 'Duplicate document requirements'; end if;
 new.updated_at=now();return new;
end $$;
revoke all on function careflow_private.resident_guard() from public,anon,authenticated;
create trigger residents_guard before insert or update on public.residents for each row execute function careflow_private.resident_guard();

create function careflow_private.audit_resident() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is not null then
 insert into public.activity(home_id,action,actor_id) values(new.home_id,
 case when TG_OP='INSERT' then 'Resident created' when new.status is distinct from old.status then 'Resident status changed' else 'Resident profile updated' end,(select auth.uid()));
 end if;return new;
end $$;
revoke all on function careflow_private.audit_resident() from public,anon,authenticated;
create trigger residents_audit after insert or update on public.residents for each row execute function careflow_private.audit_resident();

update storage.buckets set allowed_mime_types=array_append(allowed_mime_types,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
 where id='evidence' and not ('application/vnd.openxmlformats-officedocument.wordprocessingml.document'=any(allowed_mime_types));
commit;
