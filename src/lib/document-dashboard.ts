import type { Category, Entry } from './workspace.ts';

export const documentGroups = [
  {id:'plans',name:'Plans & protocols',description:'The instructions behind each resident’s care.'},
  {id:'signed',name:'Signed resident documents',description:'Rights, agreements, and policy acknowledgments.'},
  {id:'medical',name:'Medical documents',description:'Orders, guidelines, tests, and health evidence.'},
  {id:'monthly',name:'Monthly records',description:'Resident tracking for each reporting month.'},
  {id:'staff',name:'Staff files & training',description:'Qualifications, onboarding, and training evidence.'},
  {id:'house',name:'House & follow-up',description:'House checks, incidents, and corrective actions.'},
] as const;
export type DocumentGroup=typeof documentGroups[number]['id'];
export type DocumentDefinition={id:string;name:string;group:DocumentGroup;category:Category;match:RegExp};
export const documentCatalog:DocumentDefinition[]=[
  {id:'rit',name:'RIT',group:'plans',category:'Inspection binder',match:/\brit\b/i},
  {id:'isp',name:'ISP',group:'plans',category:'Inspection binder',match:/\bisp\b|service.plan/i},
  {id:'prms',name:'PRMS',group:'plans',category:'Inspection binder',match:/\bprms\b/i},
  {id:'pbsp',name:'PBSP',group:'plans',category:'Inspection binder',match:/\bpbsp\b/i},
  {id:'pci',name:'PCI',group:'plans',category:'Inspection binder',match:/\bpci\b/i},
  {id:'protocol',name:'Protocol',group:'plans',category:'Inspection binder',match:/\bprotocol\b/i},
  {id:'safety-plan',name:'Safety Plan',group:'plans',category:'Inspection binder',match:/safety plan/i},
  {id:'financial-plan',name:'Financial Plan',group:'plans',category:'Inspection binder',match:/financial plan/i},
  {id:'rights-notification',name:'Notification of Rights',group:'signed',category:'Residents',match:/notification of rights/i},
  {id:'agency-notification',name:'Agency notification',group:'signed',category:'Residents',match:/agency notification/i},
  {id:'bill-rights',name:'Bill of Rights',group:'signed',category:'Residents',match:/bill of rights/i},
  {id:'agreement',name:'Residential Agreement',group:'signed',category:'Residents',match:/resident(?:ial)? agreement/i},
  {id:'behavior-policy',name:'Behavior Policy',group:'signed',category:'Residents',match:/behaviou?r policy/i},
  {id:'compliance-policy',name:'Compliance Policy',group:'signed',category:'Residents',match:/compliance policy/i},
  {id:'balancing',name:'Balancing test',group:'medical',category:'Medication records',match:/balancing test/i},
  {id:'irregularity',name:'Medication-irregularity addendum',group:'medical',category:'Medication records',match:/irregularit/i},
  {id:'labs',name:'Lab results',group:'medical',category:'Medication records',match:/\blab(?:oratory)?\b/i},
  {id:'prn',name:'PRN guidelines',group:'medical',category:'Medication records',match:/\bprn\b/i},
  {id:'orders',name:'Prescriber orders',group:'medical',category:'Medication records',match:/prescrib|medication order/i},
  {id:'mar',name:'MAR',group:'monthly',category:'Medication records',match:/\bmar\b|medication administration/i},
  {id:'progress',name:'Progress notes',group:'monthly',category:'Residents',match:/progress (?:notes|documentation)/i},
  {id:'behavior',name:'Behavior tracking',group:'monthly',category:'Residents',match:/behaviou?r tracking/i},
  {id:'isp-tracking',name:'ISP tracking',group:'monthly',category:'Residents',match:/isp tracking/i},
  {id:'activity',name:'Activity tracking',group:'monthly',category:'Residents',match:/activity tracking/i},
  {id:'safety-tracking',name:'Safety Plan tracking',group:'monthly',category:'Residents',match:/safety.plan tracking/i},
  {id:'protocol-tracking',name:'Protocol tracking',group:'monthly',category:'Residents',match:/protocol tracking/i},
  {id:'controlled-count',name:'Controlled-substance count',group:'monthly',category:'Medication records',match:/controlled.substance count/i},
  {id:'disposal',name:'Drug disposal',group:'monthly',category:'Medication records',match:/drug disposal/i},
  {id:'credentials',name:'Credentials & certifications',group:'staff',category:'Staff orientation',match:/credential|certification/i},
  {id:'onboarding',name:'Onboarding documents',group:'staff',category:'Staff orientation',match:/onboarding|orientation/i},
  {id:'training',name:'Training records & certificates',group:'staff',category:'Staff orientation',match:/training|certificate/i},
  {id:'acknowledgment',name:'Staff acknowledgment',group:'staff',category:'Staff orientation',match:/staff acknowledgment/i},
  {id:'incident',name:'Incident report',group:'house',category:'Incidents',match:/incident/i},
  {id:'appointment',name:'Appointment supporting documents',group:'house',category:'Residents',match:/appointment/i},
  {id:'risk-change',name:'Risk change / corrective-action form',group:'house',category:'Corrective actions',match:/risk change|corrective.action/i},
  {id:'house-check',name:'House checklist',group:'house',category:'Inspection binder',match:/house check|drill|maintenance/i},
];
export function documentDefinition(entry:Entry) {
  const id=entry.notes.match(/^CareFlow document: ([a-z-]+)$/m)?.[1];
  const tagged=documentCatalog.find(item=>item.id===id&&item.category===entry.category);
  if(tagged)return tagged;
  if(entry.document_type)return documentCatalog.find(item=>item.id===entry.document_type);
  // Tracking names precede parent plans; a monthly ISP log is not the ISP itself.
  const ordered=[...documentCatalog.filter(item=>item.group==='monthly'),...documentCatalog.filter(item=>item.group!=='monthly')];
  return ordered.find(item=>item.category===entry.category&&item.match.test(entry.title));
}
export function documentGroup(entry:Entry):DocumentGroup|'other' {
  const definition=documentDefinition(entry);
  if(definition)return definition.group;
  if(entry.category==='Staff orientation')return 'staff';
  if(entry.category==='Medication records')return 'medical';
  if(['Inspection binder','Incidents','Corrective actions','Monthly reviews'].includes(entry.category))return 'house';
  return 'other';
}
export function documentDashboard(entries:Entry[],homeId:string,today:string) {
  const records=entries.filter(entry=>entry.home_id===homeId);
  const overdue=(entry:Entry)=>entry.status!=='Complete'&&!!entry.due_date&&entry.due_date<today;
  return {records,
    groups:documentGroups.map(group=>({...group,records:records.filter(entry=>documentGroup(entry)===group.id)})),
    other:records.filter(entry=>documentGroup(entry)==='other'),
    overdue:records.filter(overdue),review:records.filter(entry=>entry.status==='In review'),
    noFile:records.filter(entry=>!entry.evidence_path||!entry.evidence_name),
    open:records.filter(entry=>entry.status!=='Complete').sort((a,b)=>Number(overdue(b))-Number(overdue(a))||(a.due_date||'9999').localeCompare(b.due_date||'9999')||a.title.localeCompare(b.title)),
  };
}
