'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reviewAuth } from '@/lib/review-auth';
import { documentData, templateFor, type Resident } from '@/lib/residents';
import type { Entry } from '@/lib/workspace';
type Source={page:number;quote:string};
type Extraction={residentName:string;period:string;fields:({id:string;value:string}&Source)[];rows:({values:Record<string,string>}&Source)[];findings:({message:string}&Source)[]};
export default function DocumentImport({entry,file,resident,demo,onChange}:{entry:Entry;file:File|null;resident?:Resident;demo:boolean;onChange:(update:(current:Entry)=>Entry)=>void}) {
 const [consent,setConsent]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [result,setResult]=useState<{snapshot:string;file:File;value:Extraction}|null>(null);
 const snapshot=JSON.stringify([entry.home_id,entry.resident_id,entry.document_type,entry.document_period,entry.document_data]);
 const current=result&&result.snapshot===snapshot&&result.file===file?result:null;
 async function read(){
  if(!file||!resident||!supabase||demo||!consent)return;
  setBusy(true);setError('');setResult(null);setConfirmed(false);
  try{
   if(file.type!=='application/pdf'||file.size>5*1024*1024)throw new Error('Choose a PDF no larger than 5 MB.');
   const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in again.');
   const body=new FormData();body.set('file',file);body.set('homeId',entry.home_id);body.set('residentId',resident.id);body.set('type',entry.document_type||'');body.set('fictionalOnly','true');
   const response=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL||reviewAuth.url}/functions/v1/careflow-document-reader`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||reviewAuth.publishableKey},body,cache:'no-store',signal:AbortSignal.timeout(100000)});
   const value=await response.json();if(!response.ok)throw new Error(value.error||'Document reading failed.');
   setResult({snapshot,file,value});
  }catch(e){setError(e instanceof Error?e.message:'Document reading failed. Nothing was saved.');}finally{setBusy(false);}
 }
 function apply(){
  if(!current||!confirmed)return;
  const proposal=current.value;
  onChange(latest=>{
   if(JSON.stringify([latest.home_id,latest.resident_id,latest.document_type,latest.document_period,latest.document_data])!==current.snapshot)return latest;
   const data=documentData(latest.document_data);if(data.rows.length+proposal.rows.length>100)return latest;
   const fields={...data.fields};for(const field of proposal.fields)if(!fields[field.id]?.trim())fields[field.id]=field.value;
   fields.import_evidence=JSON.stringify({fields:proposal.fields,rows:proposal.rows.map(({page,quote})=>({page,quote})),findings:proposal.findings});
   fields.import_reference=`AI-assisted draft from ${file?.name}; source checked by user before applying. ${new Date().toISOString()}.`;
   return {...latest,document_data:{fields,rows:[...data.rows,...proposal.rows.map(row=>row.values)]}};
  });
  setResult(null);setConfirmed(false);
 }
 const template=templateFor(entry.document_type);
 return <section className="cf-document-checks" aria-label="AI document import"><h4>OCR document reader</h4><p>{demo?'AI imports are available only in the signed-in owner test workspace.':'Select a PDF in Attach evidence below, then request a review. The selected PDF is sent to OpenAI. Existing resident details are not sent. Up to 40 entries are proposed per review; inspect the entire original for omissions.'}</p>{!demo&&<><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/> This file contains fictional test data and I approve sending it to OpenAI.</label><button type="button" className="cf-secondary" disabled={busy||!consent||!file||!resident} onClick={read}>{busy?'Reading document…':'Read selected PDF with OCR'}</button>{!file&&<p>Select the source PDF under Attach evidence.</p>}</>}{error&&<p role="alert">{error}</p>}{current&&<div><h4>Proposed draft · verify against the original</h4><p>Printed resident: <strong>{current.value.residentName||'Not identified'}</strong><br/>Selected resident: {resident?.name}<br/>Printed month: {current.value.period||'Not identified'} · Selected month: {entry.document_period}</p>{current.value.fields.map((field,i)=><article key={i}><strong>{template?.fields.find(f=>f.id===field.id)?.label||field.id}</strong><p>{field.value}</p><small>Page {field.page}: “{field.quote}”</small></article>)}{current.value.rows.map((row,i)=><article key={i}><strong>Proposed entry {i+1}</strong>{template?.rowFields.map(field=><p key={field.id}>{field.label}: {row.values[field.id]||'Not legible / not recorded'}</p>)}<small>Page {row.page}: “{row.quote}”</small></article>)}<h4>AI review flags</h4>{current.value.findings.length?current.value.findings.map((finding,i)=><p key={i}>{finding.message}<br/><small>Page {finding.page||'not identified'}: {finding.quote}</small></p>):<p>No flags returned. This is not proof of correctness.</p>}<label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I verified the resident, month, proposed entries and source pages. Fill empty fields and append these entries to my draft.</label><p>Existing fields are preserved. Resident profiles, medication orders and approval status are never changed. Save the record separately after reviewing the draft.</p>{documentData(entry.document_data).rows.length+current.value.rows.length>100&&<p role="alert">This proposal exceeds the 100-entry limit. Use a smaller source document.</p>}<button type="button" className="cf-primary" disabled={!confirmed||documentData(entry.document_data).rows.length+current.value.rows.length>100} onClick={apply}>Apply reviewed draft</button><button type="button" className="cf-secondary" onClick={()=>setResult(null)}>Discard proposal</button></div>}</section>;
}
