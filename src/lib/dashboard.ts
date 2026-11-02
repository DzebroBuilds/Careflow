import type { Entry, Category } from './workspace';

export const navigation: {group:string;items:readonly (readonly [string,string,string])[]}[] = [
  { group: 'Overview', items: [['Readiness center','Dashboard','grid'],['Weekly review','Weekly owner review','clock'],['Compliance tracker','Compliance & files','shield'],['Calendar','Calendar','calendar'],['Approvals','Approvals','check']] },
  { group: 'Care', items: [['Residents','Residents & documents','people'],['Document reader','OCR document reader','file'],['Medication records','Medication documentation','pill'],['Incidents','Incidents & follow-up','warning']] },
  { group: 'Compliance', items: [['Inspection binder','Compliance documents','file'],['Support Documents','Support Documents','folder'],['Corrective actions','Corrective actions','shield'],['House checklist','House checklist','check'],['Monthly reviews','Monthly reviews','clock'],['Reports','Reports','chart'],['Templates','Templates','printer']] },
  { group: 'People', items: [['Staff orientation','Staff readiness & training','people']] },
  { group: 'Administration', items: [['QuickBooks','Intuit QuickBooks','chart'],['Connected tools','Connected tools','grid'],['Homes','Homes','home'],['Settings','Access & settings','lock'],['Activity history','Audit log','clock'],['Help','Help & glossary','file']] },
  { group: 'AI workspace', items: [['Your team','AI manager','people']] },
] as const;
const workspaceLabels:Record<string,string>={'Readiness center':'Today','Staff directory':'People','Shift coverage':'Schedule','Time approvals':'Time & approvals','Payroll preparation':'Payroll preparation','Document reader':'Document reader'};
export function sectionLabel(section: string) { return workspaceLabels[section] || navigation.flatMap(g=>g.items).find(i=>i[0]===section)?.[1] || section; }
export function viewEntries(entries: Entry[], homeId: string, section: string) {
  return entries.filter(e=>e.home_id===homeId).filter(e=>section==='Approvals'?e.status==='In review':section==='Calendar'?!!e.due_date && e.status!=='Complete':section==='House checklist'?e.category==='Inspection binder' && e.title.startsWith('House check · '):section==='Readiness center'?e.status!=='Complete':e.category===section).sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999')||a.title.localeCompare(b.title));
}
export type RecordTemplate = { title: string; category: Category; description: string; notes: string };
export const recordTemplates: RecordTemplate[] = [
  { title:'House check · Emergency equipment', category:'Inspection binder', description:'Record the check, evidence, and any follow-up needed.', notes:'Check date:\nChecked by:\nEquipment / location:\nObserved condition:\nEvidence reference:\nFollow-up and owner:\nAdministrator review:' },
  { title:'House check · Environment walkthrough', category:'Inspection binder', description:'A practical walkthrough of shared spaces and reported concerns.', notes:'Walkthrough date:\nChecked by:\nAreas reviewed:\nObserved concerns:\nFollow-up and owner:\nEvidence reference:\nAdministrator review:' },
  { title:'Staff training evidence review', category:'Staff orientation', description:'Track training evidence and outstanding requirements.', notes:'Staff reference:\nTraining topic:\nCompletion date:\nEvidence reference:\nRequirements to verify:\nFollow-up and owner:\nAdministrator review:' },
  { title:'Incident follow-up review', category:'Incidents', description:'Keep follow-up actions and reviewer decisions together.', notes:'Incident reference:\nReported date:\nFollow-up actions:\nResponsible person:\nEvidence reference:\nReviewer decision:' },
  { title:'Monthly owner readiness review', category:'Monthly reviews', description:'Prepare the owner’s review of open work and evidence gaps.', notes:'Review period:\nOpen and overdue items:\nEvidence gaps:\nStaff readiness:\nOwner decisions:\nActions, owners and due dates:\nNext review:' },
  { title:'Resident documentation review', category:'Residents', description:'Review documentation completeness without clinical decision making.', notes:'Resident reference:\nDocuments reviewed:\nMissing signatures / evidence:\nFollow-up and owner:\nReviewer decision:' },
];
