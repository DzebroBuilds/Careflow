'use client';
import { useState, type CSSProperties } from 'react';
import Icon from './icon';
import { readiness, localDate, type Entry, type Category } from '@/lib/workspace';
import { residentPeriodMetrics, type Resident } from '@/lib/residents';
import type { Home } from '@/lib/workspace';
export default function DashboardOverview({records,residents,home,onGo,onCreate,writable,query}:{records:Entry[];residents:Resident[];home:Home;onGo:(section:string)=>void;onCreate:(category:Category,title?:string)=>void;writable:boolean;query:string}) {
 const [tab,setTab]=useState<'resident'|'staff'>('resident');
 const today=localDate(), period=today.slice(0,7);
 const metrics=residentPeriodMetrics(records,residents,[home],period,today);
 const residentRows=residents.filter(r=>r.home_id===home.id&&r.status==='Active').map(r=>({id:r.id,name:r.reference_code||r.name,count:metrics.slots.filter(s=>s.resident.id===r.id&&!s.reviewed).length})).filter(r=>r.count>0);
 const staff=records.filter(r=>r.category==='Staff orientation'&&r.status!=='Complete');
 const total=residentRows.reduce((n,r)=>n+r.count,0)+staff.length;
 const open=records.filter(r=>r.status!=='Complete');
 const score=readiness(records);
 const rows=(tab==='resident'?residentRows:staff.map(r=>({id:r.id,name:r.subject||r.title,count:1}))).filter(r=>r.name.toLowerCase().includes(query.toLowerCase()));
 return <div className="ct-overview">
  <section className="ct-hero" aria-label="Home status">
   <div className="ct-gauge" style={{'--score':`${(score??0)*3.6}deg`} as CSSProperties}><span>{score??'—'}<small>record readiness</small></span></div>
   <div className="ct-hero-copy"><p>{home.name}</p><h2>Your home, at a glance.</h2><div>{total} document items need attention, and {open.filter(r=>r.due_date>today).length} records are coming due.</div><small>Score shows record completion; document evidence requires human review.</small></div>
   <div className="ct-counters">{[[residents.filter(r=>r.home_id===home.id&&r.status==='Active').length,'Residents','Residents'],[records.filter(r=>r.category==='Staff orientation').length,'Staff records','Staff orientation'],[records.filter(r=>r.category==='Medication records').length,'Medication records','Medication records'],[open.length,'Open issues','Corrective actions']].map(([n,label,section])=><button key={label} onClick={()=>onGo(String(section))}><strong className={label==='Open issues'?'ct-alert-number':''}>{n}</strong><span>{label}</span></button>)}</div>
  </section>
  <div className="ct-actions" aria-label="Quick actions"><button disabled={!writable} onClick={()=>onCreate('Staff orientation')}>+ Staff member</button><button disabled={!writable} onClick={()=>onCreate('Incidents')}>+ Incident</button><button disabled={!writable} onClick={()=>onCreate('Inspection binder')}>+ Document</button><button disabled={!writable} onClick={()=>onCreate('Residents','Appointment follow-up')}>+ Appointment</button></div>
  <section className="ct-attention"><header><h2>Needs attention</h2><span className="ct-count">{total}</span></header>
   <div className="ct-tabs" role="group" aria-label="Attention category"><button aria-pressed={tab==='resident'} onClick={()=>setTab('resident')}><i/>Resident files ({residentRows.reduce((n,r)=>n+r.count,0)})</button><button aria-pressed={tab==='staff'} onClick={()=>setTab('staff')}><i/>Staff ({staff.length})</button></div>
   <div className="ct-alerts">{rows.length?rows.map(row=><details key={row.id}><summary><span className="ct-warning"><Icon name="warning"/></span><span className="ct-initials">{row.name.replace(/^DEMO-/,'').split(/[\s-]+/).map(s=>s[0]).slice(0,2).join('').toUpperCase()}</span><span>{row.name} {tab==='resident'?'resident file':'staff file'}, {row.count} {row.count===1?'document needs':'documents need'} review</span><Icon name="chevron" size={18}/></summary><div className="ct-alert-detail"><p>Open the {tab==='resident'?'Resident file':'Staff readiness'} tab to see which documents need attention.</p><button onClick={()=>onGo(tab==='resident'?'Residents':'Staff orientation')}>Open {tab==='resident'?'resident files':'staff records'} →</button></div></details>):<p className="ct-empty">{query?'No files match your search.':'No outstanding document reviews in this category.'}</p>}</div>
  </section>
 </div>;
}
