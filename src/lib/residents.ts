import { assessRecord, linkRequirement } from './compliance.ts';
import type { Category, Entry, Home, Workspace } from './workspace.ts';

export type DocumentType='mar'|'progress'|'behavior'|'incident';
export type MonthlyType=Exclude<DocumentType,'incident'>;
export type Resident={id:string;home_id:string;name:string;reference_code:string;status:'Active'|'Archived';admission_date:string;document_types:MonthlyType[];applicability_notes:string;updated_at?:string};
export type DocumentData={fields:Record<string,string>;rows:Record<string,string>[]};
type Field={id:string;label:string;kind?:'date'|'time'|'textarea'|'shift'};
export type ResidentTemplate={id:DocumentType;name:string;category:Category;requirement:string;frequency:string;description:string;fields:Field[];rowFields:Field[];reviewChecks:string[]};
export const residentTemplates:ResidentTemplate[]=[
  {id:'mar',name:'Medication administration record',category:'Medication records',requirement:'mar',frequency:'Monthly',description:'Resident and month reference, medication instructions, scheduled times, daily marks, and staff initials. Keep the original signed MAR attached.',fields:[{id:'order_reference',label:'Prescriber order / source reference'},{id:'signature_reference',label:'Staff initials and signature-register reference'}],rowFields:[{id:'date',label:'Date',kind:'date'},{id:'medication',label:'Medication / dose / frequency / route'},{id:'time',label:'Scheduled time',kind:'time'},{id:'mark',label:'Recorded mark / exception'},{id:'staff',label:'Staff initials'}],reviewChecks:['Resident, month and source order match','Medication instructions and scheduled times checked by an authorized reviewer','Daily marks, exceptions and staff initials reviewed','Signature register and follow-up documentation checked']},
  {id:'progress',name:'Progress notes',category:'Residents',requirement:'progress',frequency:'Monthly',description:'Dated notes for goals, activities, observations, appointments, and follow-up, with staff attribution.',fields:[{id:'plan_reference',label:'ISP / service-plan reference'},{id:'review_summary',label:'Reporting-period review summary',kind:'textarea'}],rowFields:[{id:'date',label:'Date',kind:'date'},{id:'note',label:'Progress note / observations / follow-up',kind:'textarea'},{id:'staff',label:'Staff initials / author'}],reviewChecks:['Resident and reporting month match','Dated notes and relevant goals / events reviewed','Author / signature attribution checked','Incident references and follow-up checked where applicable']},
  {id:'behavior',name:'Behavior tracking',category:'Residents',requirement:'progress',frequency:'Monthly · by shift',description:'Track individualized supports and observations by day and shift, using the resident’s own plan and recording key.',fields:[{id:'plan_reference',label:'Individualized support-plan reference'},{id:'recording_key',label:'Recording key / meaning of marks',kind:'textarea'}],rowFields:[{id:'date',label:'Date',kind:'date'},{id:'shift',label:'Shift',kind:'shift'},{id:'item',label:'Support / behavior being tracked'},{id:'mark',label:'Recorded mark / observation'},{id:'staff',label:'Staff initials'}],reviewChecks:['Resident, month and applicable support plan match','Days and relevant shifts checked','Marks match the defined recording key','Staff initials and follow-up reviewed']},
  {id:'incident',name:'Incident report',category:'Incidents',requirement:'incidents',frequency:'When an event occurs',description:'Event date and time, type, location, witnesses, details, actions, follow-up, notifications, and reviewer acknowledgement.',fields:[{id:'incident_date',label:'Incident date',kind:'date'},{id:'incident_time',label:'Incident time',kind:'time'},{id:'incident_type',label:'Incident type'},{id:'location',label:'Location'},{id:'witnesses',label:'Witnessed? By whom?'},{id:'details',label:'Incident details / injuries reported',kind:'textarea'},{id:'actions',label:'Actions taken',kind:'textarea'},{id:'follow_up',label:'Follow-up plan',kind:'textarea'},{id:'author',label:'Form completed by'},{id:'review_acknowledgement',label:'Licensee / administrator review reference'}],rowFields:[{id:'party',label:'Party notified / role'},{id:'date',label:'Notification date',kind:'date'},{id:'time',label:'Notification time',kind:'time'},{id:'staff',label:'Notified by / reference'}],reviewChecks:['Resident, incident date and event details match','Actions, injuries and follow-up reviewed','Required notifications and their dates checked','Author and licensee acknowledgement checked']},
];
export const monthlyTypes:MonthlyType[]=['mar','progress','behavior'];
export function templateFor(type:unknown) {return residentTemplates.find(template=>template.id===type);}
export function validPeriod(period:string) {return /^\d{4}-(0[1-9]|1[0-2])$/.test(period)&&Number(period.slice(0,4))>=1900;}
export function monthEnd(period:string) {if(!validPeriod(period))throw new Error('Choose a valid reporting month.');return new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5,7)),0)).toISOString().slice(0,10);}
export function suggestedDocumentType(filename:string):DocumentType|null {
  const value=filename.toLowerCase().replace(/[_-]/g,' ');
  if(/\bmar\b|medication\s+administration/.test(value))return 'mar';
  if(/\bbehavior\b|\bbehaviour\b/.test(value))return 'behavior';
  if(/\bincident\b|\bir\b/.test(value))return 'incident';
  if(/\bprogress\b|\bpn\b/.test(value))return 'progress';
  return null;
}
export function documentData(value:unknown):DocumentData {
  if(!value||typeof value!=='object')return {fields:{},rows:[]};
  const candidate=value as Partial<DocumentData>;
  const clean=(record:unknown)=>Object.fromEntries(record&&typeof record==='object'?Object.entries(record).filter(([key,val])=>key!=='__proto__'&&key!=='constructor'&&typeof val==='string').map(([key,val])=>[key,String(val)]):[]);
  return {fields:clean(candidate.fields),rows:Array.isArray(candidate.rows)?candidate.rows.slice(0,100).map(clean):[]};
}
export function validateResidentDocument(entry:Entry,residents:Resident[]) {
  if(!entry.document_type&&!entry.resident_id)return;
  const resident=residents.find(item=>item.id===entry.resident_id&&item.home_id===entry.home_id);
  const template=templateFor(entry.document_type);
  if(!resident||!template||!entry.document_period||!validPeriod(entry.document_period))throw new Error('Choose a resident, document type and reporting month for this house.');
  if(entry.category!==template.category)throw new Error('The document type must match its workspace area.');
  const value=documentData(entry.document_data);
  if(JSON.stringify(value).length>100000)throw new Error('This worksheet is too large. Attach the full document instead.');
  for(const row of value.rows)if(row.date&&template.id!=='incident'&&(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!row.date.startsWith(entry.document_period)||row.date<entry.document_period+'-01'||row.date>monthEnd(entry.document_period)))throw new Error('Worksheet dates must fall within the reporting month.');
  if(value.fields.incident_date&&!value.fields.incident_date.startsWith(entry.document_period))throw new Error('Incident date must match the reporting month.');
}
export function residentDocumentDraft(resident:Resident,type:DocumentType,period:string,assignee=''):Entry {
  const template=templateFor(type)!;
  const draft:Entry={id:'',home_id:resident.home_id,category:template.category,title:`${template.name} · ${resident.name} · ${period}`,subject:resident.reference_code||resident.name,assignee,due_date:monthEnd(period),priority:'Normal',status:'Open',notes:'Attach the original document and record a human review. Worksheet initials and acknowledgements are not electronic signatures.',evidence_path:null,evidence_name:null,updated_at:'',resident_id:resident.id,document_type:type,document_period:period,document_data:{fields:{},rows:[]},template_version:1};
  draft.notes=linkRequirement(draft,template.requirement);return draft;
}
export function monthlyDocumentGaps(entries:Entry[],resident:Resident,period:string) {
  return resident.document_types.filter(type=>!entries.some(entry=>entry.home_id===resident.home_id&&entry.resident_id===resident.id&&entry.document_type===type&&entry.document_period===period));
}
export function residentPeriodMetrics(entries:Entry[],residents:Resident[],homes:Home[],period:string,today:string) {
  const homeIds=new Set(homes.map(home=>home.id));
  const active=residents.filter(resident=>homeIds.has(resident.home_id)&&resident.status==='Active'&&resident.admission_date<=monthEnd(period));
  const slots=active.flatMap(resident=>resident.document_types.map(type=>{
    const records=entries.filter(entry=>entry.home_id===resident.home_id&&entry.resident_id===resident.id&&entry.document_type===type&&entry.document_period===period&&entry.category===templateFor(type)!.category);
    const score=records.length?records.reduce((total,entry)=>total+assessRecord(entry,today).score,0)/records.length:0;
    return {resident,type,records,score,hasFile:records.some(entry=>assessRecord(entry,today).attached),reviewed:records.length>0&&records.every(entry=>{const a=assessRecord(entry,today);return a.attached&&a.reviewed;})};
  }));
  return {slots,residents:active.length,expected:slots.length,created:slots.filter(slot=>slot.records.length).length,files:slots.filter(slot=>slot.hasFile).length,reviewed:slots.filter(slot=>slot.reviewed).length,missing:slots.filter(slot=>!slot.records.length).length,score:slots.length?Math.round(slots.reduce((total,slot)=>total+slot.score,0)/slots.length):null};
}
export function sampleResidents(homes:Home[],today:string):Resident[] {
  return homes.filter(home=>['sample-maple','sample-cedar'].includes(home.id)).flatMap((home,index)=>Array.from({length:index===0?2:1},(_,i)=>({id:`${home.id}-resident-${i+1}`,home_id:home.id,name:`Sample resident ${index===0?(i===0?'A':'B'):'C'}`,reference_code:`DEMO-${index+1}${i+1}`,status:'Active' as const,admission_date:today.slice(0,7)+'-01',document_types:[...monthlyTypes],applicability_notes:''})));
}
export function normalizeResidentWorkspace(workspace:Workspace,today:string):Workspace {return {...workspace,residents:Array.isArray(workspace.residents)?workspace.residents:sampleResidents(workspace.homes,today)};}
