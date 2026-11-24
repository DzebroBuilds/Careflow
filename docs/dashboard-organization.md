# Dashboard organization: seven navigation groups

The workspace sidebar is driven by one table, `navigation` in
`src/lib/dashboard.ts`: groups in order, each with `[section, label, icon]`
tuples. The sidebar in `src/components/workspace.tsx` renders those groups
generically (plus a primary quick-nav strip), and `?view=` slugs are derived
from section names in `src/lib/workspace-navigation.ts`.

## The seven groups (29 sections)

| Group | Sections |
| --- | --- |
| Today | Readiness center, Weekly review, Calendar, Approvals |
| Care | Residents, Medication records, Incidents |
| Documents | Document reader, Inspection binder, Support Documents, Templates |
| Compliance | Corrective actions, House checklist, Monthly reviews, Reports, Compliance tracker |
| People & staffing | Staff orientation, Staff directory, Shift coverage, Time approvals, Expenses, Payroll preparation |
| Administration | Homes, Settings, Activity history, Connected tools, QuickBooks, Help |
| AI workspace | Your team |

## Why each item sits where it does

- **Today** is the owner's daily start: the readiness center, the weekly
  review, the calendar of due work, and approvals waiting on a decision.
  Nothing else lives here, so the first screen stays scannable.
- **Care** is resident work: resident records, medication documentation
  (a documentation task list, not an eMAR), and incident follow-up.
- **Documents** gathers everything that is a file or a form: the document
  reader, the inspection binder, support documents, and templates. The
  document reader used to sit in Care; it is a document tool, not resident
  care, so it moved here.
- **Compliance** is the corrective loop: corrective actions, the house
  checklist, monthly reviews, reports, and the compliance tracker. The
  tracker used to sit in Overview; it belongs with the work it measures.
  Compliance was the most overloaded group (7 items); it is now 5.
- **People & staffing** ends the orphan problem: staff orientation plus
  the five operation sections (staff directory, shift coverage, time
  approvals, expenses, payroll preparation) that used to live in a
  separate owner-only "Operations" group appended by `workspace.tsx`.
  They are now in the sidebar for everyone, next to orientation, because
  staffing is one workflow. No group has more than 6 items; this one has
  exactly 6.
- **Administration** is home and account plumbing: homes, settings,
  activity history, connected tools, QuickBooks, and help. QuickBooks and
  connected tools are integrations, so they sit last in the group, after
  the home's own settings and audit log.
- **AI workspace** stays a single-item group on purpose: the AI manager
  ("Your team") is a different kind of tool from the record queues, and
  keeping it separate keeps the boundary visible.

## What did not change

- **Section names are a stable API.** Every section name keeps its exact
  spelling and case. Slugs (`?view=staff-directory`,
  `?view=payroll-preparation`, …) are derived from names, and the PR #46
  landing-card deep-links depend on them. Rename a section and every
  saved link, bookmark, and landing card breaks. If a rename is ever
  needed, add a slug alias in `workspace-navigation.ts` first and keep the
  old slug working.
- **Labels and icons are unchanged** for the 24 sections that were already
  in the sidebar. The five operation sections take the labels and icons
  they had in the old Operations group, except Expenses, which now uses
  the `chart` icon (the Operations group used `folder`).
- **`sectionLabel()`, `viewEntries()`, and `recordTemplates` are
  untouched.** `sectionLabel()` still prefers the `workspaceLabels`
  overrides in `dashboard.ts` — so the page heading for Staff directory
  still reads "People", for Shift coverage "Schedule", and for Time
  approvals "Time & approvals". That is a known follow-up, not an
  oversight: changing those headings is a separate decision.
- **The five operation sections stay in `operation-sections.ts`.**
  `workspace-navigation.ts` builds its section list from navigation plus
  `operationSections` through a `Set`, so the sections list still has
  exactly 29 entries with no duplicates. `workspace.tsx` still uses
  `operationSections` to decide which sections render the operations
  panel.
- **The primary quick-nav strip is untouched.** It keeps its own short
  labels ("Today", "People", "Schedule", "Time", "Payroll") and its own
  Expenses `folder` icon; it renders from its own list, not from
  `navigation`.

## What was removed

- The owner-only "Operations" group that `workspace.tsx` appended to the
  sidebar. It duplicated the five sections that now live in People &
  staffing, so the sidebar showed them twice for owners and demo users.
  `menuGroups` is now just `navigation`. This changes nothing about who
  can *do* staffing work — the five sections were already in the primary
  quick-nav strip shown to everyone — it only removes the duplicate
  listing.

## Tests

`tests/dashboard-navigation.test.mjs` (Node-only, mock data only) asserts
the contract: exactly the seven groups in order, all 29 sections exactly
once with their label and icon, 1–6 items per group, every section
resolving from its `?view=` slug, every operation section in navigation
with a duplicate-free combined list, the old Overview/Operations/People
groups gone, and `sectionLabel()` behaviour unchanged.
