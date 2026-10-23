import test from 'node:test';
import './manager.test.mjs';
import './metrics.test.mjs';
import './residents.test.mjs';
import './auth-storage.test.mjs';
import assert from 'node:assert/strict';
import { gmailMessage, eventTimes, sheetRows, sheetBounds, documentText } from '../src/lib/google-workspace.ts';
test('Gmail messages preserve Unicode and reject header injection',()=>{const raw=gmailMessage('sample@example.com','Selam · review','Hello\nሰላም');const mime=new TextDecoder().decode(Uint8Array.from(atob(raw.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)));assert.ok(mime.startsWith('To: sample@example.com\r\n'));assert.ok(mime.includes('Content-Transfer-Encoding: base64'));const body=mime.split('\r\n\r\n')[1].replaceAll('\r\n','');assert.equal(new TextDecoder().decode(Uint8Array.from(atob(body),c=>c.charCodeAt(0))),'Hello\nሰላም');assert.throws(()=>gmailMessage('sample@example.com\r\nBcc:other@example.com','Review','Hello'));assert.throws(()=>gmailMessage('sample@example.com','Review\r\nBcc:other@example.com','Hello'));});
test('Google calendar times validate ranges and retain explicit offsets',()=>{assert.deepEqual(eventTimes('2026-10-16T09:00:00-07:00','2026-10-16T10:00:00-07:00'),{start:{dateTime:'2026-10-16T16:00:00.000Z'},end:{dateTime:'2026-10-16T17:00:00.000Z'}});assert.throws(()=>eventTimes('invalid','2026-10-16'));assert.throws(()=>eventTimes('2026-10-16T10:00:00Z','2026-10-16T09:00:00Z'));});
test('Google sheet edits preserve literal text and enforce bounded ranges',()=>{assert.deepEqual(sheetRows('Name\tStatus\r\n=1+1\tOpen\r\n'),[['Name','Status'],['=1+1','Open']]);assert.deepEqual(sheetBounds("'Staff Training'!AA2:AC8"),{rows:7,columns:3});assert.deepEqual(sheetBounds('A1'),{rows:1,columns:1});assert.throws(()=>sheetBounds('A:A'));assert.throws(()=>sheetBounds('A1:Z100'));assert.throws(()=>sheetBounds('D10:A1'));assert.throws(()=>sheetRows(Array(51).fill('a').join('\n')));});
test('Google document previews include nested tabs and table text without interpreting markup',()=>{assert.equal(documentText({documentId:'sample',title:'Sample',tabs:[{documentTab:{body:{content:[{paragraph:{elements:[{textRun:{content:'<script>plain text</script>\n'}}]}}]}},childTabs:[{documentTab:{body:{content:[{table:{tableRows:[{tableCells:[{content:[{paragraph:{elements:[{textRun:{content:'Cell'}}]}}]}]}]}}]}}}]}]}),'<script>plain text</script>\nCell');});
import { sampleWorkspace, readiness, isOverdue, csvCell, reviewCsv } from '../src/lib/workspace.ts';
test('readiness excludes other homes and handles an empty home',()=>{const data=sampleWorkspace();const entries=data.entries.filter(e=>e.home_id===data.homes[0].id);assert.equal(readiness(entries),25);assert.equal(readiness([]),null);});
test('due dates do not mark completed records overdue',()=>{const entry=sampleWorkspace().entries[0];assert.equal(isOverdue({...entry,due_date:'2026-01-01',status:'Complete'},'2026-10-12'),false);assert.equal(isOverdue({...entry,due_date:'2026-10-11',status:'Open'},'2026-10-12'),true);assert.equal(isOverdue({...entry,due_date:'2026-10-12',status:'Open'},'2026-10-12'),false);});
test('review CSV escapes quotes, newlines and spreadsheet formulas',()=>{assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('  @SUM(A1)'),'"\'  @SUM(A1)"');assert.equal(csvCell('a"b\nc'),'"a""b\nc"');const data=sampleWorkspace();assert.ok(reviewCsv(data.homes[0],data.entries).includes('CareFlow review packet'));});
import { viewEntries, recordTemplates } from '../src/lib/dashboard.ts';
test('dashboard queues isolate homes and review status',()=>{const d=sampleWorkspace();const h=d.homes[0].id;const approvals=viewEntries(d.entries,h,'Approvals');assert.equal(approvals.length,2);assert.ok(approvals.every(e=>e.home_id===h&&e.status==='In review'));assert.equal(viewEntries(d.entries,d.homes[1].id,'Approvals').length,0);const agenda=viewEntries(d.entries,h,'Calendar');assert.ok(agenda.every(e=>e.status!=='Complete'));assert.deepEqual(agenda.map(e=>e.due_date),agenda.map(e=>e.due_date).sort());});
test('house checks do not include unrelated binder records or other homes',()=>{const d=sampleWorkspace();const entry={...d.entries[4],title:recordTemplates[0].title,status:'Open'};assert.equal(viewEntries([...d.entries,entry],d.homes[0].id,'House checklist').length,1);assert.equal(viewEntries([...d.entries,entry],d.homes[1].id,'House checklist').length,0);});
import { requirements, assessRecord, houseCompliance, overallCompliance, linkRequirement, recordReview, readReview } from '../src/lib/compliance.ts';
test('missing checklist requirements and empty houses stay in denominator',()=>{const d=sampleWorkspace();const e={...d.entries[0],status:'Complete',due_date:'2026-12-01',evidence_path:'sample/file',evidence_name:'sample.pdf'};e.notes=linkRequirement(e,'summary');e.notes=recordReview(e,[true,true,true,true]);assert.equal(assessRecord(e,'2026-10-14').score,100);const result=houseCompliance([e],e.home_id,'2026-10-14');assert.equal(result.score,5);assert.equal(result.missing,requirements.length-1);assert.equal(overallCompliance([e],d.homes,'2026-10-14'),3);assert.equal(houseCompliance([e],'empty','2026-10-14').score,0);assert.equal(overallCompliance([],[],'2026-10-14'),null);});
test('review credit requires approval and is invalidated by file replacement',()=>{let e={...sampleWorkspace().entries[0],status:'Open',due_date:'2026-10-14',evidence_path:'sample/file',evidence_name:'sample.pdf'};e.notes=linkRequirement(e,'summary');e.notes=recordReview(e,[true,true,true,true]);assert.equal(assessRecord(e,'2026-10-14').score,40);e={...e,status:'Complete'};assert.equal(assessRecord(e,'2026-10-14').score,100);e={...e,evidence_path:'sample/new-file'};assert.deepEqual(readReview(e),[false,false,false,false]);assert.equal(assessRecord(e,'2026-10-14').score,60);assert.equal(assessRecord({...e,due_date:'2026-10-13'},'2026-10-14').score,50);});
test('unmapped records cannot earn points and duplicate records are averaged',()=>{const d=sampleWorkspace();assert.equal(houseCompliance(d.entries,d.homes[0].id,'2026-10-14').score,0);let e={...d.entries[0],due_date:'2026-10-15'};e.notes=linkRequirement(e,'summary');const poor={...e,id:'poor',assignee:'',due_date:''};const score=houseCompliance([e,poor],e.home_id,'2026-10-14');assert.equal(score.items[0].score,10);assert.equal(houseCompliance([e,poor],d.homes[1].id,'2026-10-14').score,0);assert.equal(houseCompliance([{...e,category:'Incidents'}],e.home_id,'2026-10-14').score,0);});
test('malformed or duplicate review blocks fail closed and relinking removes old review',()=>{let e=sampleWorkspace().entries[0];e.notes=linkRequirement(e,'summary');e.notes=recordReview(e,[true,true,true,true]);assert.deepEqual(readReview({...e,notes:e.notes+e.notes}),[false,false,false,false]);assert.deepEqual(readReview({...e,notes:'[CareFlow review v1]bad[/CareFlow review]'}),[false,false,false,false]);assert.deepEqual(readReview({...e,notes:linkRequirement(e,'progress')}),[false,false,false,false]);});
import { visibleNotes, withReviewMetadata, requirementId } from '../src/lib/compliance.ts';
test('record form preserves checklist metadata without exposing it as editable notes',()=>{let e=sampleWorkspace().entries[0];e.notes=linkRequirement(e,'summary');e.notes=recordReview(e,[true,false,false,false]);const clean=visibleNotes(e.notes);assert.ok(!clean.includes('CareFlow requirement:'));const saved={...e,notes:withReviewMetadata(e,'New evidence summary')};assert.equal(requirementId(saved),'summary');assert.equal(visibleNotes(saved.notes),'New evidence summary');assert.deepEqual(readReview(saved),[true,false,false,false]);});

