# CareFlow production release tracker

Updated: October 25, 2026. Target scope: full multi-home platform with staffing, expenses and payroll integration. Owner preference: lowest-cost development now, with migration later. Brand/domain recommendation: OasisWeb AI, oasiswebai.com and careflow.oasiswebai.com; availability and purchase are not confirmed.

## Current verified baseline

- The public GitHub Pages site is a fictional-data preview with private test accounts backed by the Careflow Supabase project.
- The dashboard, resident/document records, evidence workflow, review queue, MFA, home-scoped permissions, and change history have been implemented. Implemented does not mean every workflow has completed pilot acceptance.
- Intuit is connected to Sandbox Company US 3e50. The manual employee directory sync imported two sandbox employees and repeated without duplicates. It does not assign homes, create staff accounts, synchronize compensation, submit time, run payroll, or write accounting transactions.
- The previous published release passed 57 automated tests plus database checks and full GitHub build/export checks. This production-hardening pass adds five production-configuration tests; all 62 tests and expanded database revocation checks pass locally.
- The latest hosted security advisor reports an existing warning for disabled leaked-password protection. The two no-policy informational notices belong to deliberately server-only Intuit tables.

## Work prepared in this production pass

- Owner-controlled home membership removal with an explicit confirmation and database enforcement.
- Regression coverage that removed members cannot read home records, resident profiles, or evidence and that membership removal is audited.
- Production environment validation integrated into Next.js configuration. It rejects missing production settings, the current sandbox database, GitHub Pages as the production application origin, mismatched backend origins, public secrets, and activation of the sandbox-only financial UI.
- Production configuration report: npm run check:production. This reports missing setting names, never secret values.
- Production script policy no longer permits unsafe-eval outside development. A complete nonce-based CSP and browser verification remain outstanding; this change is not a claim that CSP hardening is complete.

## Required before a real pilot

1. Owner confirms the company/domain choice and approves a priced hosting plan before paid deployment. Full product scope is confirmed; paid production is deferred while development continues on the existing free sandbox.
2. Prepare a separate production deployment and database; keep current sandbox and demo available separately.
3. Complete applicable vendor agreements and healthcare platform configuration before real resident information. The owner must review and accept any legal agreements and paid charges.
4. Verify production signup policy, password protection, custom email delivery, account recovery, MFA recovery, session behavior, owner provisioning, and staff onboarding/offboarding.
5. Add a usable staff directory with home assignments and explicit account mapping; imported employee rows currently remain an unassigned source directory.
6. Finish and acceptance-test daily documentation, incident follow-up, reminders, deadlines, version history, and document exports required by the selected launch scope.
7. If selected for launch, implement scheduling and coverage, time entry/approval, expenses and vendor mapping, financial reconciliation, and the supported production Intuit authorization flow. Payroll execution stays with the payroll provider; API availability and product permissions need verification.
8. Complete dependency review, security-header browser tests, upload/download controls, multi-role and cross-home hosted tests, access logging, backup restoration, monitoring, incident response and retention procedures.
9. Conduct a fictional-data owner/staff acceptance test, record defects, and obtain release acceptance against the agreed scope.
10. Run production configuration checks, full build and automated tests, deploy, and conduct production smoke tests before enabling real records.

## External release gates

- Production domain and hosting choice are not supplied yet.
- No spending amount or subscription is approved by a numeric budget. No paid service has been purchased in this pass.
- Applicable vendor agreement acceptance and healthcare configuration have not been verified. The app must not be labeled ready for PHI based only on passing tests.
- No production Intuit app credentials, scopes, or live company authorization have been configured.

## Evidence sources

- Supabase healthcare project requirements: https://supabase.com/docs/guides/platform/hipaa-projects
- Supabase shared responsibility: https://supabase.com/docs/guides/deployment/shared-responsibility-model
- GitHub Pages sensitive-transaction guidance: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https

The production configuration validator checks software settings only. It cannot verify contracts, organizational practices, clinical suitability, or regulatory compliance.
