import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createHandler,digest,seal,unseal } from '../supabase/functions/careflow-quickbooks/connection.mjs';
const owner='11111111-1111-4111-8111-111111111111',home='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const key=btoa('x'.repeat(32)),verifier='a'.repeat(64),origin='https://dzebrobuilds.github.io';
function fixture(overrides={}) {
 let attempt=null,connection=null,authenticated=owner;
 const calls=[];
 const store={
  async connection(){return connection;},
  async saveAttempt(row){attempt=row;},
  async takeAttempt(who,state,challenge,after){if(!attempt||attempt.owner_id!==who||attempt.state_hash!==state||attempt.challenge!==challenge||attempt.expires_at<=after)return null;const result=attempt;attempt=null;return result;},
  async saveConnection(row){assert.equal(connection,null);connection=row;},
  async removeConnection(){connection=null;},async removeAttempt(){attempt=null;},
 };
 const fetcher=async(url,init)=>{calls.push({url,init});if(url.includes('/tokens/bearer'))return Response.json({access_token:'test-access',refresh_token:'test-refresh'});if(url.includes('/tokens/revoke'))return new Response(null,{status:200});return Response.json({CompanyInfo:{Id:'1',CompanyName:'Fictional test company'}});};
 const handler=createHandler({config:{origin,clientId:'test-client',clientSecret:'test-secret',encryptionKey:key,redirectURI:origin+'/Careflow/intuit/callback/',...overrides.config},store,authenticate:async()=>authenticated,fetcher:overrides.fetcher||fetcher,now:()=>1000000});
 return {calls,store,handler,get connection(){return connection;},get attempt(){return attempt;},setAuth(value){authenticated=value;},async send(input,options={}){const result=await handler(new Request('https://example.test/function',{method:'POST',headers:{Origin:origin,Authorization:'Bearer test-session','Content-Type':'application/json',...options.headers},body:JSON.stringify({homeId:home,...input})}));return {status:result.status,body:await result.json()};}};
}
async function start(f) {const response=await f.send({action:'start',challenge:await digest(verifier)});assert.equal(response.status,200);return response.body.state;}
const complete=(state,extra={})=>({action:'complete',state,verifier,realmId:'12345',code:'test-code',...extra});
test('sandbox flow binds owner and browser, encrypts credentials, verifies company, and rejects replay',async()=>{
 const f=fixture(),state=await start(f);
 assert.notEqual(f.attempt.state_hash,state);
 const result=await f.send(complete(state));assert.equal(result.status,200);assert.equal(result.body.companyName,'Fictional test company');
 assert.equal(JSON.stringify(result.body).includes('test-refresh'),false);assert.equal(f.connection.refresh_cipher.includes('test-refresh'),false);
 assert.equal(await unseal(f.connection.refresh_cipher,key,owner+':sandbox:12345'),'test-refresh');
 assert.equal(f.calls[1].url,'https://sandbox-quickbooks.api.intuit.com/v3/company/12345/companyinfo/12345');
 assert.equal((await f.send(complete(state))).status,409);assert.equal(f.calls.length,2);
});
test('wrong origin, missing owner or invalid MFA cannot access status or provider',async()=>{
 const f=fixture();assert.equal((await f.send({action:'status'},{headers:{Origin:'https://evil.test'}})).status,403);
 f.setAuth(null);assert.equal((await f.send({action:'status'})).status,403);assert.equal(f.calls.length,0);
 const response=await f.handler(new Request('https://example.test',{method:'POST',headers:{Origin:origin},body:'{}'}));assert.equal(response.status,401);
});
test('different browser, different owner and expired states do not consume the valid attempt',async()=>{
 const f=fixture(),state=await start(f);
 assert.equal((await f.send(complete(state,{verifier:'b'.repeat(64)}))).status,409);
 f.setAuth('22222222-2222-4222-8222-222222222222');assert.equal((await f.send(complete(state))).status,409);
 f.setAuth(owner);f.attempt.expires_at=new Date(999999).toISOString();assert.equal((await f.send(complete(state))).status,409);
 assert.equal(f.calls.length,0);
});
test('incomplete server configuration fails closed and production redirect origins cannot be injected',async()=>{
 const f=fixture({config:{clientSecret:''}});assert.equal((await f.send({action:'status'})).body.ready,false);assert.equal((await f.send({action:'start',challenge:await digest(verifier)})).status,503);
 const other=fixture({config:{redirectURI:'https://evil.test/callback'}});assert.equal((await other.send({action:'start',challenge:await digest(verifier)})).status,503);
});
test('bad realm IDs and denied company access cannot create a connection',async()=>{
 const f=fixture(),state=await start(f);assert.equal((await f.send(complete(state,{realmId:'123/attack'}))).status,400);assert.equal(f.calls.length,0);
 const bad=fixture({fetcher:async(url)=>url.includes('/tokens/bearer')?Response.json({access_token:'a',refresh_token:'r'}):new Response(null,{status:403})});
 const badState=await start(bad);assert.equal((await bad.send(complete(badState))).status,502);assert.equal(bad.connection,null);
});
test('encryption authenticates ciphertext and tenant context',async()=>{
 const value=await seal('token',key,'owner:sandbox:realm');assert.equal(await unseal(value,key,'owner:sandbox:realm'),'token');
 await assert.rejects(()=>unseal(value,key,'different-owner:sandbox:realm'));
 const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));bytes[20]^=1;await assert.rejects(()=>unseal(btoa(String.fromCharCode(...bytes)),key,'owner:sandbox:realm'));
});
test('provider errors are redacted and disconnect revokes before removing stored grant',async()=>{
 const f=fixture(),state=await start(f);await f.send(complete(state));
 assert.equal((await f.send({action:'disconnect'})).status,200);assert.equal(f.connection,null);assert.ok(f.calls.at(-1).url.endsWith('/tokens/revoke'));
 const bad=fixture({fetcher:async()=>new Response('secret provider error',{status:401})});const badState=await start(bad);const result=await bad.send(complete(badState));assert.equal(result.status,502);assert.equal(JSON.stringify(result).includes('secret provider error'),false);
});
test('SQL blocks all browser roles from tokens and state; service role can claim each state once',async()=>{
 const db=new PGlite();
 try {
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);');
 await db.exec(await readFile(new URL('../supabase/quickbooks.sql',import.meta.url),'utf8'));
 await db.exec(`insert into auth.users values('${owner}');set role service_role;`);
 await db.exec(`insert into public.quickbooks_oauth_attempts values('${owner}','${'a'.repeat(64)}','${'b'.repeat(64)}',now()+interval '10 minutes');`);
 for(const role of ['anon','authenticated']) {await db.exec(`reset role;set role ${role};`);for(const table of ['quickbooks_connections','quickbooks_oauth_attempts'])await assert.rejects(()=>db.query(`select * from public.${table}`));await assert.rejects(()=>db.exec('delete from public.quickbooks_oauth_attempts'));}
 await db.exec('reset role;set role service_role;');
 assert.equal((await db.query(`delete from public.quickbooks_oauth_attempts where owner_id='${owner}' and state_hash='${'a'.repeat(64)}' and challenge='${'b'.repeat(64)}' and expires_at>now() returning owner_id`)).rows.length,1);
 assert.equal((await db.query(`delete from public.quickbooks_oauth_attempts where owner_id='${owner}' returning owner_id`)).rows.length,0);
 }finally{await db.close();}
});
