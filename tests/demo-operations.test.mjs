import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleWorkspace } from '../src/lib/workspace.ts';
import { seedOperations,saveStaff,saveShift,shiftMinutes,hasCoverage,addTime,reviewTime,addExpense,reviewExpense,approvedHoursCsv,parseOperations } from '../src/lib/demo-operations.ts';
const homes=sampleWorkspace().homes,today='2026-10-25';
test('staff assignment edits preserve history while flagging shifts that lose coverage',()=>{
 const data=seedOperations(homes,today),before=JSON.stringify(data),person=data.staff[0];
 const next=saveStaff(data,{...person,homeIds:[homes[1].id]},homes);
 assert.equal(hasCoverage(data,data.shifts[0]),true);assert.equal(hasCoverage(next,next.shifts[0]),false);assert.equal(next.time.length,data.time.length);assert.equal(JSON.stringify(data),before);
 assert.throws(()=>saveStaff(data,{...person,homeIds:['not-a-home']},homes));assert.throws(()=>saveStaff(data,{...person,homeIds:[homes[0].id,homes[0].id]},homes));
});
test('shift assignment requires active home membership and rejects overlaps including overnight',()=>{
 let data=seedOperations(homes,today);const homeId=homes[0].id;
 data=saveShift(data,{id:'night',homeId,staffId:'demo-staff-2',date:today,start:'22:00',end:'06:00'},homes);
 assert.equal(shiftMinutes(data.shifts[0]),480);
 assert.throws(()=>saveShift(data,{id:'overlap',homeId,staffId:'demo-staff-2',date:'2026-10-26',start:'05:00',end:'07:00'},homes));
 assert.throws(()=>saveShift(data,{id:'onboard',homeId,staffId:'demo-staff-4',date:today,start:'08:00',end:'16:00'},homes));
 assert.throws(()=>saveShift(data,{id:'other-house',homeId,staffId:'demo-staff-3',date:today,start:'08:00',end:'16:00'},homes));
 assert.doesNotThrow(()=>saveShift(data,{id:'unassigned',homeId,staffId:null,date:today,start:'08:00',end:'16:00'},homes));
});
test('invalid or excessively long shifts and invalid calendar dates are rejected',()=>{
 const data=seedOperations(homes,today);for(const [start,end] of [['08:00','08:00'],['06:00','23:00'],['25:00','08:00']])assert.throws(()=>shiftMinutes({start,end}));
 assert.throws(()=>saveShift(data,{id:'bad-day',homeId:homes[0].id,staffId:null,date:'2026-02-30',start:'08:00',end:'16:00'},homes));
});
test('time submissions enforce membership, status, reasonable bounds, and duplicate prevention',()=>{
 const data=seedOperations(homes,today),entry={id:'new-time',homeId:homes[0].id,staffId:'demo-staff-1',date:today,minutes:480,status:'Submitted'};
 const next=addTime(data,entry,homes);assert.equal(next.time.length,data.time.length+1);assert.throws(()=>addTime(next,{...entry,id:'duplicate'},homes));assert.throws(()=>addTime(data,{...entry,status:'Approved'},homes));assert.throws(()=>addTime(data,{...entry,minutes:Infinity},homes));assert.throws(()=>addTime(data,{...entry,homeId:homes[1].id},homes));
});
test('only approved time from the selected home is exported and names are spreadsheet safe',()=>{
 let data=seedOperations(homes,today);data=saveStaff(data,{...data.staff[0],name:'=HYPERLINK("test")'},homes);data=reviewTime(data,'demo-time-1',homes[0].id,'Approved');
 const csv=approvedHoursCsv(data,homes[0]);assert.ok(csv.includes('FICTIONAL DEMO'));assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes('7.50'));assert.ok(csv.includes('8.00'));assert.equal(approvedHoursCsv(data,homes[1]).includes('Jordan'),false);
 assert.throws(()=>reviewTime(data,'demo-time-1',homes[1].id,'Approved'));
 const returned=reviewTime(data,'demo-time-1',homes[0].id,'Submitted');assert.equal(approvedHoursCsv(returned,homes[0]).includes('7.50'),false);
});
test('expense review isolates homes and uses integer cents without payment effects',()=>{
 const data=seedOperations(homes,today),expense={id:'new-expense',homeId:homes[0].id,vendor:'Fictional Vendor',description:'Sample purchase',cents:1050,status:'Submitted'};
 const next=addExpense(data,expense,homes),reviewed=reviewExpense(next,expense.id,homes[0].id,'Approved');assert.equal(reviewed.expenses[0].cents,1050);assert.equal(reviewed.expenses[0].status,'Approved');assert.throws(()=>reviewExpense(next,expense.id,homes[1].id,'Approved'));assert.throws(()=>addExpense(data,{...expense,cents:10.5},homes));assert.throws(()=>addExpense(data,{...expense,cents:-1},homes));assert.throws(()=>addExpense(data,{...expense,status:'Approved'},homes));
});
test('browser snapshots round-trip edits, reject corrupt references and duplicate IDs',()=>{
 const data=seedOperations(homes,today);assert.deepEqual(parseOperations(JSON.stringify(data),homes),data);
 assert.throws(()=>parseOperations('{"version":2}',homes));assert.throws(()=>parseOperations(JSON.stringify({...data,staff:[...data.staff,data.staff[0]]}),homes));assert.throws(()=>parseOperations(JSON.stringify({...data,time:[...data.time,{...data.time[0],id:'duplicate-natural'}]}),homes));assert.throws(()=>parseOperations(JSON.stringify({...data,expenses:[{...data.expenses[0],homeId:'foreign'}]}),homes));
});
test('empty and one-home workspaces have valid fictional seed data',()=>{assert.deepEqual(seedOperations([],today),{version:1,staff:[],shifts:[],time:[],expenses:[]});assert.doesNotThrow(()=>parseOperations(JSON.stringify(seedOperations([homes[0]],today)),[homes[0]]));});
