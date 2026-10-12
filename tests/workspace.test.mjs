import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleWorkspace, readiness, isOverdue, csvCell, reviewCsv } from '../src/lib/workspace.ts';
test('readiness excludes other homes and handles an empty home',()=>{const data=sampleWorkspace();const entries=data.entries.filter(e=>e.home_id===data.homes[0].id);assert.equal(readiness(entries),25);assert.equal(readiness([]),null);});
test('due dates do not mark completed records overdue',()=>{const entry=sampleWorkspace().entries[0];assert.equal(isOverdue({...entry,due_date:'2026-01-01',status:'Complete'},'2026-10-12'),false);assert.equal(isOverdue({...entry,due_date:'2026-10-11',status:'Open'},'2026-10-12'),true);assert.equal(isOverdue({...entry,due_date:'2026-10-12',status:'Open'},'2026-10-12'),false);});
test('review CSV escapes quotes, newlines and spreadsheet formulas',()=>{assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('  @SUM(A1)'),'"\'  @SUM(A1)"');assert.equal(csvCell('a"b\nc'),'"a""b\nc"');const data=sampleWorkspace();assert.ok(reviewCsv(data.homes[0],data.entries).includes('CareFlow review packet'));});
