import type { Home } from './workspace.ts';
import { csvCell, localDate } from './workspace.ts';
export const operationsKey='careflow-demo-operations-v1';
export type Staff={id:string;name:string;job:string;status:'Active'|'Onboarding'|'Inactive';homeIds:string[]};
export type Shift={id:string;homeId:string;staffId:string|null;date:string;start:string;end:string};
export type TimeEntry={id:string;homeId:string;staffId:string;date:string;minutes:number;status:'Submitted'|'Approved'};
export type Expense={id:string;homeId:string;vendor:string;description:string;cents:number;status:'Submitted'|'Approved'};
export type Operations={version:1;staff:Staff[];shifts:Shift[];time:TimeEntry[];expenses:Expense[]};
const text=(value:unknown,max:number)=>typeof value==='string'&&!!value.trim()&&value.length<=max;
const id=(value:unknown)=>typeof value==='string'&&/^[A-Za-z0-9-]{1,80}$/.test(value);
export function validDate(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;}
function clock(value:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new Error('Enter a valid shift time.');return Number(value.slice(0,2))*60+Number(value.slice(3));}
export function shiftMinutes(shift:Pick<Shift,'start'|'end'>){const start=clock(shift.start),end=clock(shift.end);const minutes=end>start?end-start:1440+end-start;if(minutes>960)throw new Error('Keep demo shifts to 16 hours or less.');return minutes;}
function windowFor(shift:Shift){const start=Date.parse(shift.date+'T00:00:00Z')/60000+clock(shift.start);return {start,end:start+shiftMinutes(shift)};}
function eligible(staff:Staff|undefined,homeId:string){return !!staff&&staff.status==='Active'&&staff.homeIds.includes(homeId);}
export function hasCoverage(data:Operations,shift:Shift){return eligible(data.staff.find(staff=>staff.id===shift.staffId),shift.homeId);}
export function saveStaff(data:Operations,profile:Staff,homes:Home[]) {
 const allowed=new Set(homes.map(home=>home.id));
 if(!id(profile.id)||!text(profile.name,120)||!text(profile.job,80)||!['Active','Onboarding','Inactive'].includes(profile.status)||!Array.isArray(profile.homeIds)||profile.homeIds.some(homeId=>!allowed.has(homeId))||new Set(profile.homeIds).size!==profile.homeIds.length)throw new Error('Enter a name, job title, valid status and available homes.');
 return {...data,staff:[{...profile,name:profile.name.trim(),job:profile.job.trim()},...data.staff.filter(staff=>staff.id!==profile.id)]};
}
export function saveShift(data:Operations,shift:Shift,homes:Home[]) {
 if(!id(shift.id)||!homes.some(home=>home.id===shift.homeId)||!validDate(shift.date))throw new Error('Choose an available home and a valid shift date.');
 shiftMinutes(shift);
 if(shift.staffId&&!eligible(data.staff.find(staff=>staff.id===shift.staffId),shift.homeId))throw new Error('Choose an active employee assigned to this home.');
 if(shift.staffId){const target=windowFor(shift);if(data.shifts.some(existing=>{if(existing.id===shift.id||existing.staffId!==shift.staffId)return false;const other=windowFor(existing);return target.start<other.end&&other.start<target.end;}))throw new Error('This employee already has an overlapping shift.');}
 return {...data,shifts:[shift,...data.shifts.filter(existing=>existing.id!==shift.id)]};
}
export function addTime(data:Operations,entry:TimeEntry,homes:Home[]) {
 if(!id(entry.id)||!homes.some(home=>home.id===entry.homeId)||!eligible(data.staff.find(staff=>staff.id===entry.staffId),entry.homeId)||!validDate(entry.date)||!Number.isInteger(entry.minutes)||entry.minutes<1||entry.minutes>1440||entry.status!=='Submitted')throw new Error('Choose an active employee, date, and between 0 and 24 hours.');
 if(data.time.some(existing=>existing.id===entry.id||existing.homeId===entry.homeId&&existing.staffId===entry.staffId&&existing.date===entry.date))throw new Error('A time entry already exists for this employee, home and date.');
 return {...data,time:[entry,...data.time]};
}
export function addExpense(data:Operations,entry:Expense,homes:Home[]) {
 if(!id(entry.id)||data.expenses.some(existing=>existing.id===entry.id)||!homes.some(home=>home.id===entry.homeId)||!text(entry.vendor,120)||!text(entry.description,240)||!Number.isInteger(entry.cents)||entry.cents<1||entry.cents>10000000||entry.status!=='Submitted')throw new Error('Enter a vendor, description and an amount between $0.01 and $100,000.');
 return {...data,expenses:[{...entry,vendor:entry.vendor.trim(),description:entry.description.trim()},...data.expenses]};
}
export function reviewTime(data:Operations,entryId:string,homeId:string,status:TimeEntry['status']){if(!['Approved','Submitted'].includes(status)||!data.time.some(entry=>entry.id===entryId&&entry.homeId===homeId))throw new Error('Time entry not available for this home.');return {...data,time:data.time.map(entry=>entry.id===entryId&&entry.homeId===homeId?{...entry,status}:entry)};}
export function reviewExpense(data:Operations,entryId:string,homeId:string,status:Expense['status']){if(!['Approved','Submitted'].includes(status)||!data.expenses.some(entry=>entry.id===entryId&&entry.homeId===homeId))throw new Error('Expense not available for this home.');return {...data,expenses:data.expenses.map(entry=>entry.id===entryId&&entry.homeId===homeId?{...entry,status}:entry)};}
export function approvedHoursCsv(data:Operations,home:Home){const rows=[['FICTIONAL DEMO - approved hours only - not a payroll submission'],['Home','Employee','Employee ID','Date','Hours'],...data.time.filter(entry=>entry.homeId===home.id&&entry.status==='Approved').map(entry=>[home.name,data.staff.find(staff=>staff.id===entry.staffId)?.name||'Unknown employee',entry.staffId,entry.date,(entry.minutes/60).toFixed(2)])];return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
export function seedOperations(homes:Home[],today=localDate()):Operations {
 const first=homes[0]?.id,second=homes[1]?.id||first;if(!first)return {version:1,staff:[],shifts:[],time:[],expenses:[]};
 const date=(offset:number)=>{const d=new Date(today+'T12:00:00');d.setDate(d.getDate()+offset);return localDate(d);};
 return {version:1,staff:[{id:'demo-staff-1',name:'Jordan Lee',job:'House lead',status:'Active',homeIds:[first]},{id:'demo-staff-2',name:'Morgan Rivera',job:'Support specialist',status:'Active',homeIds:[first,second].filter((value,index,array)=>array.indexOf(value)===index)},{id:'demo-staff-3',name:'Taylor Brooks',job:'Support specialist',status:'Active',homeIds:[second]},{id:'demo-staff-4',name:'Casey Patel',job:'Support specialist',status:'Onboarding',homeIds:[first]}],shifts:[{id:'demo-shift-1',homeId:first,staffId:'demo-staff-1',date:today,start:'08:00',end:'16:00'},{id:'demo-shift-2',homeId:first,staffId:null,date:today,start:'16:00',end:'00:00'},{id:'demo-shift-3',homeId:first,staffId:'demo-staff-2',date:date(1),start:'08:00',end:'16:00'},{id:'demo-shift-4',homeId:second,staffId:'demo-staff-3',date:today,start:'08:00',end:'16:00'}],time:[{id:'demo-time-1',homeId:first,staffId:'demo-staff-1',date:date(-1),minutes:450,status:'Submitted'},{id:'demo-time-2',homeId:first,staffId:'demo-staff-2',date:date(-1),minutes:480,status:'Approved'}],expenses:[{id:'demo-expense-1',homeId:first,vendor:'Sample Supply Co.',description:'Household supplies',cents:18525,status:'Submitted'},{id:'demo-expense-2',homeId:first,vendor:'Sample Transport',description:'Vehicle fuel',cents:4200,status:'Approved'}]};
}
export function parseOperations(raw:string,homes:Home[]):Operations {
 if(raw.length>3000000)throw new Error('Sample operations are too large.');
 const data=JSON.parse(raw) as Operations,homeIds=new Set(homes.map(home=>home.id));
 if(!data||data.version!==1||!['staff','shifts','time','expenses'].every(key=>Array.isArray(data[key as keyof Operations])&&(data[key as keyof Operations] as unknown[]).length<=5000))throw new Error('Invalid sample operations.');
 for(const rows of [data.staff,data.shifts,data.time,data.expenses])if(rows.some(row=>!row||!id(row.id))||new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Invalid or duplicate sample IDs.');
 for(const staff of data.staff)saveStaff({version:1,staff:[],shifts:[],time:[],expenses:[]},staff,homes);
 const staffIds=new Set(data.staff.map(staff=>staff.id));
 for(const shift of data.shifts){if(!homeIds.has(shift.homeId)||shift.staffId!==null&&!staffIds.has(shift.staffId)||!validDate(shift.date))throw new Error('Invalid shift references.');shiftMinutes(shift);}
 for(const entry of data.time)if(!homeIds.has(entry.homeId)||!staffIds.has(entry.staffId)||!validDate(entry.date)||!Number.isInteger(entry.minutes)||entry.minutes<1||entry.minutes>1440||!['Submitted','Approved'].includes(entry.status))throw new Error('Invalid time entry.');
 for(const entry of data.expenses)if(!homeIds.has(entry.homeId)||!text(entry.vendor,120)||!text(entry.description,240)||!Number.isInteger(entry.cents)||entry.cents<1||entry.cents>10000000||!['Submitted','Approved'].includes(entry.status))throw new Error('Invalid expense.');
 if(new Set(data.time.map(entry=>entry.homeId+':'+entry.staffId+':'+entry.date)).size!==data.time.length)throw new Error('Duplicate sample time entries.');
 return data;
}
