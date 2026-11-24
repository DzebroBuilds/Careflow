# CareFlow staff directory

A real, home-scoped staff directory backed by Supabase. It replaces the
fictional `/people` prototype (`docs/PEOPLE_PAYROLL_FOUNDATION.md`) for the
directory itself, and it closes item 5 of `docs/PRODUCTION_RELEASE.md`:
imported employee rows no longer sit in an unassigned source directory.

Fictional-data testing only. Not approved for real resident or employee
data. No secrets or keys are involved in this change.

## Tables

All three tables live in `supabase/migrations/20261123130000_staff_directory.sql`
and are mirrored in `supabase/schema.sql` so a fresh project gets them from
either file.

### `public.employees`

One row per person who works at a home — or who may work at one.

| Column | Meaning |
| --- | --- |
| `id` | Employee id. |
| `home_id` → `public.homes(id)`, nullable | The home this person belongs to. Null while `unmapped`. |
| `user_id` → `auth.users(id)`, nullable | The CareFlow account, once the person is mapped to one. |
| `display_name` | 1–200 characters. |
| `role_text` | Free-text job title, up to 120 characters. |
| `hire_date` | Date or null. |
| `status` | `active` / `inactive` / `unmapped`. |
| `external_source`, `external_id` | Where the row came from, e.g. `intuit_sandbox` + the Intuit employee id. Both set or both null. |
| `created_at` | Row creation time. |

Rules enforced in the database:

- `status = 'unmapped'` implies `home_id` and `user_id` are both null.
- `status` in (`active`, `inactive`) implies `home_id` is set.
- `UNIQUE (external_source, external_id) WHERE external_id IS NOT NULL` —
  an external sync can update a row but never insert a second copy of it.

There is intentionally **no compensation column**: no salary, hourly rate,
bank, tax, or SSN field. `validateEmployeeInput()` in
`src/lib/staff-directory.ts` rejects those field names before insert, and
`tests/staff-directory.test.mjs` asserts the migration contains none of
them.

### `public.employee_home_assignments`

History-preserving home assignments. One row per employee × home × period.

| Column | Meaning |
| --- | --- |
| `employee_id` → `employees(id)` | Who. |
| `home_id` → `homes(id)` | Where. |
| `role` | `admin` / `staff` / `viewer`, matching `home_members`. |
| `start_date`, `end_date` (nullable) | Assignment period. `end_date >= start_date`. |
| `assigned_by` → `auth.users(id)` | Who made the assignment. |
| `created_at` | Row creation time. |

Assignments are **never deleted**. Ending an assignment sets `end_date`;
a partial unique index allows at most one open (`end_date IS NULL`)
assignment per employee and home. Assignment inserts/updates are audited
into `public.activity` (`Assignment started` / `Assignment ended` /
`Assignment updated`) by the `audit_assignment()` trigger, following the
`audit_membership()` pattern. An owner can therefore assign one employee
to 1–5 homes, end any assignment, and still see the full history.

### `public.employee_credentials`

Orientation / training / licence records whose expiry drives reminders
(the reminders scheduler itself is a later PR in the core-workflows plan).

| Column | Meaning |
| --- | --- |
| `employee_id` → `employees(id)` | Who. |
| `credential_type` | `orientation` / `training` / `license` / `other`. |
| `issued_date`, `expiry_date` | Dates or null; `expiry_date >= issued_date` when both are set. |
| `evidence_record_id` → `records(id)`, nullable | The record holding the evidence file, if any. |
| `created_at` | Row creation time. |

Expiry buckets used by the UI and the future reminders work are
`expired`, `due-7`, `due-14`, `due-30`, `ok` — see
`credentialExpiryStatus()` in `src/lib/staff-directory.ts`.

## Row-level security

All three tables have RLS enabled. Every policy goes through
`careflow_private.home_role()`, so MFA assurance `aal2` is required,
exactly as for `records` and `home_members`. No `DELETE` grant exists on
any staff table for authenticated users.

- **Employees, mapped rows:** any member of the home (owner, admin,
  staff, viewer) can read; only owner/admin can insert or update.
- **Employees, unmapped rows:** no home to scope by, so they are visible
  only to owners (any home owner) at `aal2`, so an owner can find and map
  them. Other roles cannot see the unmapped pool.
- **Assignments:** readable by any member of the home; writable only by
  owner/admin of that home.
- **Credentials:** scoped through the employee's home the same way.
- **Removed members** have no `home_role()` for that home, so they read
  nothing from it — the same guarantee the existing membership-removal
  regression tests cover for records, extended here to staff data.

## Mapping flow (Intuit sandbox → employees)

Today the QuickBooks sync (`supabase/functions/careflow-quickbooks/employees.mjs`)
stores a JSON snapshot on `quickbooks_connections` and does not assign
homes or create staff accounts. This PR adds the mapping layer on top of
it, in `planIntuitSync()` (`src/lib/staff-directory.ts`):

1. The sync reads the sandbox company (Sandbox Company US 3e50) and
   validates each employee with the existing `employeeSummary()`.
2. For each Intuit employee, `planIntuitSync()` looks up
   `(external_source = 'intuit_sandbox', external_id = <Intuit id>)`.
3. **Not found** → plan an insert: `display_name` from Intuit,
   `status = 'unmapped'`, `home_id = null`, `user_id = null`.
4. **Found, name or Active flag changed** → plan an update. An unmapped
   row stays `unmapped` even if its Active flag changes; a mapped row
   follows the flag (`active` / `inactive`).
5. **Found, unchanged** → no write.
6. Re-running the same sync plans zero inserts. The 2 sandbox employees
   stay 2 rows. A duplicate id inside one sync run throws instead of
   inserting twice.

Mapping itself is a human step, by design: an owner opens the directory,
picks an unmapped row, and sets its home and CareFlow user (which flips
`status` to `active`). There is no automatic home assignment and no
automatic staff-account creation.

## UI — `/people`

`src/app/people/page.tsx` keeps the fictional prototype exactly as-is
unless the app is running in connected mode (`NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set and
`NEXT_PUBLIC_CAREFLOW_LIVE_ENABLED=true`). In connected mode, after a
signed-in MFA (`aal2`) session is verified, the **Employees tab** is
rendered by `src/components/staff-directory.tsx` from the Supabase rows:
same search and home filter as the prototype, plus assignment and
credential-expiry columns, and an "Unmapped" note when sandbox rows are
waiting to be mapped. The header badge changes to "Connected workspace ·
Home-scoped directory".

If the connected load fails for any reason — no session, no MFA, or the
migration not applied yet (the `employees` query errors) — the page shows
a dismissible notice and keeps the fictional prototype. The prototype is
never replaced by an error screen. The `/demo` workspace is untouched,
and the Overview / Timesheets / Payroll / Integrations tabs remain the
prototype in both modes.

## What is out of scope

- **Payroll execution, tax filings, direct deposit, bank handling** —
  stays with the licensed payroll provider (QuickBooks Payroll).
- **Oregon wage / overtime / meal-rest / sick-leave validation** — needs
  payroll/legal specialist sign-off before use. The 1.5x overtime example
  in `/people` stays labelled illustrative only, and the Timesheets and
  Payroll tabs are unchanged prototype views.
- **Reminders and escalations** — credential expiry dates are recorded
  here so the later reminders PR can consume them; no scheduler, email,
  or escalation exists in this PR.
- **Record version history and server-side exports** — separate PRs in
  the core-workflows plan.
- **Production Intuit authorization** — sandbox only. No production
  Intuit app credentials, scopes, or live company authorization are
  configured by this PR.
