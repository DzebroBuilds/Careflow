import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createHandler } from './connection.mjs';

const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked<T>({data,error}:{data:T;error:unknown}):T {if(error)throw new Error('Storage unavailable.');return data;}
const store={
 async connection(owner:string) {return checked(await admin.from('quickbooks_connections').select('*').eq('owner_id',owner).eq('environment','sandbox').maybeSingle());},
 async saveAttempt(attempt:Record<string,string>) {checked(await admin.from('quickbooks_oauth_attempts').upsert(attempt,{onConflict:'owner_id'}));},
 async takeAttempt(owner:string,state:string,challenge:string,after:string) {return checked(await admin.from('quickbooks_oauth_attempts').delete().eq('owner_id',owner).eq('state_hash',state).eq('challenge',challenge).gt('expires_at',after).select('owner_id').maybeSingle());},
 async saveConnection(connection:Record<string,string>) {checked(await admin.from('quickbooks_connections').insert(connection));},
 async removeConnection(owner:string,lease:string) {checked(await admin.from('quickbooks_connections').delete().eq('owner_id',owner).eq('environment','sandbox').eq('sync_lock_id',lease));},
 async acquireConnection(owner:string,lease:string,until:string,after:string) {return checked(await admin.from('quickbooks_connections').update({sync_lock_id:lease,sync_lock_until:until}).eq('owner_id',owner).eq('environment','sandbox').or(`sync_lock_until.is.null,sync_lock_until.lt.${after}`).select('*').maybeSingle());},
 async releaseConnection(owner:string,lease:string) {checked(await admin.from('quickbooks_connections').update({sync_lock_id:null,sync_lock_until:null}).eq('owner_id',owner).eq('environment','sandbox').eq('sync_lock_id',lease));},
 async saveRefresh(owner:string,lease:string,cipher:string) {checked(await admin.from('quickbooks_connections').update({refresh_cipher:cipher}).eq('owner_id',owner).eq('environment','sandbox').eq('sync_lock_id',lease).gt('sync_lock_until',new Date().toISOString()).select('owner_id').single());},
 async saveEmployees(owner:string,lease:string,employees:{id:string;name:string;active:boolean}[],syncedAt:string) {checked(await admin.from('quickbooks_connections').update({employee_snapshot:employees,employees_synced_at:syncedAt}).eq('owner_id',owner).eq('environment','sandbox').eq('sync_lock_id',lease).gt('sync_lock_until',new Date().toISOString()).select('owner_id').single());},
 async removeAttempt(owner:string) {checked(await admin.from('quickbooks_oauth_attempts').delete().eq('owner_id',owner));},
};
const handler=createHandler({
 config:{origin:'https://dzebrobuilds.github.io',clientId:Deno.env.get('INTUIT_CLIENT_ID'),clientSecret:Deno.env.get('INTUIT_CLIENT_SECRET'),encryptionKey:Deno.env.get('INTUIT_TOKEN_ENCRYPTION_KEY'),redirectURI:Deno.env.get('INTUIT_REDIRECT_URI')},
 store,
 async authenticate(token:string,homeId:string) {
  const db=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(token);if(error||!user||user.is_anonymous)return null;
  const {data:assurance,error:assuranceError}=await db.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if(assuranceError||assurance?.currentLevel!=='aal2')return null;
  const {data:home,error:homeError}=await db.from('homes').select('owner_id').eq('id',homeId).maybeSingle();
  return !homeError&&home?.owner_id===user.id?user.id:null;
 },
});
Deno.serve(handler);
