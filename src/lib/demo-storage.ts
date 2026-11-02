import { categories, type Workspace } from './workspace.ts';

// Browser storage is untrusted input, including snapshots from older demo versions.
export function parseDemoWorkspace(raw: string): Workspace {
  const value = JSON.parse(raw);
  const strings = (row: unknown, keys: string[]) => !!row && typeof row === 'object' && keys.every(key => typeof (row as Record<string, unknown>)[key] === 'string');
  if (!value || !Array.isArray(value.homes) || !Array.isArray(value.entries) || !Array.isArray(value.activity)) throw new Error('Invalid sample workspace');
  if (!value.homes.every((h: unknown) => strings(h, ['id','name','license_due','owner_id']))) throw new Error('Invalid sample homes');
  const homes = new Set(value.homes.map((h: {id: string}) => h.id));
  if (homes.size !== value.homes.length) throw new Error('Duplicate sample homes');
  if (!value.entries.every((e: Workspace['entries'][number]) => strings(e, ['id','home_id','title','subject','assignee','due_date','notes','updated_at']) && homes.has(e.home_id) && categories.includes(e.category) && ['Open','In review','Complete'].includes(e.status) && ['Normal','High'].includes(e.priority))) throw new Error('Invalid sample records');
  if (!value.activity.every((a: Workspace['activity'][number]) => strings(a, ['id','home_id','action','created_at']) && homes.has(a.home_id))) throw new Error('Invalid sample history');
  if (value.residents !== undefined && (!Array.isArray(value.residents) || !value.residents.every((r: NonNullable<Workspace['residents']>[number]) => strings(r, ['id','home_id','name','reference_code','admission_date','applicability_notes']) && homes.has(r.home_id) && ['Active','Archived'].includes(r.status) && Array.isArray(r.document_types) && r.document_types.every(t => ['mar','progress','behavior'].includes(t))))) throw new Error('Invalid sample residents');
  return value;
}
