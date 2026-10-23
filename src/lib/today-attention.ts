import { requirementId } from './compliance.ts';
import { isOverdue, type Entry } from './workspace.ts';

export type AttentionFilter = 'all' | 'overdue' | 'today' | 'incident' | 'review' | 'evidence' | 'owner';
export function todayAttention(entries: Entry[], homeId: string, today: string) {
  return entries.filter(entry => entry.home_id === homeId && entry.status !== 'Complete').map(entry => {
    const reasons: {id: Exclude<AttentionFilter, 'all'>; label: string}[] = [];
    if (isOverdue(entry, today)) reasons.push({id:'overdue', label:'Overdue'});
    if (entry.due_date === today) reasons.push({id:'today', label:'Due today'});
    if (entry.category === 'Incidents') reasons.push({id:'incident', label:'Incident follow-up'});
    if (entry.status === 'In review') reasons.push({id:'review', label:'Awaiting approval'});
    if ((entry.document_type || requirementId(entry)) && !entry.evidence_path) reasons.push({id:'evidence', label:'Missing evidence'});
    if (!entry.assignee.trim()) reasons.push({id:'owner', label:'Needs an owner'});
    return {entry, reasons};
  }).filter(row => row.reasons.length).sort((a,b) =>
    Number(b.reasons.some(r=>r.id==='overdue')) - Number(a.reasons.some(r=>r.id==='overdue')) ||
    Number(b.entry.priority==='High') - Number(a.entry.priority==='High') ||
    (a.entry.due_date || '9999').localeCompare(b.entry.due_date || '9999') || a.entry.title.localeCompare(b.entry.title) || a.entry.id.localeCompare(b.entry.id));
}
