'use client';
import { useState } from 'react';
import type { RecordTemplate } from '@/lib/dashboard';

const source = 'https://oregonisp.org/forms/support-docs/';
const protocolInstructions = 'https://oregonisp.org/wp-content/uploads/2023/05/Protocol-instructions.pdf';
const financialInstructions = 'https://oregonisp.org/wp-content/uploads/2023/04/Financial-Plan-instructions.pdf';
const forms = [
  { name:'General Protocol', code:'SDS 4120', file:'de4120', group:'General', description:'A blank protocol for documenting individualized support.', instructions:protocolInstructions },
  { name:'Financial Plan', code:'SDS 4121', file:'de4121', group:'Financial', description:'Document the person’s financial support arrangements.', instructions:financialInstructions },
  ...[['Aspiration / Choking','a'],['Seizures','b'],['Constipation','c'],['Dehydration','d'],['Pica','e']].map(([name,suffix])=>({name,code:`SDS 4120${suffix}`,file:`de4120${suffix}`,group:'Issue-specific',description:'Personalize the protocol to the person’s needs, abilities, and support preferences.',instructions:protocolInstructions})),
];
function ExternalLink({href,children,className}:{href:string;children:React.ReactNode;className?:string}) { return <a href={href} className={className} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>; }

export default function SupportDocuments({writable,onTemplate}:{writable:boolean;onTemplate:(template:RecordTemplate)=>void}) {
  const [search,setSearch] = useState('');
  const [group,setGroup] = useState('All');
  const shown=forms.filter(f=>(group==='All'||f.group===group)&&`${f.name} ${f.code}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="cf-panel">
    <div className="cf-list-header"><div><p className="cf-eyebrow">Oregon ISP · ODDS resources</p><h2>Support that starts with the person</h2><p className="cf-subtitle">Blank PDF forms for individual support planning. Record the person’s preferences and what they do independently, then tailor the support they need.</p></div><span className="cf-badge green">7 source forms</span></div>
    <p className="cf-agenda-note">These are external ODDS support resources, listed as 2017 versions on Oregon ISP. Review their suitability for the person and your program with the responsible team. Opening a form does not create a resident record or mark it approved.</p>
    <div className="cf-document-tools"><label>Find a document<input className="cf-input" type="search" placeholder="Name or form number…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Document type<select className="cf-input" value={group} onChange={e=>setGroup(e.target.value)}>{['All','General','Financial','Issue-specific'].map(g=><option key={g}>{g}</option>)}</select></label><p role="status">{shown.length} of {forms.length} documents</p></div>
    <div className="cf-template-grid">{shown.map(form=>{const pdf=`https://sharedsystems.dhsoha.state.or.us/DHSForms/Served/${form.file}.pdf`;return <article className="cf-template" key={form.file}><p className="cf-eyebrow">{form.group} · {form.code}</p><h3>{form.name}</h3><p>{form.description}</p><span className="cf-document-version">PDF · 2017 version</span><div className="cf-document-actions"><ExternalLink href={pdf} className="cf-primary">Open PDF ↗</ExternalLink><ExternalLink href={form.instructions} className="cf-secondary">Instructions ↗</ExternalLink></div><button className="cf-document-followup" disabled={!writable} onClick={()=>onTemplate({title:`Review support document · ${form.name}`,category:'Residents',description:'Track a support document review.',notes:`Document: ${form.name} (${form.code})\nBlank source form: ${pdf}\nInstructions: ${form.instructions}\nResident reference:\nPerson’s support preferences:\nWhat the person does independently:\nIndividualized support / evidence reference:\nResponsible reviewer:\nFollow-up and next review date:`})}>+ Track a document review</button></article>;})}</div>
    {!shown.length&&<div className="cf-empty"><h3>No matching documents</h3><p>Try another name, form number, or document type.</p><button className="cf-secondary" onClick={()=>{setSearch('');setGroup('All');}}>Clear filters</button></div>}
    <div className="cf-support-resources"><h3>Help & training</h3><p>For fillable forms that do not display correctly, download the PDF and open it in Adobe Acrobat Reader. Completed forms are handled separately from this blank-form library.</p><div className="cf-document-actions"><ExternalLink href="https://oregonisp.org/forms/adobe/">PDF viewing help ↗</ExternalLink><ExternalLink href="https://oregonisp.org/webinars/introduction-to-new-issue-specific-protocols-and-isp-qa/">2017 protocol webinar ↗</ExternalLink><ExternalLink href="https://oregonisp.org/wp-content/uploads/2017/11/2017-11-28-SLIDES-Protocols-and-QandA.pdf">Webinar slides (PDF) ↗</ExternalLink><ExternalLink href={source}>Oregon ISP source library ↗</ExternalLink></div><p className="cf-document-version">Source listing checked October 14, 2026. Files remain hosted by their publishers.</p></div>
  </section>;
}
