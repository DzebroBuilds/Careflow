import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleWorkspace } from '../src/lib/workspace.ts';
import { sampleResidents, residentTemplates, residentDocumentDraft, residentPeriodMetrics, monthlyDocumentGaps, suggestedDocumentType, validateResidentDocument, monthEnd, normalizeResidentWorkspace } from '../src/lib/residents.ts';
import { recordReview, readReview } from '../src/lib/compliance.ts';
const workspace=sampleWorkspace(),today='2026-10-16',period='2026-10';
const residents=sampleResidents(workspace.homes,today);

test('recognizes the four document names without guessing a resident identity',()=>{
  assert.equal(suggestedDocumentType('MAR_Sample_MAR_2026.docx'),'mar');
  assert.equal(suggestedDocumentType('Sample IR 9-16-26.pdf'),'incident');
  assert.equal(suggestedDocumentType('Copy of Sample PN Sept.pdf'),'progress');
  assert.equal(suggestedDocumentType('Behavior Tracking 2026.pdf'),'behavior');
  assert.equal(suggestedDocumentType('other-report.pdf'),null);
  assert.equal(residentTemplates.length,4);
});
test('monthly coverage counts every applicable resident slot; incidents do not add a recurring requirement',()=>{
  const monthly=residentPeriodMetrics([],residents,workspace.homes,period,today);
  assert.equal(monthly.expected,9);assert.equal(monthly.missing,9);assert.equal(monthly.score,0);
  const incident={...residentDocumentDraft(residents[0],'incident',period),id:'incident'};
  assert.equal(residentPeriodMetrics([incident],residents,workspace.homes,period,today).created,0);
});
test('monthly pack only creates missing types for the same resident, home and month',()=>{
  const entry={...residentDocumentDraft(residents[0],'progress',period),id:'one'};
  assert.deepEqual(monthlyDocumentGaps([entry],residents[0],period),['mar','behavior']);
  assert.equal(monthlyDocumentGaps([entry],residents[1],period).length,3);
  assert.equal(monthlyDocumentGaps([entry],residents[0],'2026-11').length,3);
  const m=residentPeriodMetrics([entry],residents,[workspace.homes[0]],period,today);
  assert.equal(m.expected,6);assert.equal(m.created,1);assert.equal(m.missing,5);assert.equal(m.files,0);
});
test('wrong-home records, prior months and archived residents cannot inflate monthly coverage',()=>{
  const draft=residentDocumentDraft(residents[0],'mar',period);
  const rows=[{...draft,id:'wrong-home',home_id:workspace.homes[1].id},{...draft,id:'old',document_period:'2026-09'}];
  const m=residentPeriodMetrics(rows,residents,[workspace.homes[0]],period,today);
  assert.equal(m.created,0);
  assert.equal(residentPeriodMetrics([],residents.map(r=>({...r,status:'Archived'})),workspace.homes,period,today).expected,0);
  assert.equal(residentPeriodMetrics([],residents,workspace.homes,'2026-09',today).expected,0);
});
test('document validation checks resident ownership, category and reporting-month dates',()=>{
  const entry=residentDocumentDraft(residents[0],'behavior',period);
  assert.doesNotThrow(()=>validateResidentDocument(entry,residents));
  assert.throws(()=>validateResidentDocument({...entry,resident_id:residents[2].id},residents));
  assert.throws(()=>validateResidentDocument({...entry,category:'Incidents'},residents));
  assert.throws(()=>validateResidentDocument({...entry,document_data:{fields:{},rows:[{date:'2026-09-30'}]}},residents));
  assert.equal(monthEnd('2028-02'),'2028-02-29');assert.equal(monthEnd('2026-02'),'2026-02-28');
  assert.throws(()=>monthEnd('2026-13'));
});
test('editing a worksheet or resident association invalidates the saved human review',()=>{
  let entry={...residentDocumentDraft(residents[0],'progress',period),id:'one',status:'Complete',evidence_path:'sample/file',evidence_name:'progress.pdf',document_data:{fields:{plan_reference:'Sample plan'},rows:[{date:'2026-10-15',note:'Fictional observation',staff:'S'}]}};
  entry.notes=recordReview(entry,[true,true,true,true]);
  assert.ok(readReview(entry).every(Boolean));
  assert.ok(readReview({...entry,resident_id:residents[1].id}).every(value=>!value));
  assert.ok(readReview({...entry,document_data:{...entry.document_data,rows:[{date:'2026-10-15',note:'Changed observation',staff:'S'}]}}).every(value=>!value));
  assert.ok(readReview({...entry,document_data:{rows:entry.document_data.rows,fields:entry.document_data.fields}}).every(Boolean));
});
test('legacy sample edits survive resident directory initialization',()=>{
  const legacy={...workspace,entries:[{...workspace.entries[0],title:'Preserved custom title'}]};
  const migrated=normalizeResidentWorkspace(legacy,today);
  assert.equal(migrated.entries[0].title,'Preserved custom title');assert.equal(migrated.residents.length,3);
  assert.equal(normalizeResidentWorkspace({...legacy,residents:[]},today).residents.length,0);
});
