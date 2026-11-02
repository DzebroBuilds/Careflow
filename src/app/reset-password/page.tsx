'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
import { supabase,productionEnabled,authReturnType } from '@/lib/supabase';
export default function ResetPassword(){
 const router=useRouter();const [ready,setReady]=useState(false);const [loading,setLoading]=useState(!!supabase&&productionEnabled);const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;if(!supabase||!productionEnabled)return;
 const markFlow=()=>sessionStorage.setItem('careflow-password-flow',String(Date.now()));
 if(authReturnType==='invite'||authReturnType==='recovery')markFlow();
 async function check(){try{const started=Number(sessionStorage.getItem('careflow-password-flow'));if(!started||Date.now()-started>15*60*1000)return;const result=await supabase!.auth.getUser();if(active)setReady(!result.error&&!!result.data.user);}catch{if(active)setMessage('Unable to verify your link. Request a new one.');}finally{if(active)setLoading(false);}}
 const {data:{subscription}}=supabase.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'){markFlow();setTimeout(()=>void check(),0);}else if(event==='SIGNED_OUT')setReady(false);});
 void check();return()=>{active=false;subscription.unsubscribe();};},[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!supabase||!ready||busy)return;const form=event.currentTarget;const values=new FormData(form);const password=String(values.get('password'));if(password!==values.get('confirm')){setMessage('Passwords do not match.');return;}setBusy(true);setMessage('');try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;form.reset();sessionStorage.removeItem('careflow-password-flow');const signedOut=await supabase.auth.signOut();if(signedOut.error)throw signedOut.error;router.replace('/login');}catch{setMessage('Could not finish the password update. Request a fresh link or retry signing in.');}finally{setBusy(false);}}
 return <main className="cf-gate"><div className="cf-panel cf-auth"><Link href="/" className="cf-brand">CareFlow</Link><h1>Choose your password</h1>{message&&<p role="alert" className="cf-error">{message}</p>}{loading?<p role="status">Checking your secure link…</p>:ready?<form onSubmit={submit}><label>New password<input name="password" className="cf-input" type="password" minLength={12} required autoComplete="new-password"/></label><label>Confirm password<input name="confirm" className="cf-input" type="password" minLength={12} required autoComplete="new-password"/></label><p className="text-xs text-[#718177]">Use at least 12 characters. Choose a password you do not use elsewhere.</p><button className="cf-primary" disabled={busy}>{busy?'Saving…':'Save password'}</button></form>:<p className="mt-5 text-sm leading-7">Open the invitation or password reset link from your email in this browser. If it has expired, <Link className="underline" href="/login">request a new reset link</Link>.</p>}<p className="mt-6 text-xs text-[#718177]">Developed by OASISWEB&amp;AI</p></div></main>;
}
