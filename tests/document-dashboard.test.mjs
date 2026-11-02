import test from 'node:test';
import assert from 'node:assert/strict';
import {documentCatalog,documentDashboard,documentDefinition,documentGroup} from '../src/lib/document-dashboard.ts';
import {visibleNotes,withReviewMetadata} from '../src/lib/compliance.ts';
const entry=(id,overrides={})=>({id,home_id:'a',category:'Residents',title:'Unclassified document',subject:'Fictional reference',assignee:'',due_date:'2026-11-02',priority:'Normal',status:'Open',notes:'',evidence_path:null,evidence_name:null,updated_at:'',...overrides});

test('home totals exclude other houses and every record belongs to exactly one group',()=>{
 const rows=[entry('a'),entry('b',{category:'Inspection binder'}),entry('c',{category:'Staff orientation'}),entry('foreign',{home_id:'b'})];
 const data=documentDashboard(rows,'a','2026-11-02');
 assert.equal(data.records.length,3);
 assert.deepEqual([...data.groups.flatMap(group=>group.records),...data.other].map(row=>row.id).sort(),['a','b','c']);
});
test('overdue work excludes completed, undated, and today records and sorts before future work',()=>{
 const data=documentDashboard([entry('future',{due_date:'2026-11-04'}),entry('done',{due_date:'2026-01-01',status:'Complete'}),entry('today'),entry('late',{due_date:'2026-11-01'}),entry('undated',{due_date:''})],'a','2026-11-02');
 assert.deepEqual(data.overdue.map(row=>row.id),['late']);assert.deepEqual(data.open.map(row=>row.id),['late','today','future','undated']);
});
test('catalog tags survive edited titles and incompatible area changes do not retain an incorrect type',()=>{
 const row=entry('a',{category:'Inspection binder',title:'Revised swallowing support',notes:'CareFlow document: protocol\n\nReview: pending'});
 assert.equal(documentDefinition(row)?.id,'protocol');
 assert.equal(documentDefinition({...row,category:'Staff orientation'}),undefined);
});
test('monthly tracking stays distinct from source plans and existing worksheets classify correctly',()=>{
 for(const title of ['ISP tracking','Protocol tracking','Safety Plan tracking'])assert.equal(documentGroup(entry(title,{title})),'monthly');
 assert.equal(documentGroup(entry('plan',{category:'Inspection binder',title:'ISP'})),'plans');
 assert.equal(documentGroup(entry('worksheet',{document_type:'mar',category:'Medication records'})),'monthly');
});
test('evidence counts require both path and file name; review queue excludes completed records',()=>{
 const data=documentDashboard([entry('no-file'),entry('partial',{evidence_path:'private/file.pdf'}),entry('attached',{evidence_path:'private/file.pdf',evidence_name:'file.pdf',status:'In review'}),entry('complete',{evidence_path:'private/done.pdf',evidence_name:'done.pdf',status:'Complete'})],'a','2026-11-02');
 assert.deepEqual(data.noFile.map(row=>row.id),['no-file','partial']);assert.deepEqual(data.review.map(row=>row.id),['attached']);
});
test('empty dashboard does not invent missing obligations from the catalog',()=>{
 const data=documentDashboard([],'a','2026-11-02');
 assert.equal(data.open.length,0);assert.equal(data.noFile.length,0);assert.ok(data.groups.every(group=>group.records.length===0));
 assert.equal(new Set(documentCatalog.map(item=>item.id)).size,documentCatalog.length);
});
test('document type remains attached when editable notes change, without showing technical tags',()=>{
 const original=entry('a',{notes:'CareFlow document: rit\n\nOriginal note'});
 assert.equal(visibleNotes(original.notes),'Original note');
 const saved=withReviewMetadata(original,'New note\nCareFlow document: protocol');
 assert.equal(visibleNotes(saved),'New note');assert.match(saved,/CareFlow document: rit/);assert.doesNotMatch(saved,/CareFlow document: protocol/);
});
