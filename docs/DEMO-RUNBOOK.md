# Demo runbook

Demo phase only: fake data, no real residents, no real vendors. Skipped on purpose until a real client:
MFA, Stripe, field encryption, S3/Textract, BAAs, the go-live checklist.

## First-time setup

```bash
cp .env.example .env            # then set ADMIN_DATABASE_URL and APP_DB_PASSWORD (see below)
docker compose up -d            # Postgres 16
npm install
npx prisma migrate dev --name init   # creates tables from prisma/schema.prisma
npm run db:rls                  # creates the careflow_app role + row-level security
npm run db:seed                 # 4 homes, 19 residents, 14 staff, tracking, discrepancies
npm test
npm run dev
```

- Migrations and the seed run as the owner (the Docker user is a superuser, which bypasses RLS).
- The running app must connect as `careflow_app`:
  `DATABASE_URL=postgresql://careflow_app:<APP_DB_PASSWORD>@localhost:5432/oregon_compliance`
- Re-run `npm run db:rls` after every migration. It is idempotent.

## Expected scores after seeding

Alder House 92 (audit ready), Birch Lane 81 (watch), Cascade Court 66 (at risk), Dogwood Place 96 (audit ready).
These are asserted in `src/lib/demo-scores.test.ts`.

## Not yet seeded

MAR dose history, incoming case-manager documents, approval queue rows, activity stream. The clickable
prototype (`docs/prototype/wardwell.html`) has all of them; port as the matching screens are built.

## Known limits

- The migration was not generated in the authoring environment (Prisma engines were unreachable), so
  `prisma/seed.ts` has not been run against a real database. Expect to fix small type errors on first run.
- Score weights (30/30/25/15) and tier cut-offs (85/70) are placeholders to calibrate against Oregon licensing.
