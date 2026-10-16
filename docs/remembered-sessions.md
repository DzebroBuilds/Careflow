# Remember this browser

After successful authenticator verification, a user can opt in to **Remember this browser for 30 days**. The existing AAL2 session is retained in localStorage; passwords and authenticator secrets are not stored. Supabase continues rotating short-lived access/refresh tokens. Reopening login resumes that session through the verification gate, which validates the user and assurance level.

The deadline is fixed at verification and is not extended by refreshes or visits. Expiry clears browser credentials and signs out open workspaces, including when a sleeping tab resumes. Explicit sign-out clears the remembered session. A fresh password session or another session ID cannot inherit remembered status. New browsers and cleared browser storage require authentication again.

Unchecked browsers use sessionStorage and retain the 15-minute idle sign-out. Trusted personal browsers do not use that idle sign-out; users must sign out on a shared device. Google connections remain separate and session-only.

This is a browser retention limit, not a server-enforced maximum refresh-token lifetime. Existing AAL2 database policies remain unchanged. Supabase's server time-boxed sessions require a Supabase Pro plan or higher; if enabled later, configure a 30-day maximum there as well. Never extend JWT expiry to 30 days or treat the local preference as authorization.

The new dedicated storage key requires one fresh sign-in after deployment. Opt in on the verification screen. Test: verify and opt in, close and reopen the browser, open `/login/`, confirm automatic return to the dashboard; sign out, then confirm another sign-in requires MFA. Automated storage tests use a fake clock for expiry, rotation, account changes and failed storage writes.

Reference: https://supabase.com/docs/guides/auth/sessions
