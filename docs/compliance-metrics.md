# House and CareFlow metrics

The dashboard shows the selected house and the overall CareFlow readiness score. The Compliance tracker includes house comparisons, scoped metric cards and an evidence/file register. All values derive from the current saved workspace records; saving a record, replacing its attachment, recording a review or changing a due date recomputes them. An unsaved edit does not count. No artificial history or improvement trend is shown.

Each house has 20 equally weighted starter document types. Every linked record is graded using the existing approval, file, assignment, date and human review criteria. Records of one type are averaged; types are averaged into a house score. The CareFlow overall score averages **unrounded house scores**, then rounds once. Empty accessible houses remain in the denominator. Homes the user cannot access are excluded.

Requirement coverage counts types with at least one correctly categorized, linked record. File coverage counts types with at least one attachment (path and filename). Reviewed coverage requires every linked record in that type to have an attachment and a completed human review with approval. Missing types remain gaps. A type is a starter bucket, not proof of coverage of every resident, staff member or reporting period.

The register includes all records, including unlinked records. Unlinked records do not earn checklist points. File counts use distinct attachment paths (multiple records can reference the same file). Missing-file counts are record counts, not file counts. Overdue follow-ups exclude completed tasks; an old review date still loses current-date scoring credit even when a record is complete. Dates are entered task/review dates, not extracted PDF expiry dates.

Search and filters expose missing files, unlinked records, pending human reviews and overdue follow-ups. House selection scopes the register; CareFlow overall restores all accessible houses. Record actions use the existing editing and storage flows, with existing role checks and database policies. Viewers can inspect records; the record editor retains its permission restrictions.

PDF content, signatures, medication accuracy, completeness across persons, and legal compliance are not automatically assessed. Google Drive attachments and external calendar events are not automatically included. The existing checklist score report exports house and requirement scores; this is workflow readiness, not certification.
