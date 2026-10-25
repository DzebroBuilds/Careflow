-- Intuit sandbox connection storage. Apply separately after local verification.
-- Browser roles have no access, even if the public schema is exposed by PostgREST.
begin;
create table public.quickbooks_oauth_attempts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 state_hash text not null unique check (state_hash ~ '^[a-f0-9]{64}$'),
 challenge text not null check (challenge ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null
);
create table public.quickbooks_connections (
 owner_id uuid not null references auth.users(id) on delete cascade,
 environment text not null check (environment='sandbox'),
 realm_id text not null check (realm_id ~ '^[0-9]{1,30}$'),
 company_name text not null check (length(company_name) between 1 and 200),
 refresh_cipher text not null,
 verified_at timestamptz not null,
 primary key(owner_id,environment),
 unique(environment,realm_id)
);
alter table public.quickbooks_oauth_attempts enable row level security;
alter table public.quickbooks_connections enable row level security;
revoke all on public.quickbooks_oauth_attempts,public.quickbooks_connections from public,anon,authenticated;
grant select,insert,update,delete on public.quickbooks_oauth_attempts,public.quickbooks_connections to service_role;
commit;
