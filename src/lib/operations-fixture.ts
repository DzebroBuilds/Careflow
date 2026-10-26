import type { Home } from './workspace.ts';
import { csvCell } from './workspace.ts';
import { parseOperations, validDate, type Operations, type Staff } from './demo-operations.ts';
export function fortyPeople(homes:Home[]):Operations {
 if(!homes.length)throw new Error('Create a home before loading the test team.');
 const first=['Avery','Blake','Cameron','Dakota','Emery','Finley','Gray','Harper','Indigo','Jules','Kai','Logan','Micah','Noel','Oakley','Parker','Quinn','Reese','Sage','Tatum','Alex','Briar','Cory','Drew','Ellis','Frankie','Gale','Hayden','Jesse','Kendall','Lane','Marley','Nico','Peyton','Robin','Shay','Toby','Val','Wren','Yael'];
 const last=['Bennett','Chen','Diaz','Evans','Flores','Grant','Hayes','Ibrahim','Jones','Kim'];
 const staff:Staff[]=first.map((name,i)=>({id:`test40-person-${i+1}`,name:`${name} ${last[i%10]} (Test)`,job:['Support specialist','House lead','Relief worker','Coordinator'][i%4],status:i<32?'Active':i<37?'Onboarding':'Inactive',homeIds:i%5===0?homes.map(h=>h.id):[homes[i%homes.length].id],hourlyCents:2000+(i%8)*125,email:`employee${String(i+1).padStart(2,'0')}@careflow.example`,employeeCode:`TEST-${String(i+1).padStart(3,'0')}`}));
 const data:Operations={version:1,staff,shifts:[],time:[],expenses:[]};
 for(const [i,person] of staff.entries()){
  if(person.status!=='Active')continue;
  const homeId=person.homeIds[0];
  for(let day=0;day<6;day++)data.time.push({id:`test40-time-${i+1}-${day}`,staffId:person.id,homeId,date:`2026-10-${19+day}`,minutes:day===5?240:480,status:i%4===0?'Submitted':'Approved'});
  data.shifts.push({id:`test40-shift-${i+1}`,homeId,staffId:person.id,date:'2026-10-26',start:i%2?'16:00':'08:00',end:i%2?'00:00':'16:00'});
 }
 homes.forEach((home,i)=>{data.shifts.push({id:`test40-open-${i}`,homeId:home.id,staffId:null,date:'2026-10-26',start:'00:00',end:'08:00'});data.expenses.push({id:`test40-expense-${i}`,homeId:home.id,vendor:'Fictional Supply Company',description:'TEST ONLY - household supplies',cents:12345+i*1000,status:'Submitted'});});
 return parseOperations(JSON.stringify(data),homes);
}
// Explicit test model: Monday workweek, 40 regular hours, overtime at 1.5x.
// Includes all homes when allocating overtime. No tax, net pay or submission.
export function payrollPreview(data:Operations,from:string,to:string,homeId?:string){
 if(!validDate(from)||!validDate(to)||from>to)throw new Error('Choose a valid date range.');
 const monday=new Date(from+'T12:00:00Z');monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 const weekStart=monday.toISOString().slice(0,10),weeks=new Map<string,number>();
 const result=new Map<string,{staff:Staff;regularMinutes:number;overtimeMinutes:number;grossCents:number|null}>();
 const entries=data.time.filter(e=>e.status==='Approved'&&e.date>=weekStart&&e.date<=to).sort((a,b)=>(a.date+a.id).localeCompare(b.date+b.id));
 for(const entry of entries){
  const person=data.staff.find(p=>p.id===entry.staffId);if(!person)throw new Error('Time entry has no employee.');
  const date=new Date(entry.date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));const key=person.id+date.toISOString().slice(0,10),used=weeks.get(key)||0;
  const regular=Math.min(entry.minutes,Math.max(0,2400-used)),overtime=entry.minutes-regular;weeks.set(key,used+entry.minutes);
  if(entry.date<from||homeId&&entry.homeId!==homeId)continue;
  const row=result.get(person.id)||{staff:person,regularMinutes:0,overtimeMinutes:0,grossCents:person.hourlyCents?0:null};row.regularMinutes+=regular;row.overtimeMinutes+=overtime;result.set(person.id,row);
 }
 return [...result.values()].map(row=>({...row,grossCents:row.staff.hourlyCents?Math.round((row.regularMinutes+row.overtimeMinutes*1.5)*row.staff.hourlyCents/60):null}));
}
export function payrollTestCsv(data:Operations,from:string,to:string,homeId?:string){const rows=payrollPreview(data,from,to,homeId);if(rows.some(row=>row.grossCents===null))throw new Error('Add missing hourly rates before exporting.');return [['FICTIONAL TEST - gross estimate only - no payroll submission'],['Employee code','Employee','From','To','Regular hours','Overtime hours','Hourly USD','Gross USD'],...rows.map(r=>[r.staff.employeeCode||r.staff.id,r.staff.name,from,to,(r.regularMinutes/60).toFixed(2),(r.overtimeMinutes/60).toFixed(2),(r.staff.hourlyCents!/100).toFixed(2),(r.grossCents!/100).toFixed(2)])].map(row=>row.map(csvCell).join(',')).join('\r\n');}
