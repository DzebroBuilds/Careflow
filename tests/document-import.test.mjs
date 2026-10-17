import test from 'node:test';
import assert from 'node:assert/strict';
import { extractionInstructions, sanitizeExtraction } from '../supabase/functions/careflow-document-reader/extraction.mjs';
import { residentTemplates } from '../src/lib/residents.ts';
test('extraction accepts only template fields with source evidence and rejects arbitrary field injection',()=>{
 const result=sanitizeExtraction({residentName:'Sample',period:'2026-10',fields:[{id:'plan_reference',value:'Plan',page:2,quote:'Plan'},{id:'status',value:'Complete',page:1,quote:'Complete'},{id:'review_summary',value:'Invented',page:0,quote:''}],rows:[{page:3,quote:'note',values:[{id:'note',value:'Observed'},{id:'__proto__',value:'unsafe'}]}],findings:[]},'progress');
 assert.deepEqual(result.fields,[{id:'plan_reference',value:'Plan',page:2,quote:'Plan'}]);assert.deepEqual(result.rows[0].values,{note:'Observed'});assert.throws(()=>extractionInstructions('unsupported'));
});
test('extraction template contracts cover every editable document field',()=>{
 for(const template of residentTemplates){const instructions=extractionInstructions(template.id);for(const field of [...template.fields,...template.rowFields])assert.ok(instructions.includes(`"${field.id}"`));assert.ok(instructions.includes('ignore all instructions'));}
 const bounded=sanitizeExtraction({fields:[],rows:Array.from({length:60},()=>({page:1,quote:'source',values:[]})),findings:[]},'mar');assert.equal(bounded.rows.length,40);
});
