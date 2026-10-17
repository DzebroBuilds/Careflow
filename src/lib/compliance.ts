import type { Entry, Category, Home } from './workspace';

export const rthSource = 'https://secure.sos.state.or.us/oard/displayDivisionRules.action?selectedDivision=1029';
export type Requirement = {id:string;name:string;area:string;category:Category;rule:string};
export const requirements:Requirement[] = [
  ['summary','Resident summary','Resident documents','Residents','0130'],
  ['assessment','Mental health assessment','Resident documents','Residents','0130'],
  ['residential-plan','Residential service plan','Resident documents','Residents','0185'],
  ['person-plan','Person-centered service plan','Resident documents','Residents','0130'],
  ['progress','Progress documentation','Resident documents','Residents','0130'],
  ['legal','Legal documents & releases','Resident documents','Residents','0130'],
  ['admission','Admission & screening records','Resident documents','Residents','0163'],
  ['personnel','Personnel & qualifications','Staff & training','Staff orientation','0130'],
  ['orientation','Pre-service orientation','Staff & training','Staff orientation','0135'],
  ['training','Ongoing training evidence','Staff & training','Staff orientation','0135'],
  ['orders','Prescriber orders','Medication documents','Medication records','0215'],
  ['mar','Medication administration records','Medication documents','Medication records','0215'],
  ['screening','Initial health screening','Health & appointments','Residents','0215'],
  ['appointments','Appointments & health follow-up','Health & appointments','Residents','0215'],
  ['license','Licensing & building records','House operations','Inspection binder','0130'],
  ['policies','Policies & procedures','House operations','Inspection binder','0115'],
  ['fire','Fire drills & emergency records','House operations','Inspection binder','0145'],
  ['maintenance','Safety & system maintenance','House operations','Inspection binder','0130'],
  ['operations','Financial, staffing & schedule records','House operations','Inspection binder','0130'],
  ['incidents','Incident reporting & follow-up','Incidents','Incidents','0115'],
].map(([id,name,area,category,rule])=>({id,name,area,category:category as Category,rule:`309-035-${rule}`}));
export const reviewCriteria = ['Correct document and person / home reference','Required sections completed for the applicable requirement','Dates and required signatures checked','Content reviewed against the applicable requirement'] as const;
const tag=/\[CareFlow review v1\]([\s\S]*?)\[\/CareFlow review\]/g;
export function visibleNotes(notes:string) { return notes.replace(tag,'').replace(/^CareFlow requirement: .*\r?\n?/gm,'').trim(); }
export function withReviewMetadata(entry:Entry,notes:string) { const id=requirementId(entry);const reviews=[...entry.notes.matchAll(tag)].map(match=>match[0]);return [visibleNotes(notes),...(id?[`CareFlow requirement: ${id}`]:[]),...reviews].filter(Boolean).join('\n\n'); }
export function requirementId(entry:Entry) { return entry.notes.match(/^CareFlow requirement: ([a-z-]+)$/m)?.[1] || ''; }
export function linkRequirement(entry:Entry,id:string) { return entry.notes.replace(tag,'').replace(/^CareFlow requirement: .*\r?\n?/gm,'').trim()+`\n\nCareFlow requirement: ${id}`; }
// Detect accidental worksheet edits without copying a large worksheet into the review marker.
// This checksum is not an electronic signature or an authorization boundary.
function worksheetFingerprint(value:unknown) {
  const canonical=(item:unknown):unknown=>Array.isArray(item)?item.map(canonical):item&&typeof item==='object'?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,val])=>[key,canonical(val)])):item;
  const text=JSON.stringify(canonical(value??{}));let first=2166136261,second=5381;
  for(let i=0;i<text.length;i++){first=Math.imul(first^text.charCodeAt(i),16777619);second=Math.imul(second,33)^text.charCodeAt(i);}
  return `${text.length}:${first>>>0}:${second>>>0}`;
}
function fingerprint(e:Entry) {const base=[requirementId(e),e.title,e.subject,e.evidence_path,e.evidence_name];return JSON.stringify(e.document_type?[...base,e.resident_id,e.document_type,e.document_period,worksheetFingerprint(e.document_data),e.template_version]:base);}
export function readReview(entry:Entry):boolean[] {
  try {const matches=[...entry.notes.matchAll(tag)];if(matches.length!==1)return [false,false,false,false];const data=JSON.parse(matches[0][1]);return data.fingerprint===fingerprint(entry)&&typeof data.reviewedAt==='string'&&data.checks?.length===4&&data.checks.every((v:unknown)=>typeof v==='boolean')?data.checks:[false,false,false,false];}catch{return [false,false,false,false];}
}
export function recordReview(entry:Entry,checks:boolean[]) { return entry.notes.replace(tag,'').trim()+`\n\n[CareFlow review v1]${JSON.stringify({checks:checks.map(v=>v===true),reviewedAt:new Date().toISOString(),fingerprint:fingerprint(entry)})}[/CareFlow review]`; }
export function assessRecord(entry:Entry,today:string) {
  const approved=entry.status==='Complete';
  const attached=!!entry.evidence_path && !!entry.evidence_name;
  const dated=!!entry.due_date && entry.due_date>=today;
  const checks=readReview(entry);
  const points=[{label:'Approved record',earned:approved?20:0,max:20},{label:'Evidence file attached',earned:attached?20:0,max:20},{label:'Owner assigned',earned:entry.assignee.trim()?10:0,max:10},{label:'Due / next review date current',earned:dated?10:0,max:10},{label:'Human document review',earned:approved?checks.filter(Boolean).length*10:0,max:40}];
  return {score:points.reduce((sum,p)=>sum+p.earned,0),points,checks,attached,reviewed:approved&&checks.every(Boolean)};
}
export function houseCompliance(entries:Entry[],homeId:string,today:string) {
  const homeEntries=entries.filter(e=>e.home_id===homeId);
  const items=requirements.map(requirement=>{const records=homeEntries.filter(e=>requirementId(e)===requirement.id&&e.category===requirement.category);const raw=records.length?records.reduce((sum,e)=>sum+assessRecord(e,today).score,0)/records.length:0;return {requirement,records,raw,score:Math.round(raw)};});
  return {items,score:Math.round(items.reduce((sum,i)=>sum+i.raw,0)/requirements.length),missing:items.filter(i=>!i.records.length).length,unmapped:homeEntries.filter(e=>!items.some(i=>i.records.some(r=>r.id===e.id))).length};
}
export function overallCompliance(entries:Entry[],homes:Home[],today:string) { return homes.length?Math.round(homes.reduce((sum,h)=>sum+houseCompliance(entries,h.id,today).items.reduce((total,item)=>total+item.raw,0)/requirements.length,0)/homes.length):null; }

export function complianceReport(entries:Entry[],homes:Home[],today:string) {
  const rows:unknown[][]=[['CareFlow checklist readiness report'],['Date',today],['Overall score',overallCompliance(entries,homes,today)??'No homes'],['Method','20 starter types; equal weighting; missing types score zero; metadata and human review; not OHA certification'],[],['Home','House score','Document type','Rule','Type score','Linked records','Evidence files','Approved records','Human-reviewed records']];
  for(const home of homes) {const result=houseCompliance(entries,home.id,today);for(const item of result.items) rows.push([home.name,result.score,item.requirement.name,item.requirement.rule,item.score,item.records.length,item.records.filter(e=>assessRecord(e,today).attached).length,item.records.filter(e=>e.status==='Complete').length,item.records.filter(e=>assessRecord(e,today).reviewed).length]);}
  return rows;
}
