# CareFlow AI manager — Muse (Meta Model API)

Dawit is the lead conversational manager, powered by Muse. He can delegate to Selam (HR), Hana (clinical documentation), Meron (documentation), and Tesfaye (quality review) to analyze fictional scenarios, then combine their results. Specialist activity is shown only when actual delegation happens. Simple questions can be answered by the manager without delegation.

This replaces the earlier OpenAI manager (`gpt-6-astra`, OpenAI Agents API). That manager is removed because its live test failed with an organization billing / usage-limit error, the billing dashboard showed no remaining API credits, and live delegation was never verified. Muse is now the brain of CareFlow.

## Confirmed setup and limits

- Frontend: AI manager navigation, bounded recent conversation, live status, observed specialist assignments, stop/reset controls, and explicit fictional-data acknowledgement. Public demo connections are disabled.
- Backend: Supabase Edge Function `careflow-manager`, JWT verification enabled, verified Auth user, MFA assurance `aal2`, home ownership/admin authorization, and initial owner-test allowlist. Initial allowed user: `54f6a141-c041-4820-90b8-2780d3deeaea`. Override with server secret `CAREFLOW_AI_ALLOWED_USER_IDS` only after approving other testers.
- The models are Muse Spark (`muse-spark-1.3`) for Dawit, Muse Ember (`muse-ember-1.0`) for specialists, and Muse Wonder (`muse-wonder-1.0`) only for complex reviews (three or more specialists, or prompts over 2,000 characters), via the Meta Model API Responses API at `https://api.meta.ai/v1`. The API is OpenAI-SDK compatible; the Edge Function creates its client with `baseURL: 'https://api.meta.ai/v1'` and `MODEL_API_KEY`. There is no OpenAI-style `beta.agents.sessions` / `multi_agent` surface on Model API, so delegation is orchestrated in `manager.mjs`: Dawit plans, Ember specialists run in parallel (max 4), then Dawit combines their actual results.
- The business workflow has no sandbox, shell, browser, email, file-reading, Google, or database-write tools. It receives only the manually supplied fictional prompt and up to eight recent messages. Existing care records and attachments are not automatically sent.
- Maximum four specialist analyses per turn, 110-second run timeout, bounded input and response, 30-second per-user cooldown. Token spend is now enforced durably: every run logs token counts to `public.ai_usage` (see `supabase/migrations/20261123120000_muse_ai_usage.sql`), and the Edge Function checks the per-user daily limit (default 200,000 tokens) and monthly limit (default 2,000,000 tokens) before running. Configure the limits with `CAREFLOW_AI_DAILY_TOKEN_LIMIT` / `CAREFLOW_AI_MONTHLY_TOKEN_LIMIT` and set a provider budget in the Meta Model API dashboard before broader rollout. Only token counts are logged — never prompts, history, or replies.
- Chat is page-memory only. Muse runs server-side via the Responses API; do not promise zero provider retention. This setup is not approved for real resident, employee, or clinical data.
- AI produces proposals. No human approvals, real task assignments, clinical decisions, emails, or calendar changes are executed. Clinical questions (dosing, diagnosis, treatment, medication changes) are not delegated to the nurse for treatment advice; they are routed to a licensed clinician and only documentation gaps are flagged.

## Activation still required

Live inference is **not yet verified**. Do not label the manager fully working until the live test below passes.

1. Get a Model API key at the [Meta Model API dashboard](https://dev.meta.ai/docs/overview) and set a budget / usage limits there first.
2. Store the key as the Supabase Edge Function secret `MODEL_API_KEY` in the CareFlow Supabase project. Never put it in browser code, GitHub, or chat. No key is included in this change. Enter credentials privately in the dashboard or through an explicitly approved secure secret-setting workflow. The old `OPENAI_API_KEY` is no longer used by this function.
3. Apply `supabase/migrations/20261123120000_muse_ai_usage.sql` to the CareFlow Supabase project (and to new projects via `supabase/schema.sql`, which now includes the same table). Until the migration is applied, the durable budget check is best-effort and the in-memory 30-second guard still applies.
4. Sign in with the owner test account, complete MFA, select a fictional home, and open AI manager. Confirm fictional data, then try the suggested two-specialist scenario.
5. Verify actual delegation activity and a completed combined answer. Test a follow-up question, a cancelled request, unauthorized access, and a clinical question that must be routed to a licensed clinician.

## Verification

Workflow tests in `tests/manager.test.mjs` cover manager input bounds, rejection of privileged history roles, team boundaries, Muse model / base-URL configuration, specialist keyword routing, clinical-question detection, durable budget checks, usage parsing, legacy and Muse session cleanup, and a mocked end-to-end `runManager` flow (Ember specialists in parallel, Spark combine, clinical routing without nurse delegation). All tests use mock clients. No test calls the real Meta or OpenAI API, and no test contains an API key.

The deployed endpoint rejects an unauthenticated request with HTTP 401. A real inference / delegation test has not yet passed with Muse, because `MODEL_API_KEY` has not been set as a Supabase secret. Do not label the manager fully working until that test passes after the key is set.

Sources: https://dev.meta.ai/docs/overview and https://dev.meta.ai/docs/quickstart.

Developed by OASISWEB&AI.
