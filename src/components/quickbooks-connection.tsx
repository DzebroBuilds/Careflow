'use client';
import { useState } from 'react';
import { intuitEnabled, quickbooks, startQuickbooks } from '@/lib/quickbooks';
type Status={connected:boolean;ready:boolean;companyName:string|null;verifiedAt:string|null};
export default function QuickbooksConnection({demo,owner,homeId}:{demo:boolean;owner:boolean;homeId:string}) {
 const [status,setStatus]=useState<Status|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 async function run(action:()=>Promise<void>) {if(busy)return;setBusy(true);setError('');try{await action();}catch(e){setError(e instanceof Error?e.message:'Connection failed.');}finally{setBusy(false);}}
 const enabled=!demo&&owner&&!!homeId&&intuitEnabled;
 return <section className="cf-panel mb-6" aria-labelledby="quickbooks-heading"><div className="flex items-center justify-between gap-4"><div><p className="cf-eyebrow">Finance integration · Sandbox</p><h2 id="quickbooks-heading">Intuit QuickBooks</h2></div><span className="cf-badge">{status?.connected?'Company verified':'Not connected'}</span></div>
 <p className="mt-4 text-sm leading-6">Connect a QuickBooks test company and verify its identity. Accounting and payroll synchronization are not enabled.</p>
 {demo?<p className="cf-notice mt-4">The sample workspace cannot connect to financial accounts. Use your private owner account for sandbox testing.</p>:!owner?<p className="cf-notice mt-4">The home owner manages this connection.</p>:!intuitEnabled?<p className="cf-notice mt-4">Awaiting Intuit developer app setup.</p>:null}
 {status&&<p className="mt-4 text-sm" role="status">{status.connected?`${status.companyName} · Sandbox company verified${status.verifiedAt?' on '+new Date(status.verifiedAt).toLocaleString():''}.`:status.ready?'Ready to connect your sandbox company.':'Server credentials still need setup.'}</p>}
 {error&&<p role="alert" className="cf-error mt-4">{error}</p>}
 <div className="flex flex-wrap gap-3 mt-5"><button className="cf-secondary" disabled={!enabled||busy} onClick={()=>void run(async()=>setStatus(await quickbooks('status',homeId)))}>Check connection</button><button className="cf-primary" disabled={!enabled||busy||status?.connected===true||status?.ready!==true} onClick={()=>void run(()=>startQuickbooks(homeId))}>{busy?'Working…':'Connect sandbox company'}</button>{status?.connected&&<button className="cf-secondary" disabled={busy} onClick={()=>setConfirm(true)}>Disconnect</button>}<a className="cf-secondary" href="https://developer.intuit.com/app/developer/dashboard" target="_blank" rel="noopener noreferrer">Intuit Developer portal ↗</a></div>
 {confirm&&<div className="cf-notice mt-4"><p>Revoke this sandbox company’s authorization and remove the saved credentials from CareFlow?</p><button className="cf-secondary mt-3" disabled={busy} onClick={()=>void run(async()=>{await quickbooks('disconnect',homeId);setStatus({connected:false,ready:true,companyName:null,verifiedAt:null});setConfirm(false);})}>Disconnect sandbox company</button><button className="cf-secondary ml-3" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></div>}
 </section>;
}
