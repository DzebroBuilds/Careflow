'use client';
import { useState } from 'react';
import { localDate, isOverdue, type Entry, type Home } from '@/lib/workspace';
import { residentPeriodMetrics, templateFor, validPeriod, type Resident } from '@/lib/residents';
import { documentCatalog, documentDashboard, documentDefinition, documentGroup, type DocumentGroup, type DocumentDefinition } from '@/lib/document-dashboard';
import './document-dashboard.css';

type Props={records:Entry[];residents:Resident[];home:Home;onGo:(section:string)=>void;onOpen:(entry:Entry)=>void;onTrack:(definition:DocumentDefinition)=>void;writable:boolean};
type View='open'|'overdue'|'review'|'noFile'|'all';
export default function DocumentDashboard({records,residents,home,onGo,onOpen,onTrack,writable}:Props) {
  const today=localDate();
  const [period,setPeriod]=useState(today.slice(0,7));
  const [selected,setSelected]=useState<DocumentGroup|'other'>('plans');
  const [view,setView]=useState<View>('open');
  const [search,setSearch]=useState('');
  const data=documentDashboard(records,home.id,today);
  const metrics=residentPeriodMetrics(data.records,residents,[home],period,today);
  const catalog=documentCatalog.filter(item=>item.group===selected&&item.name.toLowerCase().includes(search.toLowerCase()));
  const groupRows=data.records.filter(entry=>documentGroup(entry)===selected&&`${entry.title} ${entry.subject} ${entry.assignee}`.toLowerCase().includes(search.toLowerCase()));
  const queue=(view==='all'?data.records:data[view]).filter(entry=>`${entry.title} ${entry.subject} ${entry.assignee}`.toLowerCase().includes(search.toLowerCase()));
  const pending=metrics.slots.filter(slot=>!slot.reviewed);
  const monthLabel=new Date(`${period}-15T12:00:00`).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const groupName=data.groups.find(group=>group.id===selected)?.name||'Other tracked records';
  const chooseView=(next:View)=>{setView(next);document.getElementById('document-work-queue')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});};
  return <div className="doc-dashboard">
    <div className="doc-intro"><p>{home.name} · Documents and follow-up in one place</p><button onClick={()=>onGo('Residents')}>Open resident files <span aria-hidden="true">↗</span></button></div>
    <section className="doc-totals" aria-label="Document work summary">
      {([{label:'Tracked records',value:data.records.length,target:'all',caption:'Across this home'}, {label:'Overdue',value:data.overdue.length,target:'overdue',caption:'Open records past their due date'}, {label:'Awaiting review',value:data.review.length,target:'review',caption:'Ready for a reviewer'}, {label:'Without an evidence file',value:data.noFile.length,target:'noFile',caption:'Tracked records with no attachment'}] as const).map(item=><button key={item.target} onClick={()=>chooseView(item.target)}><span>{item.label}</span><strong className={item.target==='overdue'&&item.value?'doc-negative':''}>{item.value}</strong><small>{item.caption}</small></button>)}
    </section>
    <div className="doc-section-heading"><div><h2>Document workspace</h2><p>Choose a group to see its documents and tracked records.</p></div><label className="doc-search"><span className="sr-only">Search document names and records</span><input type="search" placeholder="Search documents or people…" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>
    <div className="doc-workspace">
      <nav className="doc-groups" aria-label="Document groups">{data.groups.map(group=><button key={group.id} aria-pressed={selected===group.id} onClick={()=>setSelected(group.id)}><span><strong>{group.name}</strong><small>{group.description}</small></span><span className="doc-group-count">{group.records.length}<small>tracked</small></span></button>)}{data.other.length>0&&<button aria-pressed={selected==='other'} onClick={()=>setSelected('other')}><span><strong>Other tracked records</strong><small>Existing work without a document type.</small></span><span className="doc-group-count">{data.other.length}<small>tracked</small></span></button>}</nav>
      <section className="doc-library" aria-label={groupName}><header><h3>{groupName}</h3><span>{groupRows.length} tracked</span></header>
        {selected==='monthly'&&<p className="doc-context">Complete MARs, progress notes, and behavior worksheets in <button onClick={()=>onGo('Residents')}>resident files ↗</button>. Track supporting evidence for the other document types below.</p>}
        <div className="doc-type-list">{catalog.map(item=>{const linked=groupRows.filter(entry=>documentDefinition(entry)?.id===item.id);return <div key={item.id}><span>{item.name}<small>{linked.length?`${linked.length} tracked record${linked.length===1?'':'s'}`:'No tracked records'}</small></span><button disabled={!writable} onClick={()=>onTrack(item)} aria-label={`Track ${item.name}`}>+ Track</button></div>;})}</div>
        {!catalog.length&&selected!=='other'&&<p className="doc-empty">No document types match “{search}”.</p>}
        {groupRows.length>0&&<div className="doc-linked"><h4>Tracked in this group</h4>{groupRows.map(entry=><button key={entry.id} onClick={()=>onOpen(entry)}><span>{entry.title}<small>{entry.subject||'No person / home reference'} · {entry.assignee||'Unassigned'}</small></span><span className={isOverdue(entry,today)?'doc-negative':''}>{isOverdue(entry,today)?'Overdue':entry.status} <span aria-hidden="true">↗</span></span></button>)}</div>}
        <p className="doc-footnote">Add a record to assign an owner, attach evidence, and track review. A document listed here is not automatically required for every resident.</p>
      </section>
    </div>
    <div className="doc-lower">
      <section className="doc-panel doc-queue" id="document-work-queue"><header><div><h2>Work queue</h2><p>Open a record to review its evidence or follow-up.</p></div><label><span className="sr-only">Work queue status</span><select value={view} onChange={event=>setView(event.target.value as View)}><option value="open">Open work</option><option value="overdue">Overdue</option><option value="review">Awaiting review</option><option value="noFile">No evidence file</option><option value="all">All records</option></select></label></header>
        <p className="doc-result-count" role="status">{queue.length} matching record{queue.length===1?'':'s'}</p>
        {queue.length?queue.slice(0,6).map(entry=><button className="doc-queue-row" key={entry.id} onClick={()=>onOpen(entry)}><span><strong>{entry.title}</strong><small>{entry.subject||entry.category} · {entry.assignee||'Unassigned'}</small></span><span><small>{entry.due_date?new Date(`${entry.due_date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric'}):'No due date'}</small><span className={isOverdue(entry,today)?'doc-negative':''}>{isOverdue(entry,today)?'Overdue':entry.status}</span></span></button>):<p className="doc-empty">{search?'No records match this search and status.':'No records in this view.'}</p>}
        {queue.length>6&&<details className="doc-more"><summary>Show {queue.length-6} more record{queue.length-6===1?'':'s'}</summary>{queue.slice(6).map(entry=><button className="doc-queue-row" key={entry.id} onClick={()=>onOpen(entry)}><span>{entry.title}<small>{entry.subject||entry.category} · {entry.assignee||'Unassigned'}</small></span><span>{entry.status} ↗</span></button>)}</details>}
      </section>
      <section className="doc-panel doc-monthly"><header><div><h2>Monthly resident files</h2><p>{monthLabel}</p></div><label><span className="sr-only">Reporting month</span><input type="month" value={period} onChange={event=>{if(validPeriod(event.target.value))setPeriod(event.target.value);}}/></label></header>
        <div className="doc-month-progress"><strong>{metrics.reviewed}<span> / {metrics.expected}</span></strong><span>monthly documents have reviewed evidence</span><progress value={metrics.reviewed} max={metrics.expected||1} aria-label="Monthly documents with reviewed evidence"/></div>
        {pending.length?pending.slice(0,4).map(slot=><button className="doc-slot" key={`${slot.resident.id}-${slot.type}`} onClick={()=>slot.records.length?onOpen(slot.records[0]):onGo('Residents')}><span>{slot.resident.reference_code||slot.resident.name}<small>{templateFor(slot.type)?.name}</small></span><span>{!slot.records.length?'Not started':!slot.hasFile?'Needs evidence':'Needs review'} <span aria-hidden="true">↗</span></span></button>):<p className="doc-empty">{metrics.expected?'All configured monthly monthly documents have reviewed evidence.':'No monthly document requirements configured for this period.'}</p>}
        <button className="doc-text-button" onClick={()=>onGo('Residents')}>Open monthly resident documents ↗</button><p className="doc-footnote">Based on each active resident’s configured MAR, progress, and behavior requirements.</p>
      </section>
    </div>
  </div>;
}