import { complianceReport } from '../src/lib/compliance.ts';
test('score report includes every home and missing requirement',()=>{const d=sampleWorkspace();const report=complianceReport(d.entries,d.homes,'2026-10-14');assert.equal(report.length,46);assert.equal(report.filter(row=>row[0]===d.homes[0].name).length,20);assert.equal(report.filter(row=>row[0]===d.homes[1].name).length,20);assert.ok(report.slice(6).every(row=>row[4]===0&&row[5]===0));assert.ok(String(report[3][1]).includes('not OHA certification'));});
import { weeklyReview } from '../src/lib/weekly-review.ts';
test('weekly review isolates houses and excludes completed tasks from all action queues',()=>{const d=sampleWorkspace();const h=d.homes[0].id;const e=d.entries[0];const rows=[{...e,id:'late',due_date:'2026-10-13',assignee:'',status:'Open'},{...e,id:'review',due_date:'2026-10-14',status:'In review'},{...e,id:'edge',due_date:'2026-10-21',status:'Open'},{...e,id:'later',due_date:'2026-10-22',status:'Open'},{...e,id:'done',due_date:'2026-10-01',assignee:'',status:'Complete'},{...e,id:'other',home_id:d.homes[1].id,due_date:'2026-10-01',status:'In review'}];const result=weeklyReview(rows,h,'2026-10-14');assert.deepEqual(result.overdue.map(e=>e.id),['late']);assert.deepEqual(result.awaiting.map(e=>e.id),['review']);assert.deepEqual(result.unassigned.map(e=>e.id),['late']);assert.deepEqual(result.upcoming.map(e=>e.id),['review','edge']);assert.equal(result.queue[0].id,'late');assert.equal(result.queue.length,4);assert.equal(result.through,'2026-10-21');});
test('weekly date range handles year rollover and does not mutate source records',()=>{const d=sampleWorkspace();const copy=JSON.stringify(d.entries);assert.equal(weeklyReview(d.entries,d.homes[0].id,'2026-12-28').through,'2027-01-04');assert.equal(JSON.stringify(d.entries),copy);assert.equal(weeklyReview(d.entries,'missing','2026-10-14').queue.length,0);});

