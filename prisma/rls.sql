-- Careflow row-level security. Idempotent: run after every `prisma migrate`.
--   psql "$ADMIN_DATABASE_URL" -v app_password="'change-me'" -f prisma/rls.sql
-- Migrations run as the owner role. The app connects as careflow_app (no BYPASSRLS, not owner),
-- and sets two transaction-local settings per request:
--   SELECT set_config('app.current_org_id',  '<uuid>', true);
--   SELECT set_config('app.current_user_id', '<uuid>', true);
-- No org set => no tenant rows visible (fails closed).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'careflow_app') THEN
    CREATE ROLE careflow_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

\if :{?app_password}
ALTER ROLE careflow_app PASSWORD :app_password;
\endif

GRANT USAGE ON SCHEMA public TO careflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO careflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO careflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO careflow_app;

-- Helpers -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_org() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app_user() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid $$;

-- SECURITY DEFINER so it can read users regardless of the caller's policies. The flag lives in
-- the database, never in a client-supplied setting, so a request cannot grant itself agency access.
CREATE OR REPLACE FUNCTION app_is_agency() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS
$$ SELECT COALESCE((SELECT is_agency AND deleted_at IS NULL FROM users WHERE id = app_user()), false) $$;
REVOKE ALL ON FUNCTION app_is_agency() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_is_agency() TO careflow_app;

-- Every table with an organization_id column ----------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema
    WHERE c.table_schema = 'public' AND c.column_name = 'organization_id' AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS agency_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (organization_id = app_org()) WITH CHECK (organization_id = app_org())', t);
    EXECUTE format(
      'CREATE POLICY agency_all ON %I USING (app_is_agency()) WITH CHECK (app_is_agency())', t);
  END LOOP;
END $$;

-- organizations: a tenant sees only itself; agency sees all ---------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON organizations;
DROP POLICY IF EXISTS agency_all ON organizations;
CREATE POLICY tenant_isolation ON organizations USING (id = app_org()) WITH CHECK (id = app_org());
CREATE POLICY agency_all ON organizations USING (app_is_agency()) WITH CHECK (app_is_agency());

-- memberships: a user can also read their own rows before an org is chosen (login / org picker)
DROP POLICY IF EXISTS own_memberships ON memberships;
CREATE POLICY own_memberships ON memberships FOR SELECT USING (user_id = app_user());

-- users: a user sees themself and members of their current org; agency sees all ---------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS self_or_org ON users;
DROP POLICY IF EXISTS agency_all ON users;
CREATE POLICY self_or_org ON users USING (
  id = app_user()
  OR id IN (SELECT user_id FROM memberships WHERE organization_id = app_org())
);
CREATE POLICY agency_all ON users USING (app_is_agency()) WITH CHECK (app_is_agency());
-- Login happens before any session user exists, so authentication lookups must use the owner
-- connection (or a dedicated auth role), not careflow_app.

-- audit_events: append-only for the app role ------------------------------------------------------
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM careflow_app;
CREATE OR REPLACE FUNCTION audit_events_immutable() RETURNS trigger LANGUAGE plpgsql AS
$$ BEGIN RAISE EXCEPTION 'audit_events is append-only'; END $$;
DROP TRIGGER IF EXISTS audit_events_no_update ON audit_events;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();

-- document_versions: exactly one parent --------------------------------------------------------------
ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_one_parent;
ALTER TABLE document_versions ADD CONSTRAINT document_versions_one_parent
  CHECK ((resident_document_id IS NOT NULL)::int + (monthly_file_id IS NOT NULL)::int = 1);
