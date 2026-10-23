# Incremental audit fixes — October 23, 2026

Based on feat/employee-payroll-foundation (PR #19), which is stacked on PR #18. The existing application and fictional-data Pages demo are preserved.

## Changes
- Patch Next.js and matching ESLint config from 16.4.0 to 16.4.3. The installation audit changed from one critical dependency finding to zero vulnerabilities.
- Include the root layout's theme stylesheet in the Pages export allowlist; the previous exporter omitted this imported file.
- Gate Pages publication on lint, unit/database tests, and production build, in addition to the static export.
- Validate saved demo snapshot rows and home references before rendering. Corrupt snapshots use the existing fresh-sample fallback; valid legacy snapshots retain edits. Browser storage is not a production security boundary.
- Clear the storage warning after a successful save.
- Put overdue follow-ups and pending approvals above the document score card.

## Verification
- npm test: 41 tests passed, including malformed demo snapshots and legacy snapshots.
- Database policy tests passed in PGlite: home isolation, resident associations, monthly uniqueness, staff approval limits, viewer restrictions, immutable audit events, private evidence and anonymous denial.
- npm run lint passed.
- npm run build passed, including TypeScript and prerendering all routes.
- node scripts/build-review-demo.mjs passed. Confirmed demo/index.html, .nojekyll and /Careflow/_next/ asset references.
- Initial sandbox build failed on a Windows EPERM folder operation; the permitted retry completed.

## Reviewed and remaining
- Navigation already groups destinations and has an accessible mobile menu toggle with expanded state; CSS switches to the menu at 800px. No navigation destinations removed. Browser, keyboard and viewport interaction checks remain; no visual verification is claimed.
- SQL enables RLS and the local policy tests exercise house boundaries and role restrictions. Hosted schema, storage settings, MFA and account lifecycle have not been verified against a running Supabase project. No database changes were applied.
- Demo saves retain the existing careflow-demo-v1 browser key and reset workflow. Storage denial/quota recovery needs browser interaction testing; automated coverage here concerns snapshot parsing.
- Public account testing still uses the existing publishable Supabase configuration. A publishable key does not establish secure hosted policy configuration.
- /people remains the sample-only foundation from PR #19 and is not added to the Pages allowlist or operational navigation.
- Full scheduling/payroll, clinical operations, portfolio prioritization and controlled AI workflows remain separate work. This PR does not establish production healthcare readiness.
- No real patient/employee data used. No merge or deployment performed. Review this stacked PR after its dependencies.
