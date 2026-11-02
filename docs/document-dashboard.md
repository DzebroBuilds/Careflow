# Document dashboard

The home overview answers: which documents do I manage, and which records need action?

The document index follows the reference-system discovery: plans and protocols; signed resident documents; medical documents; monthly records; staff files and training; house checks and follow-up. Catalog entries are document types, not automatically applicable compliance obligations. Existing records are grouped without rewriting them; unclassified resident work remains visible under Other tracked records.

Summary totals come from the selected home's saved records. Overdue excludes completed records and records without a due date. Missing attachments means a tracked record lacks either its evidence path or file name; this is not a missing-requirement score. Summary totals are not restricted by document search; the queue and document lists are.

Track opens the existing record editor. The document type is preserved in hidden note metadata when editable notes change. It is an organizational tag, not an authorization boundary. File storage and approval permissions keep their existing behavior. The demo saves text in browser storage and does not upload evidence files.

Monthly progress uses the existing resident, reporting-period, attachment, and human-review checks for configured MAR, progress, and behavior documents. New document types in the index do not add worksheet layouts, electronic signatures, automatic retraining, or new legal requirements.

Design: editorial-greeting direction, seed 2138737936, with the existing CareFlow system font retained to match the application and its self-hosted font policy. The home name provides the heading context; regular-weight figures sit on quiet tonal surfaces. The document-group index is the product-specific element. Existing fictional sample records drive all displayed counts; browser QA added one explicitly fictional RIT record only to the local demo.

Validation: dashboard unit tests cover home isolation, exhaustive grouping, deadline boundaries, evidence counts, worksheet classification, and document metadata retention. Browser checks cover creation, group counts, home switching, queue filtering, and 1440/768/390px layouts. The standalone design inspector could not start Chrome on this Windows host; screenshots were checked through the connected browser instead.
