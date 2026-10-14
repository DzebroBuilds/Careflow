'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { configured, productionEnabled, supabase } from '@/lib/supabase';
import { pilotInquiry } from '@/lib/offer';
import './account-login.css';
export default function AccountLogin(){
 const router=useRouter();const [reset,setReset]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [message,setMessage]=useState('');const [show,setShow]=useState(false);
 const enabled=configured&&productionEnabled;
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!supabase||!enabled||busy)return;
  const form=event.currentTarget;const values=new FormData(form);const email=String(values.get('email')).trim();setBusy(true);setError('');setMessage('');
  try{if(reset){
   const redirectTo=new URL(`${process.env.NEXT_PUBLIC_CAREFLOW_BASE_PATH||''}/reset-password/`,window.location.origin).href;
   const result=await supabase.auth.resetPasswordForEmail(email,{redirectTo});if(result.error)throw result.error;
   setMessage('If an account exists for this email, you will receive a password reset link.');
  }else{const result=await supabase.auth.signInWithPassword({email,password:String(values.get('password'))});if(result.error)throw result.error;form.reset();setShow(false);router.replace('/verify');}}
  catch{setError(reset?'Unable to request a reset link. Please try again later.':'Unable to sign in. Check your details or reset your password.');}finally{setBusy(false);}
 }
 return <section className="account-card" aria-labelledby="account-title"><p className="cf-eyebrow">YOUR CAREFLOW WORKSPACE</p><h2 id="account-title">{reset?'Reset your password.':'Welcome back.'}</h2><p className="account-intro">{reset?'Reset your password through your account email.':'Sign in with your individual account to continue to your dashboard.'}</p>
 {!enabled&&<p className="cf-notice" role="status">Private account access is being configured. Explore the sample dashboard below.</p>}
 <form onSubmit={submit}>{error&&<p className="cf-error" role="alert">{error}</p>}{message&&<p className="cf-notice" role="status">{message}</p>}<fieldset disabled={!enabled||busy}><label htmlFor="account-email">Work email</label><input id="account-email" name="email" type="email" className="cf-input" autoComplete="username" required maxLength={254}/>{!reset&&<><label htmlFor="account-password">Password</label><div className="account-password"><input id="account-password" className="cf-input" name="password" type={show?'text':'password'} autoComplete="current-password" required/><button type="button" aria-label={show?'Hide password':'Show password'} aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'}</button></div></>}<button className="cf-primary account-submit" type="submit">{busy?'Please wait…':reset?'Send reset link':'Sign in to dashboard'}</button></fieldset></form>
 <button type="button" disabled={busy} className="account-link" onClick={()=>{setReset(!reset);setError('');setMessage('');setShow(false);}}>{reset?'Back to sign in':'Forgot your password?'}</button><p className="account-security">Individual accounts · Authenticator verification · Administrator-managed access</p><div className="account-demo"><span>Just taking a look?</span><Link href="/demo">Open sample dashboard →</Link><small>Fictional data. No account required.</small></div><p className="account-help">Need an account? <a href={pilotInquiry}>Contact OASISWEB&amp;AI</a></p></section>;
}