import './document-checks.test.mjs';

import './document-import.test.mjs';

import { parseDemoWorkspace } from '../src/lib/demo-storage.ts';
test('demo snapshots preserve legacy edits and reject corrupt rows and cross-home references',()=>{
  const sample=sampleWorkspace();
  assert.deepEqual(parseDemoWorkspace(JSON.stringify(sample)),sample);
  assert.throws(()=>parseDemoWorkspace('null'));
  assert.throws(()=>parseDemoWorkspace(JSON.stringify({...sample,entries:[null]})));
  assert.throws(()=>parseDemoWorkspace(JSON.stringify({...sample,entries:[{...sample.entries[0],home_id:'unknown'}]})));
  assert.throws(()=>parseDemoWorkspace(JSON.stringify({...sample,entries:[{...sample.entries[0],notes:42}]})));
  assert.throws(()=>parseDemoWorkspace(JSON.stringify({...sample,residents:[{id:'bad'}]})));
  assert.throws(()=>parseDemoWorkspace(JSON.stringify({...sample,homes:[sample.homes[0],sample.homes[0]]})));
});

import { todayAttention } from '../src/lib/today-attention.ts';
test('today attention excludes other homes and completed work, with overlapping reasons counted once',()=>{
  const d=sampleWorkspace(), h=d.homes[0].id, e=d.entries[0];
  const items=[{...e,id:'late',due_date:'2026-10-10',assignee:'',status:'In review',category:'Incidents'},{...e,id:'done',status:'Complete',due_date:'2026-10-01'},{...e,id:'other',home_id:d.homes[1].id,due_date:'2026-10-01'},{...e,id:'future',due_date:'2026-11-01'},{...e,id:'today',due_date:'2026-10-23'}];
  const rows=todayAttention(items,h,'2026-10-23');
  assert.deepEqual(rows.map(r=>r.entry.id),['late','today']);
  assert.deepEqual(rows[0].reasons.map(r=>r.id),['overdue','incident','review','owner']);
  assert.deepEqual(rows[1].reasons.map(r=>r.id),['today']);
  assert.equal(todayAttention(items,'missing','2026-10-23').length,0);
});
test('attention evidence flags only expected documents; ties respect priority and do not mutate records',()=>{
  const e=sampleWorkspace().entries[0], before=JSON.stringify(e);
  const linked={...e,id:'linked',notes:linkRequirement(e,'summary'),due_date:'2026-12-01'};
  const rows=todayAttention([{...e,id:'plain',due_date:'2026-12-01'},linked,{...linked,id:'file',evidence_path:'sample/file'},{...e,id:'high',priority:'High',due_date:'2026-10-23'},{...e,id:'normal',due_date:'2026-10-23'}],e.home_id,'2026-10-23');
  assert.deepEqual(rows.map(r=>r.entry.id),['high','normal','linked']);
  assert.deepEqual(rows[2].reasons.map(r=>r.id),['evidence']);
  assert.equal(JSON.stringify(e),before);
});
