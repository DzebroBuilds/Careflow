'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';
import Icon from './icon';
import './product-walkthrough.css';

const steps = [
  { label: 'Track a record', icon: 'file', title: 'A clear owner. A clear next step.', detail: 'Keep the task, responsibility, and due date together.' },
  { label: 'Review evidence', icon: 'shield', title: 'The context behind every task.', detail: 'Connect supporting evidence to the record it belongs to.' },
  { label: 'See readiness', icon: 'grid', title: 'Your priorities, brought into focus.', detail: 'See completed records and the follow-ups that need you.' },
];

export default function ProductWalkthrough() {
  const [step, setStep] = useState(0);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % steps.length : event.key === 'ArrowLeft' ? (index + steps.length - 1) % steps.length : event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setStep(next);
    tabs.current[next]?.focus();
  }
  return <div className="site-product walkthrough">
    <div className="product-top"><span className="product-dots"><i/><i/><i/></span><span>CareFlow / Maple House</span><Icon name="shield" size={14}/></div>
    <div className="walkthrough-tabs" role="tablist" aria-label="Explore the CareFlow workflow">
      {steps.map((item, index) => <button key={item.label} id={`walkthrough-tab-${index}`} role="tab" type="button" aria-selected={step === index} aria-controls={`walkthrough-panel-${index}`} tabIndex={step === index ? 0 : -1} ref={element => { tabs.current[index] = element; }} onClick={() => setStep(index)} onKeyDown={event => moveTab(event, index)}><Icon name={item.icon} size={15}/><span>{item.label}</span></button>)}
    </div>
    <div className="walkthrough-panels">{steps.map((item, index) => <section key={item.label} role="tabpanel" id={`walkthrough-panel-${index}`} aria-labelledby={`walkthrough-tab-${index}`} aria-hidden={step !== index} inert={step !== index} data-active={step === index} tabIndex={step === index ? 0 : -1} className="walkthrough-panel">
      <div className="walkthrough-scene" key={step === index ? 'active' : 'inactive'}>
        <div className="walkthrough-heading"><p className="cf-eyebrow">{index === 0 ? 'RESIDENT RECORDS' : index === 1 ? 'SUPPORTING EVIDENCE' : 'HOME READINESS'}</p><h2>{item.title}</h2><p>{item.detail}</p></div>
        {index === 0 && <div className="walkthrough-record"><div className="walkthrough-record-top"><span className="product-row-icon"><Icon name="people" size={20}/></span><span className="cf-badge purple">In review</span></div><h3>Review service-plan signatures</h3><p className="walkthrough-reference">Sample resident A · Maple House</p><dl className="walkthrough-fields"><div><dt>Assigned to</dt><dd><span className="walkthrough-initials">MA</span> Maya · Administrator</dd></div><div><dt>Due date</dt><dd><Icon name="clock" size={14}/> October 16</dd></div></dl><div className="walkthrough-note"><Icon name="file" size={16}/><span>Confirm the signed plan and add the supporting evidence before approval.</span></div></div>}
        {index === 1 && <div className="walkthrough-record"><div className="walkthrough-evidence"><span className="walkthrough-file-icon"><Icon name="file" size={26}/></span><div><h3>Service plan · sample.pdf</h3><p>Fictional attachment · PDF</p></div><span className="walkthrough-file-tag">PDF</span></div><div className="walkthrough-document" aria-label="Illustrative document preview"><span>SAMPLE DOCUMENT</span><h4>Resident service plan</h4><p>Maple House · Sample resident A</p><div className="document-line"/><div className="document-line"/><div className="document-line short"/><div className="document-signature"><Icon name="check" size={15}/> Signature evidence included</div></div><p className="walkthrough-evidence-note"><Icon name="shield" size={15}/> Evidence stays connected to its record.</p></div>}
        {index === 2 && <div className="walkthrough-readiness"><div className="product-metrics"><div><p>Evidence readiness</p><strong>82<span>%</span></strong><div className="cf-progress"><span style={{width:'82%'}}/></div><small>18 of 22 records complete</small></div><div><p>Needs attention</p><strong>04<span className="metric-orange">↗</span></strong><small>Open or waiting for review</small></div></div><div className="product-queue-heading"><h3>Next in your queue</h3><span>Assigned & organized</span></div>{[['cross','Medication review','Due this week','Open'],['people','Staff orientation','Assigned to Maya','In review']].map(([icon,title,detail,status]) => <div className="product-row" key={title}><span className="product-row-icon"><Icon name={icon} size={18}/></span><div><h4>{title}</h4><p>{detail}</p></div><span className={`cf-badge ${status === 'Open' ? 'amber' : 'purple'}`}>{status}</span></div>)}</div>}
      </div>
    </section>)}</div>
    <div className="walkthrough-footer"><span>Fictional example · {step + 1} of 3</span>{step < 2 ? <button type="button" onClick={() => { setStep(step + 1); tabs.current[step + 1]?.focus(); }}>Next: {steps[step + 1].label} <Icon name="arrow" size={14}/></button> : <Link href="/demo">Try it yourself <Icon name="arrow" size={14}/></Link>}</div>
    <p className="product-caption">Explore the workflow above. Your sample edits stay in the demo.</p>
  </div>;
}
