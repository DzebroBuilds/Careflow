import { assessRecord, houseCompliance, requirementId, requirements } from './compliance.ts';
import { isOverdue, type Entry, type Home } from './workspace.ts';

export function metricRows(entries:Entry[], homes:Home[], today:string) {
  const allowed=new Map(homes.map(home=>[home.id,home]));
  return entries.filter(entry=>allowed.has(entry.home_id)).map(entry=>{
    const requirement=requirements.find(item=>item.id===requirementId(entry)&&item.category===entry.category);
    const assessment=assessRecord(entry,today);
    return {entry,home:allowed.get(entry.home_id)!,requirement,assessment,overdue:isOverdue(entry,today),reviewNeeded:!assessment.reviewed};
  }).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||Number(a.assessment.attached)-Number(b.assessment.attached)||a.entry.title.localeCompare(b.entry.title));
}

export function complianceMetrics(entries:Entry[],homes:Home[],today:string) {
  const rows=metricRows(entries,homes,today);
  const houses=homes.map(home=>{
    const result=houseCompliance(entries,home.id,today);
    const records=rows.filter(row=>row.home.id===home.id);
    return {home,...result,rawScore:result.items.reduce((sum,item)=>sum+item.raw,0)/requirements.length,
      linkedTypes:result.items.filter(item=>item.records.length>0).length,
      fileTypes:result.items.filter(item=>item.records.some(entry=>assessRecord(entry,today).attached)).length,
      reviewedTypes:result.items.filter(item=>item.records.length>0&&item.records.every(entry=>assessRecord(entry,today).attached&&assessRecord(entry,today).reviewed)).length,
      records:records.length,files:new Set(records.filter(row=>row.assessment.attached).map(row=>row.entry.evidence_path)).size,
      missingFiles:records.filter(row=>!row.assessment.attached).length,
      reviewNeeded:records.filter(row=>row.reviewNeeded).length,overdue:records.filter(row=>row.overdue).length,
      unlinked:records.filter(row=>!row.requirement).length};
  });
  const sum=(field:'linkedTypes'|'fileTypes'|'reviewedTypes'|'records'|'files'|'missingFiles'|'reviewNeeded'|'overdue'|'unlinked')=>houses.reduce((total,house)=>total+house[field],0);
  return {houses,rows,score:houses.length?Math.round(houses.reduce((total,house)=>total+house.rawScore,0)/houses.length):null,
    requiredTypes:homes.length*requirements.length,linkedTypes:sum('linkedTypes'),fileTypes:sum('fileTypes'),reviewedTypes:sum('reviewedTypes'),
    records:sum('records'),files:new Set(rows.filter(row=>row.assessment.attached).map(row=>row.entry.evidence_path)).size,missingFiles:sum('missingFiles'),reviewNeeded:sum('reviewNeeded'),overdue:sum('overdue'),unlinked:sum('unlinked')};
}

export type MetricFilter='all'|'missing'|'unlinked'|'review'|'overdue';
export function filterMetricRows(rows:ReturnType<typeof metricRows>,filter:MetricFilter,query:string) {
  const term=query.trim().toLowerCase();
  return rows.filter(row=>(filter==='all'||filter==='missing'&&!row.assessment.attached||filter==='unlinked'&&!row.requirement||filter==='review'&&row.reviewNeeded||filter==='overdue'&&row.overdue)&&[row.entry.title,row.entry.evidence_name,row.home.name,row.requirement?.name,row.entry.subject,row.entry.assignee].filter(Boolean).join(' ').toLowerCase().includes(term));
}
