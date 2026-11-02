import test from 'node:test';
import assert from 'node:assert/strict';
import { complianceMetrics, filterMetricRows } from '../src/lib/metrics.ts';
import { linkRequirement, recordReview, overallCompliance } from '../src/lib/compliance.ts';
import { sampleWorkspace } from '../src/lib/workspace.ts';

const today='2026-10-16';
function evidence(homeId,id='one') {
  let entry={...sampleWorkspace().entries[0],id,home_id:homeId,status:'Complete',due_date:'2026-12-01',evidence_path:`${homeId}/one.pdf`,evidence_name:'one.pdf'};
  entry.notes=linkRequirement(entry,'summary');entry.notes=recordReview(entry,[true,true,true,true]);return entry;
}
test('house metrics isolate files and records; overall includes empty houses and omits inaccessible homes',()=>{
  const homes=sampleWorkspace().homes;
  const rows=[evidence(homes[0].id),evidence('inaccessible')];
  const m=complianceMetrics(rows,homes,today);
  assert.equal(m.houses[0].score,5);assert.equal(m.houses[1].score,0);
  assert.equal(m.score,3);assert.equal(m.requiredTypes,40);assert.equal(m.fileTypes,1);
  assert.equal(m.records,1);assert.equal(m.files,1);assert.equal(m.rows.length,1);
  assert.equal(m.reviewedTypes,1);assert.equal(m.score,overallCompliance(rows,homes,today));
});
test('unlinked evidence is visible in the register but cannot increase checklist coverage or score',()=>{
  const homes=sampleWorkspace().homes;const entry={...evidence(homes[0].id),notes:''};
  const m=complianceMetrics([entry],homes,today);
  assert.equal(m.files,1);assert.equal(m.unlinked,1);assert.equal(m.fileTypes,0);assert.equal(m.score,0);
  assert.equal(filterMetricRows(m.rows,'unlinked','one.pdf').length,1);
});
test('duplicate file paths count once, while every linked record must be reviewed for reviewed-type coverage',()=>{
  const homes=sampleWorkspace().homes;
  const good=evidence(homes[0].id);
  const pending={...good,id:'two',status:'In review'};
  const m=complianceMetrics([good,pending],homes,today);
  assert.equal(m.records,2);assert.equal(m.files,1);assert.equal(m.fileTypes,1);
  assert.equal(m.reviewedTypes,0);assert.equal(m.reviewNeeded,1);
  assert.equal(filterMetricRows(m.rows,'review','').length,1);
});
test('file replacement and missing attachments invalidate reviewed coverage; overdue filters respect completed tasks',()=>{
  const homes=sampleWorkspace().homes;
  const good=evidence(homes[0].id);
  const replaced={...good,id:'changed',evidence_path:'changed.pdf',evidence_name:'changed.pdf'};
  const missing={...good,id:'missing',evidence_path:null,evidence_name:null,status:'Open',due_date:'2026-10-01'};
  const completeOld={...good,id:'done',due_date:'2026-10-01'};
  const m=complianceMetrics([replaced,missing,completeOld],homes,today);
  assert.equal(m.overdue,1);assert.equal(m.missingFiles,1);assert.equal(m.reviewedTypes,0);
  assert.deepEqual(filterMetricRows(m.rows,'missing','').map(row=>row.entry.id),['missing']);
  assert.deepEqual(filterMetricRows(m.rows,'overdue','').map(row=>row.entry.id),['missing']);
  assert.equal(filterMetricRows(m.rows,'all','CEDAR').length,0);
});
test('no houses has no score, and rounded overall uses raw house scores consistently',()=>{
  assert.equal(complianceMetrics([],[],today).score,null);
  const homes=sampleWorkspace().homes;
  const first={...evidence(homes[0].id),status:'Open',notes:linkRequirement(evidence(homes[0].id),'summary')};
  const second={...evidence(homes[0].id,'second'),status:'Open',evidence_path:null,evidence_name:null,notes:linkRequirement(evidence(homes[0].id),'summary')};
  const m=complianceMetrics([first,second],homes,today);
  assert.equal(m.houses[0].rawScore,1.5);assert.equal(m.houses[0].score,2);
  assert.equal(m.score,1);assert.equal(m.score,overallCompliance([first,second],homes,today));
});
