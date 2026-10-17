import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDocument, documentPrintHtml } from '../src/lib/document-checks.ts';
import { sampleWorkspace } from '../src/lib/workspace.ts';
import { sampleResidents, residentDocumentDraft } from '../src/lib/residents.ts';
const residents=sampleResidents(sampleWorkspace().homes,'2026-10-16');
test('document checks flag duplicates, missing authors, wrong month and pre-admission dates',()=>{
 const e=residentDocumentDraft(residents[0],'progress','2026-10');
 e.document_data={fields:{plan_reference:'Plan',review_summary:'Reviewed'},rows:[{date:'2026-09-30',note:'Note'},{date:'2026-09-30',note:'Note'}]};
 const issues=checkDocument(e,residents);
 assert.ok(issues.some(x=>x.includes('duplicate')));assert.ok(issues.some(x=>x.includes('outside')));assert.ok(issues.some(x=>x.includes('admission')));assert.ok(issues.some(x=>x.includes('author')));
 assert.equal(checkDocument({...e,home_id:'other'},residents)[0],'Confirm a resident belonging to this house.');
});
test('print exports escape document content and include all entries and attribution',()=>{
 const e=residentDocumentDraft(residents[0],'progress','2026-10');e.document_data={fields:{review_summary:'<script>alert(1)</script>'},rows:[{date:'2026-10-16',note:'First\nSecond',staff:'AA'}]};
 const html=documentPrintHtml(e,residents[0]);assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('First\nSecond'));assert.ok(html.includes('OASISWEB&amp;AI'));assert.ok(html.includes('May contain unsaved edits'));assert.ok(html.includes(residents[0].name));
});
