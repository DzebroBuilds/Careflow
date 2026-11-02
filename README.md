# CareFlow

CareFlow is a working first version of an Oregon RTH paperwork-readiness workspace. The sample workspace runs without external accounts. Connected mode uses Supabase authentication, MFA, private evidence storage, and database-enforced permissions.

## Run locally

Install Node.js 24 LTS, then open PowerShell in this folder:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000/demo. If that port is already in use, run `npm run dev -- --port 3001` and use http://localhost:3001/demo.

## Included

- CareFlow landing page and responsive dashboard.
- Separate homes, record creation/editing, assignments, due dates, priority, search, filters, and review status.
- Resident-record, staff-orientation, medication-documentation, incident, binder, correction, and monthly-review work queues.
- Readiness counts derived from completed tasks; this is not a regulatory score.
- Downloadable CSV review packets with spreadsheet-formula protection.
- Sample persistence in browser storage, plus a reset action.
- Connected sign-in, password reset, authenticator enrollment and verification.
- Owner, administrator, staff, and viewer database permissions. Only owner/admin can complete records; staff cannot modify completed records. Only the owner manages additional home access.
- Connected PDF/PNG/JPEG/TXT evidence uploads, 10 MB maximum, and authenticated downloads from a private bucket.
- Database-generated record, home, and team-access change history.

## Connect a new Supabase project

1. Establish the appropriate organization, plan, HIPAA add-on and BAA, and High Compliance configuration before PHI use. Enable the required platform controls (MFA, PITR, SSL, network restrictions, connection logging).
2. In a **new, empty** project, run `supabase/schema.sql` in the SQL editor. This is a reviewed bootstrap script, not an applied migration; no hosted database has been changed yet. For continued development, initialize the Supabase CLI and capture the schema into migrations through its documented workflow.
3. Disable public signups and anonymous sign-ins. Configure custom SMTP, approved site/redirect URLs, password policy (at least 12 characters), and session lifetimes. Add `/reset-password` to approved redirect URLs.
4. Provision the first owner account in Supabase Auth. Provision staff accounts through your authorized account administration process. CareFlow does not send invitations itself.
5. Copy `.env.example` to `.env.local`. Set the project URL and publishable key. **Never use a secret or service-role key in a NEXT_PUBLIC variable.**
6. After deployment/access testing, set `NEXT_PUBLIC_CAREFLOW_LIVE_ENABLED=true` and rebuild. This flag controls the app experience; database RLS and MFA remain the authorization boundary.
7. Sign in, set up the authenticator, and create the first home. Assign provisioned staff user IDs and roles from Settings → Team access.

## Deployment

Deploy this Next.js project to an appropriate host under the necessary agreement. Use Node.js 24, `npm ci`, and `npm run build`. Start a self-hosted deployment with `npm start`; Vercel detects Next.js automatically. Configure the four environment variables before building. Point your domain to the host and update the approved Supabase URLs.

The web host must be approved for your healthcare workload. Keep staging and real resident data separate. The user-created Careflow Supabase project now has the tested schema applied as migration `20261012224514_careflow_initial_workspace`. Its organization is currently on the Free plan. The local connection is enabled for fictional-data testing only, with `NEXT_PUBLIC_CAREFLOW_DATA_MODE=sample`. No paid subscription or hosting deployment has been created.

## Validation

```powershell
npm test
npm run lint
npm run build
```

Tests execute the actual schema in a local PostgreSQL-compatible test runtime with simulated Supabase auth/storage schemas. They verify home isolation, staff approval limits, viewer permissions, MFA denial, private evidence access, audit immutability, and CSV behavior. They do not replace testing on the hosted Supabase project.

## Remaining before a healthcare launch

- Complete hosting, paid healthcare configuration and BAAs, owner account provisioning, and real auth/SMTP/MFA/file integration tests. The initial database schema is already applied.
- Review the RTH operating checklist against the current rules and your service obligations with a qualified reviewer. Work queues are not a complete validated Oregon rule pack.
- Define incident response, retention, access reviews, consent and minimum-necessary use, backup/restore drills, and support/recovery procedures.
- Verify authentication and record/file **read/access** logging at the platform layer. The built-in activity view records changes only and displays the latest 200 accessible events, not a complete access audit.
- Add full version history/retention, reminder delivery/escalations, structured clinical record fields, billing, and inspection exports with attachments as the service requires. The current CSV lists evidence filenames; it does not package file contents.
- The current CSP permits inline scripts required by this Next.js setup and evaluation for development; replace it with a tested nonce-based production policy before PHI launch.
- Resolve the development-tool dependency advisory when a compatible patch becomes available. The production-only dependency audit is clean as of this build.

A working first version is not a certification of HIPAA compliance or clinical readiness.

## Earlier scaffold

The original Prisma schema, Docker setup, and docs/SCHEMA.md are retained as an earlier, unapplied proposal. The current RTH workspace uses Supabase Auth and home-based RLS, not that Prisma proposal. The old Vitest scaffold/config and PostCSS config are replaced by the current tested app toolchain. Do not run the older Prisma schema against this Supabase project.

### Assistant team prototype

Open `/demo/team` or choose **Your team** in the sample workspace. HR, Manager, Nurse, Documentation, and Quality Review each have two scripted findings, source references, editable follow-up drafts, human approval/dismissal, and session activity. Dismissal requires a reviewer note. This prototype is session-only and resets when the view is left or the home changes. It does not call an AI provider, send email, process real notes, or modify workspace records. The Nurse scenario flags documentation gaps for a licensed clinician; it never infers or changes medication doses. Connected/cloud workspaces link to the separate sample prototype.
