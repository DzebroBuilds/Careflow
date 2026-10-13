# CareFlow friend review

The GitHub Pages preview includes the landing page, `/demo/`, `/demo/team/`, and a review information page at `/setup/`. All examples are fictional. Changes are stored only in the visitor's browser. Assistant roles remain scripted prototypes; agent integration is postponed.

Try the landing-page walkthrough, add and edit a sample record, filter the review queue, approve a sample record, export the review summary, and explore Your team. Reset sample edits in Settings. Feedback on clarity, mobile layout, navigation, and missing workflow steps is especially useful.

## Build and publish

Run `node scripts/build-review-demo.mjs` after `npm ci`. The builder creates an isolated static export from an explicit source allowlist. It never copies env files, authentication routes, or server handlers; Supabase configuration is removed from the generated source. `.pages-review-output` contains the generated export directory.

In repository Settings → Pages, choose GitHub Actions as the publishing source. The `Publish CareFlow review demo` workflow publishes pushes to `main` with the `/Careflow` base path. The normal app build and production configuration are unchanged.

This public preview does not support shared records, sign-in, evidence upload, email delivery, or live AI. Do not enter real employee or resident information.
