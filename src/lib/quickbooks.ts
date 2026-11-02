import { supabase, productionEnabled } from './supabase';
export const intuitEnabled=process.env.NEXT_PUBLIC_CAREFLOW_INTUIT_ENABLED==='true';
export const pendingKey=(state:string)=>`careflow-intuit-pending:${state}`;
export async function quickbooks(action:string,homeId:string,extra:Record<string,string>={}) {
 if(!intuitEnabled||!supabase||!productionEnabled)throw new Error('Intuit sandbox setup has not been activated yet.');
 const {data:{session},error:sessionError}=await supabase.auth.getSession();
 if(sessionError||!session)throw new Error('Sign in to CareFlow and complete authenticator verification first.');
 const {data,error}=await supabase.functions.invoke('careflow-quickbooks',{body:{action,homeId,...extra},headers:{Authorization:`Bearer ${session.access_token}`}});
 if(error||data?.error)throw new Error(data?.error||'QuickBooks is unavailable. Check your sign-in and sandbox setup, then retry.');
 return data;
}
export async function startQuickbooks(homeId:string) {
 const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
 const challenge=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))),n=>n.toString(16).padStart(2,'0')).join('');
 const result=await quickbooks('start',homeId,{challenge});
 const url=new URL(result.authorizationURL);
 if(url.origin!=='https://appcenter.intuit.com'||url.pathname!=='/connect/oauth2'||!/^[a-f0-9]{64}$/.test(result.state)||url.searchParams.get('state')!==result.state)throw new Error('Invalid authorization address.');
 sessionStorage.setItem(pendingKey(result.state),JSON.stringify({homeId,verifier,createdAt:Date.now()}));
 window.location.assign(url.href);
}
