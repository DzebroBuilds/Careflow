'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { pendingKey, quickbooks } from '@/lib/quickbooks';
type ReturnData={state:string;code:string;realmId:string};
export default function QuickbooksReturn() {
 const returnData=useRef<ReturnData|null>(null),returnError=useRef('');
 const [message,setMessage]=useState('Verify your QuickBooks sandbox company using your current CareFlow owner session.'),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 const captured=useRef(false),running=useRef(false);
 useEffect(()=>{
  if(captured.current)return;captured.current=true;
  const params=new URLSearchParams(window.location.search);
  window.history.replaceState(null,'',window.location.pathname);
  const state=params.get('state')||'',code=params.get('code')||'',realmId=params.get('realmId')||'';
  if(params.has('error')){if(/^[a-f0-9]{64}$/.test(state))sessionStorage.removeItem(pendingKey(state));returnError.current='Intuit authorization was cancelled. Return to CareFlow to start again.';return;}
  if(!/^[a-f0-9]{64}$/.test(state)||!code||!/^\d{1,30}$/.test(realmId)){returnError.current='This Intuit return is incomplete. Start again from CareFlow.';return;}
  returnData.current={state,code,realmId};
 },[]);
 async function finish() {
  if(running.current)return;running.current=true;setBusy(true);
  try {
   const callback=returnData.current;
   if(!callback)throw new Error(returnError.current||'Start the connection from CareFlow first.');
   const raw=sessionStorage.getItem(pendingKey(callback.state));
   if(!raw)throw new Error('The initiating browser session is missing. Start the connection again in this tab.');
   const pending=JSON.parse(raw);
   if(typeof pending.homeId!=='string'||!/^[a-f0-9]{64}$/.test(pending.verifier)||!Number.isFinite(pending.createdAt)||Date.now()-pending.createdAt>600000)throw new Error('This connection request expired. Start again from CareFlow.');
   const result=await quickbooks('complete',pending.homeId,{...callback,verifier:pending.verifier});
   sessionStorage.removeItem(pendingKey(callback.state));setDone(true);returnData.current=null;setMessage(`${result.companyName} is verified as your sandbox company. No accounting or payroll records were synchronized.`);
  }catch(e){setMessage(e instanceof Error?e.message:'Verification failed. Start again from CareFlow.');}
  finally{running.current=false;setBusy(false);}
 }
 return <main className="cf-gate"><section className="cf-panel max-w-xl"><p className="cf-eyebrow">CareFlow · Intuit sandbox</p><h1 className="mt-3 text-3xl font-semibold">{done?'Company verified':'Complete your connection'}</h1><p className="mt-5 leading-7" role="status">{message}</p><div className="mt-6 flex flex-wrap gap-3">{!done&&<button className="cf-primary" disabled={busy} onClick={()=>void finish()}>{busy?'Verifying…':'Verify sandbox company'}</button>}<Link className="cf-secondary" href="/dashboard">Return to CareFlow</Link></div></section></main>;
}
