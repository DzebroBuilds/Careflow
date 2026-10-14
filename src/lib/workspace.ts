export const categories = ['Residents', 'Staff orientation', 'Medication records', 'Incidents', 'Inspection binder', 'Corrective actions', 'Monthly reviews'] as const;
export type Category = typeof categories[number];
export type Status = 'Open' | 'In review' | 'Complete';
export type Home = { id: string; name: string; license_due: string; owner_id: string };
export type Entry = { id: string; home_id: string; category: Category; title: string; subject: string; assignee: string; due_date: string; priority: 'Normal' | 'High'; status: Status; notes: string; evidence_path: string | null; evidence_name: string | null; updated_at: string };
export type Activity = { id: string; home_id: string; action: string; created_at: string; actor_id: string | null };
export type Workspace = { homes: Home[]; entries: Entry[]; activity: Activity[] };
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function isOverdue(entry: Entry, today = localDate()) { return entry.status !== 'Complete' && !!entry.due_date && entry.due_date < today; }
export function readiness(entries: Entry[]) { return entries.length ? Math.round(entries.filter(e => e.status === 'Complete').length / entries.length * 100) : null; }
export function sampleWorkspace(): Workspace {
  const date = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return localDate(d); };
  const homes: Home[] = [{id:'sample-maple',name:'Maple Grove Home',license_due:date(36),owner_id:'demo'}, {id:'sample-cedar',name:'Cedar House',license_due:date(74),owner_id:'demo'}];
  const examples: [Category,string,string,Status,number][] = [
    ['Residents','Review service-plan signatures','Sample resident A','Open',4],
    ['Staff orientation','Approve pre-service orientation','Sample staff A','In review',2],
    ['Medication records','Resolve shift documentation exception','Sample shift review','Open',-1],
    ['Incidents','Review incident follow-up','Sample incident 001','In review',0],
    ['Inspection binder','Review emergency drill evidence','Quarterly emergency drill','Complete',-3],
    ['Corrective actions','Submit follow-up evidence','Sample finding 001','Open',5],
    ['Monthly reviews','Monthly owner readiness review','Owner review','Open',7],
    ['Residents','Verify resident agreement acknowledgement','Sample resident B','Complete',1],
    ['Inspection binder','Review policy revision register','Policy binder','Complete',10],
  ];
  return { homes, entries: examples.map(([category,title,subject,status,offset],i)=>({id:`sample-${i}`,home_id:i===7?'sample-cedar':'sample-maple',category,title,subject,assignee:i%2?'Administrator':'Owner',due_date:date(offset),priority:offset<=0?'High':'Normal',status,notes:'Fictional sample for testing the workflow. Replace with sample information only.',evidence_path:null,evidence_name:null,updated_at:new Date().toISOString()})),activity:[] };
}
export function csvCell(value: unknown) { let s = String(value ?? ''); if (/^[\s]*[=+@-]/.test(s)) s = `'${s}`; return `"${s.replaceAll('"','""')}"`; }
export function reviewCsv(home: Home, entries: Entry[]) {
  const rows = [['CareFlow review packet',home.name],['Generated',new Date().toISOString()],['Record completion',readiness(entries)===null?'No records':`${readiness(entries)}%`],[],['Area','Task','Subject','Assignee','Due','Priority','Status','Notes','Evidence file'],...entries.map(e=>[e.category,e.title,e.subject,e.assignee,e.due_date,e.priority,e.status,e.notes,e.evidence_name??''])];
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
