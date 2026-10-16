'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './icon';
import { supabase } from '@/lib/supabase';
import { reviewAuth } from '@/lib/review-auth';
import './manager-chat.css';

type Message={role:'user'|'assistant';text:string};
type Activity={type:string;text:string};
const specialists=[['Selam','HR','Training and staff-file follow-up'],['Hana','Clinical documentation','Note completeness and clinician handoffs'],['Meron','Documentation','Signatures, versions, and evidence'],['Tesfaye','Quality review','Corrective actions and review gaps']];
export default function ManagerChat({homeId='',homeName,allowed=false,demo=false}:{homeId?:string;homeName:string;allowed?:boolean;demo?:boolean}){
  const [messages,setMessages]=useState<Message[]>([]);
  const [prompt,setPrompt]=useState('');const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');const [error,setError]=useState('');
  const [activity,setActivity]=useState<Activity[]>([]);const [delegations,setDelegations]=useState(0);
  const request=useRef<AbortController|null>(null);const end=useRef<HTMLDivElement>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest',behavior:'auto'});},[messages]);
  async function send(event:React.FormEvent){
    event.preventDefault();if(busy||!allowed||demo||!confirmed||!prompt.trim()||!supabase)return;
    const text=prompt.trim();const history=messages.slice(-8).map(m=>({...m,text:m.text.slice(0,6000)}));
    setBusy(true);setError('');setStatus('Connecting to Dawit…');setActivity([]);setDelegations(0);
    const controller=new AbortController();request.current=controller;
    let gotResult=false;
    try{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session)throw new Error('Sign in to CareFlow again.');
      const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL||reviewAuth.url}/functions/v1/careflow-manager`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||reviewAuth.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({homeId,message:text,history,fictionalOnly:true}),signal:controller.signal,cache:'no-store'});
      if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(typeof body.error==='string'?body.error:`Manager connection failed (${response.status}).`);}
      if(!response.body)throw new Error('No response stream was returned.');
      const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let size=0;
      function accept(line:string){if(!line.trim())return;const item=JSON.parse(line);
        if(item.type==='status'&&typeof item.text==='string')setStatus(item.text);
        if(item.type==='activity'&&typeof item.item?.text==='string')setActivity(old=>[...old,item.item].slice(-8));
        if(item.type==='error')throw new Error(typeof item.text==='string'?item.text:'Manager request failed.');
        if(item.type==='result'&&typeof item.reply==='string'){
          gotResult=true;setMessages(old=>[...old,{role:'user',text},{role:'assistant',text:item.reply}].slice(-16) as Message[]);setPrompt('');setStatus('Manager review complete. Proposed actions still need your review.');setDelegations(Number(item.delegations)||0);
        }
      }
      try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>200000)throw new Error('Response exceeded the display limit.');buffer+=decoder.decode(value,{stream:true});let at;while((at=buffer.indexOf('\n'))!==-1){accept(buffer.slice(0,at));buffer=buffer.slice(at+1);}}buffer+=decoder.decode();if(buffer.trim())accept(buffer);if(!gotResult)throw new Error('The response ended before the manager completed its review.');}
      finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
    }catch(e){if(controller.signal.aborted)setStatus('Request stopped. No external action was requested.');else{setError(e instanceof Error?e.message:'Unable to reach the manager.');setStatus('');}}
    finally{setBusy(false);request.current=null;}
  }
  return <section className="manager-hub" aria-label="Dawit AI manager">
    <header className="manager-intro"><div className="manager-avatar"><Icon name="home" size={26}/></div><div><p className="cf-eyebrow">YOUR LEAD AI / OWNER TESTING</p><h2>Dawit, your AI manager</h2><p>Give Dawit a goal. He can delegate analysis to specialist assistants, review their results, and bring you one action plan.</p></div><span className="manager-mode">{demo?'Preview only':'OpenAI · test workspace'}</span></header>
    <div className="manager-team" aria-label="Specialists coordinated by Dawit">{specialists.map(([name,role,scope])=><article key={name}><strong>{name}</strong><span>{role}</span><p>{scope}</p></article>)}</div>
    <div className="manager-boundary"><strong>{homeName} · fictional prompts only</strong><p>Your prompts and recent chat are sent to OpenAI when you press Ask Dawit. Existing records, Google files, and attachments are not included. AI assignments are analytical work; real messages, record changes, and clinical decisions require a person. Chat clears when you leave this screen.</p></div>
    {demo?<div className="cf-notice">Live AI is disabled in the public demo. <Link href="/login">Sign in to your owner test account →</Link></div>:!allowed?<div className="cf-notice">Select a home with owner or administrator access to use the manager.</div>:null}
    <div className="manager-conversation" role="log" aria-label="Conversation with Dawit" aria-live="polite">{messages.length?messages.map((m,i)=><article className={`manager-message ${m.role}`} key={i}><strong>{m.role==='user'?'You':'Dawit · Manager'}</strong><div>{m.text}</div></article>):<div className="manager-welcome"><h3>What would you like the team to work on?</h3><p>Ask for a review, a prioritized plan, or help dividing work between the specialists.</p><button type="button" className="cf-secondary" disabled={busy} onClick={()=>setPrompt('Fictional example: Staff A is missing a training certificate and Sample Resident B has an unsigned plan. Ask Selam and Meron to review their areas, then give me a prioritized follow-up plan.')}>Try a fictional team review</button></div>}<div ref={end}/></div>
    {activity.length>0&&<section className="manager-activity" aria-label="Actual AI delegation"><h3>Team assignments</h3>{activity.map((a,i)=><p key={i}><Icon name="arrow" size={14}/>{a.text}</p>)}{!busy&&<small>{delegations} specialist assignment{delegations===1?'':'s'} observed in the completed run.</small>}</section>}
    {status&&<p className="manager-status" role="status">{status}</p>}{error&&<p className="cf-error" role="alert">{error}</p>}
    <form onSubmit={send}><label htmlFor="manager-prompt">Your prompt for Dawit</label><textarea className="cf-input" id="manager-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={4000} rows={4} disabled={busy} placeholder="Ask the manager to review a fictional scenario or coordinate the team…"/><div className="manager-controls"><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy}/> This prompt contains fictional information only.</label><span>{prompt.length}/4,000</span></div><div className="manager-actions"><button className="cf-secondary" type="button" disabled={busy||!messages.length} onClick={()=>{setMessages([]);setActivity([]);setStatus('');setError('');setDelegations(0);}}>New conversation</button>{busy?<button className="cf-secondary" type="button" onClick={()=>request.current?.abort()}>Stop request</button>:<button className="cf-primary" type="submit" disabled={!allowed||demo||!confirmed||!prompt.trim()}>Ask Dawit <Icon name="arrow" size={16}/></button>}</div></form>
  </section>;
}
