# CareFlow People & Payroll foundation

This is a fictional-data-only UI prototype at `/people`. It is intentionally separate from the existing protected workspace and does not touch Supabase tables, auth policies, clinical records, or payroll providers. **Do not enter real employee data.** State resets on refresh.

## Scope
- Workforce overview, searchable employee directory, facility filters.
- Sample timesheet review with local approval toggles.
- Illustrative gross wage calculation; overtime example assumes 1.5x above 40 weekly hours, and **must not be used for actual payroll or wage-law decisions**.
- Payroll readiness view and transparent QuickBooks integration requirements.
- No credentials, OAuth tokens, real employee records, payroll execution, tax withholding, or banking data.

## Production roadmap
1. Define organizations, facilities, employees, employment assignments, roles, compensation versions, schedules, time entries, pay periods, approvals, leave requests, credentials, provider connections, sync runs, and immutable audit events.
2. Design org/facility-scoped row-level security and explicit payroll-administrator permissions. Keep compensation and identifiers in a separate restricted schema; avoid SSNs in CareFlow when possible.
3. Implement protected server-side APIs, authentication, CSRF protections, encryption for provider tokens, retention policies, logging and reconciliation.
4. Verify QuickBooks Online subscription, QuickBooks Payroll product and actual developer API access. The ChatGPT Intuit connector is **not** an OAuth grant for this website.
5. Implement sandbox-only employee identity mapping and idempotent time export if authorized APIs support it; otherwise offer reviewed CSV export to the payroll provider.
6. Validate Oregon wage/overtime rules, meal/rest requirements, pay frequency, sick leave and recordkeeping with payroll/legal specialists before use.
7. Test tenancy isolation, RBAC, timesheet amendments, concurrency, approval history, integration failures, accessibility and mobile UX.
8. Keep payroll execution, tax filings, bank account handling and direct deposit in the licensed payroll provider.

## Validation
Run `npm ci && npm run lint && npm test && npm run build` on the feature branch. Review `/people` on desktop/mobile. No build or runtime verification is claimed by this change.
