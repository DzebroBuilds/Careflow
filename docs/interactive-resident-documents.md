# Interactive resident documents

Resident document forms are editable inside Residents & documents. Each record belongs to a house, resident, document type and reporting month. Save record persists the draft; reopening restores its entries. Existing original files stay separate evidence.

Export / Save as PDF opens a text-safe, printable snapshot of the current document, including unsaved worksheet changes. Choose Print / Save as PDF in that window, then the browser's Save as PDF destination. This is a flat snapshot, not an official source form, electronic signature or compliance certificate.

Check document runs local administrative checks on entered fields: missing data, dates outside the selected period, pre-admission dates and exact duplicate rows. These flags do not inspect the source file, judge medication safety or determine regulatory compliance.

## AI import

The private owner test workspace can submit a selected fictional PDF (maximum 5 MB) to the `careflow-document-reader` Edge Function. The endpoint checks the authenticated user, AAL2, tester allowlist, house owner/admin access and resident membership before calling OpenAI. The PDF is sent as an inline file to Responses with store:false; there is no separate Files upload or new permanent AI file store. This setting does not imply zero provider retention.

The model transcribes legible content into allowlisted template fields and returns source pages, short source excerpts and administrative flags. Document instructions are untrusted. Clinical judgments, invented orders and automatic approvals are prohibited. The review screen requires confirmation of identity, month and proposed contents; applying fills blank document fields and appends rows. It never changes resident profiles. Existing content is preserved. Any edits or file changes invalidate the pending proposal. The user separately saves the resulting draft, invalidating prior human review through the existing fingerprint.

Up to 40 rows are proposed per request. Extraction may omit or misread content: inspect the whole original. All fields and entries are applied together after review; edit the draft before saving or discard and enter manually. Resident profile extraction/creation, handwriting accuracy guarantees and cross-document clinical reconciliation are not implemented.

Activation requires a private OPENAI_API_KEY Supabase secret and usable API credits. Existing manager activation was blocked by billing. The public demo does not send files to AI. Default model gpt-6-astra can be changed using CAREFLOW_DOCUMENT_MODEL on the server. No key belongs in NEXT_PUBLIC variables or the repository. Live inference remains unverified until activation and a fictional-file test pass. Endpoint limiter is per isolate, not a global billing cap.
