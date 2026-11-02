begin;
alter table public.quickbooks_connections
 add column employee_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(employee_snapshot)='array' and jsonb_array_length(employee_snapshot)<=5000 and octet_length(employee_snapshot::text)<=3000000),
 add column employees_synced_at timestamptz,
 add column sync_lock_id text check (sync_lock_id is null or sync_lock_id ~ '^[a-f0-9]{64}$'),
 add column sync_lock_until timestamptz,
 add constraint quickbooks_sync_lock_pair check ((sync_lock_id is null)=(sync_lock_until is null));
-- Existing RLS and server-only grants also protect all new columns.
commit;
