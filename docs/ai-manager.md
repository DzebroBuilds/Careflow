# CareFlow AI manager — owner testing

Dawit is the lead conversational manager. He can use OpenAI's native agent delegation tools to ask Selam (HR), Hana (clinical documentation), Meron (documentation), and Tesfaye (quality review) to analyze fictional scenarios, then combine their results. Specialist activity is shown only when actual delegation events arrive. Simple questions can be answered by the manager without delegation.

## Confirmed setup and limits

- Frontend: AI manager navigation, bounded recent conversation, live status, observed specialist assignments, stop/reset controls, and explicit fictional-data acknowledgement. Public demo connections are disabled.
- Backend: Supabase Edge Function `careflow-manager`, JWT verification enabled, verified Auth user, MFA assurance `aal2`, home ownership/admin authorization, and initial owner-test allowlist. Initial allowed user: `54f6a141-c041-4820-90b8-2780d3deeaea`. Override with server secret `CAREFLOW_AI_ALLOWED_USER_IDS` only after approving other testers.
- The model is `gpt-6-astra`, following the official Agents API quickstart. The business workflow has no sandbox, shell, browser, email, file-reading, Google, or database-write tools. It receives only the manually supplied fictional prompt and up to eight recent messages. Existing care records and attachments are not automatically sent.
- Maximum four concurrent specialist analyses and four observed creation calls per turn, 110-second run timeout, bounded input and response, best-effort cancellation/session deletion. The 30-second cooldown and concurrency guard are per Edge isolate, not a durable organization-wide spend limit. Configure provider budgets before broader rollout.
- Chat is page-memory only. OpenAI runs server-side sessions; cleanup is requested after every turn. Do not promise zero provider retention. This setup is not approved for real resident, employee, or clinical data.
- AI produces proposals. No human approvals, real task assignments, clinical decisions, emails, or calendar changes are executed.

## Activation still required

1. Resolve the API billing/usage limit at https://platform.openai.com/settings/organization/billing and review https://platform.openai.com/settings/organization/limits. The live test returned an organization billing/usage-limit error. The billing dashboard showed no remaining API credits. ChatGPT subscription billing is separate. `gpt-6-luna` is a starter option for simpler future experiments, but this build does not silently switch models.
2. Reuse the existing local `OPENAI_API_KEY` only after authorizing its storage in the CareFlow Supabase project's private Edge Function secrets. Never put it in browser code, GitHub, or chat. No key has been uploaded by this change. Enter credentials privately in the dashboard or through an explicitly approved secure secret-setting workflow.
3. Sign in with the owner test account, complete MFA, select a fictional home, and open AI manager. Confirm fictional data, then try the suggested two-specialist scenario.
4. Verify actual delegation activity and a completed combined answer. Test a follow-up question, a cancelled request, unauthorized access, and a clinical question that must be routed to a licensed clinician.

## Verification

Twenty workflow tests passed, including manager input bounds, rejection of privileged history roles, role boundaries, and bounded cleanup retries. Frontend TypeScript and targeted lint passed. The deployed endpoint rejected an unauthenticated request with HTTP 401. The existing API key successfully created an access-check agent session, which was subsequently deleted. A real inference/delegation test failed because of the provider billing/usage limit; live specialist behavior is therefore unverified. Do not label the manager fully working until that test passes.

Sources: https://developers.openai.com/api/docs/guides/agents-api/multi-agent and https://developers.openai.com/api/docs/guides/agents-api/quickstart.

Developed by OASISWEB&AI.
