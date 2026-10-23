'use client';
import { useState } from 'react';
import { todayAttention, type AttentionFilter } from '@/lib/today-attention';
import { localDate, type Entry } from '@/lib/workspace';
import './today-attention.css';

const filters: {id:AttentionFilter; label:string}[] = [{id:'all',label:'All attention'},{id:'overdue',label:'Overdue'},{id:'today',label:'Due today'},{id:'incident',label:'Incidents'},{id:'review',label:'Approvals'},{id:'evidence',label:'Missing evidence'},{id:'owner',label:'Unassigned'}];
export default function TodayAttention({entries,homeId,homeName,onOpen}:{entries:Entry[];homeId:string;homeName:string;onOpen:(entry:Entry)=>void}) {
  const [filter,setFilter]=useState<AttentionFilter>('all');
  const [expanded,setExpanded]=useState(false);
  const today=localDate();
  const rows=todayAttention(entries,homeId,today);
  const matched=rows.filter(row=>filter==='all'||row.reasons.some(reason=>reason.id===filter));
  const visible=expanded?matched:matched.slice(0,6);
  return <section className="cf-panel cf-today" aria-labelledby="today-heading">
    <div className="cf-today-heading"><div><p className="cf-eyebrow">{homeName} · {new Date(today+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})}</p><h2 id="today-heading">Needs attention today</h2><p>Open a task to review its details, assign an owner, or update the next step.</p></div><span className="cf-today-total">{rows.length} tasks</span></div>
    <div className="cf-today-filters" role="group" aria-label="Filter attention tasks">{filters.map(item=><button key={item.id} aria-pressed={filter===item.id} onClick={()=>{setFilter(item.id);setExpanded(false);}}>{item.label}<span>{rows.filter(row=>item.id==='all'||row.reasons.some(reason=>reason.id===item.id)).length}</span></button>)}</div>
    <p className="cf-today-summary" role="status">{matched.length?`Showing ${visible.length} of ${matched.length} tasks. Tasks can appear in more than one filter.`:rows.length?'No tasks match this filter.':'No attention flags on unfinished records for this home.'}</p>
    <div className="cf-today-list">{visible.map(({entry,reasons})=><article key={entry.id} className="cf-today-task"><div><p className="cf-record-area">{entry.category}</p><h3>{entry.title}</h3><div className="cf-today-reasons">{reasons.map(reason=><span key={reason.id} className={reason.id==='overdue'?'is-overdue':''}>{reason.label}</span>)}</div><p className="cf-today-owner">Owner: <strong>{entry.assignee.trim()||'Unassigned'}</strong> · {entry.due_date?`Due ${new Date(entry.due_date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:'No due date'}{entry.priority==='High'?' · High priority':''}</p></div><button className="cf-secondary" aria-label={`Open task: ${entry.title}`} onClick={()=>onOpen(entry)}>Open task →</button></article>)}</div>
    {matched.length>6&&<button className="cf-secondary cf-today-more" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'Show fewer tasks':`Show all ${matched.length} tasks`}</button>}
    <p className="cf-today-note">Based on unfinished records in this home. Missing evidence applies to linked checklist and resident documents. This view does not monitor clinical emergencies or verify staffing coverage.</p>
  </section>;
}
