-- Enable extensions used by multi-tenant RLS and audit tooling.
-- Schema tables are applied later via Prisma migrate (after schema approval).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
