# Resident document structure

CareFlow now organizes care paperwork as **House → Resident → Document type → Reporting month / event → File and human review**. It uses the structure of the four user-supplied dummy examples, without publishing their filled contents, source files, staff names or resident names. Provider-derived structures are not presented as official state-approved forms.

## Document types

- Medication administration record (MAR): monthly resident reference, source order and signature-register reference, medication instructions, scheduled time, dated recorded marks and staff initials.
- Progress notes: monthly service-plan reference and dated narrative notes with author attribution.
- Behavior tracking: monthly individualized plan and recording key, with dated support / behavior marks, shift and staff initials.
- Incident report: an event-based record with date/time, type, location, witnesses, details, actions, follow-up, notifications and review acknowledgement. Multiple events are allowed in a month. Absence of an incident report is not a missing recurring document.

These are document organization and review worksheets, not a live eMAR, medication decision tool, approved clinical system or electronic-signature system. Original PDF / DOCX attachments remain the source evidence. File-name recognition makes a type suggestion only; the user confirms the resident, document type and month. Existing generic tasks are never assigned by inferred names.

## Resident profiles and monthly packs

Owners and administrators create/edit residents within a house, enter a reference and admission date, and select applicable monthly document types. Exclusions require an applicability note. Archived residents and their history are retained. A resident cannot be moved to another house by editing their identifier or home ID.

Starting a monthly pack creates only missing MAR, progress and behavior records marked applicable to the resident. A unique database index prevents duplicate resident/type/month records, including concurrent requests. Incidents are created separately. Profiles and document records are separate entities; creating a resident never implies that their required paperwork is complete.

## Metrics

The house and CareFlow file metrics show all accessible houses and their saved records. The resident monthly metric counts every applicable **active resident × monthly document type** slot in the selected month, including absent documents. Residents admitted after the selected month are excluded. Missing slots score zero. Each present slot uses the existing record grade: approval 20, evidence file 20, assigned owner 10, current review/due date 10, and four recorded human checks 40. Files and reviewed evidence are reported separately. Incidents do not add recurring monthly slots.

This monthly score is displayed separately from the broader 20-type starter house checklist, to keep the two denominators visible. No fictional trends, OCR results, extracted expiry dates, medication validation or signature verification are claimed. Structured worksheet changes, resident reassignment, type or period changes, and file replacement invalidate previously recorded review credit. The edit-detection checksum is not a cryptographic signature or authorization mechanism.

## Persistence and access

Fresh databases apply `supabase/schema.sql`, then `supabase/resident-documents.sql`. Existing projects apply the additive resident extension once. It adds the resident directory, optional resident/document metadata to legacy records, a same-house composite foreign key, role-scoped RLS policies, an audit trigger and a monthly uniqueness index. Existing records and original attachments remain intact. DOCX joins the existing private evidence bucket MIME allowlist; the 10 MB limit remains.

Public demos retain fictional text in browser storage and do not upload files. Connected private test accounts persist resident profiles and document worksheets in Supabase; existing AAL2 and house membership requirements remain. The project remains authorized for fictional-data testing only.

## Next product layers

Versioned attachments, authorized signatures, staff assignment directories, approved applicability rules by program, resident transfers, clinical integrations and controlled production healthcare handling need separate implementation and verification. No automatic clinical actions or outgoing communications are enabled by this change.
