# Oregon Group Home Compliance Tracker

Multi-tenant SaaS for Oregon ODDS-licensed group homes (I/DD). Owners subscribe per home. Staff track residents, credentials/training, meds, incidents, documents, risk change forms, monthly tracking, and house checklists. Dashboard shows compliance score, overdue / due-in-30-days items, and a needs-attention list.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma (RLS on every tenant table)
- Docker Compose for local Postgres
- Terraform for AWS later (not in this scaffold)

## Non-negotiables

- Every tenant table has `organization_id`; Postgres RLS enforces isolation
- Audit log for every view / edit / export of resident data
- Fake data only in development — never real resident PHI in code, seeds, or logs
- No resident details in email or SMS
- Secrets only in environment variables

## Prerequisites

- Node.js 22+
- Docker Desktop (for Postgres) — not currently on PATH on this machine; install before `docker compose up`
- npm 10+

## Quick start

```bash
cp .env.example .env.local
# also copy DATABASE_URL into .env for Prisma CLI if you prefer
docker compose up -d
npm install
npm run dev
```

App: http://localhost:3000  
Postgres: `localhost:5432` (user/db from `.env.example`)

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run db:generate` | Prisma client generate (after schema approved) |
| `npm run db:migrate` | Apply migrations (**blocked until schema approval**) |
| `npm run db:studio` | Prisma Studio |

## Schema status

Proposed schema + role matrix live in [`docs/SCHEMA.md`](docs/SCHEMA.md). **Do not migrate until that doc is approved.**

## Roles (planned)

`owner` · `manager` · `dsp` · `auditor` — see permission matrix in `docs/SCHEMA.md`.
