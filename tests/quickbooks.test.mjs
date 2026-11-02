import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { synchronizeEmployees, employeeSummary } from '../supabase/functions/careflow-quickbooks/employees.mjs';
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
  async acquireConnection(who,lease,until,after){if(!connection||connection.owner_id!==who||connection.sync_lock_until&&connection.sync_lock_until>after)return null;connection.sync_lock_id=lease;connection.sync_lock_until=until;return {...connection};},
  async releaseConnection(who,lease){if(connection?.owner_id===who&&connection.sync_lock_id===lease){connection.sync_lock_id=null;connection.sync_lock_until=null;}},
  async saveRefresh(who,lease,cipher){assert.equal(connection.owner_id,who);assert.equal(connection.sync_lock_id,lease);connection.refresh_cipher=cipher;},
  async saveEmployees(who,lease,employees,syncedAt){assert.equal(connection.owner_id,who);assert.equal(connection.sync_lock_id,lease);connection.employee_snapshot=employees;connection.employees_synced_at=syncedAt;},
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
 await db.exec(await readFile(new URL('../supabase/quickbooks-employee-sync.sql',import.meta.url),'utf8'));
 await db.exec(`insert into auth.users values('${owner}');set role service_role;`);
 await db.exec(`insert into public.quickbooks_oauth_attempts values('${owner}','${'a'.repeat(64)}','${'b'.repeat(64)}',now()+interval '10 minutes');`);
 for(const role of ['anon','authenticated']) {await db.exec(`reset role;set role ${role};`);for(const table of ['quickbooks_connections','quickbooks_oauth_attempts'])await assert.rejects(()=>db.query(`select * from public.${table}`));await assert.rejects(()=>db.exec('delete from public.quickbooks_oauth_attempts'));}
 await db.exec('reset role;set role service_role;');
 assert.equal((await db.query(`delete from public.quickbooks_oauth_attempts where owner_id='${owner}' and state_hash='${'a'.repeat(64)}' and challenge='${'b'.repeat(64)}' and expires_at>now() returning owner_id`)).rows.length,1);
 assert.equal((await db.query(`delete from public.quickbooks_oauth_attempts where owner_id='${owner}' returning owner_id`)).rows.length,0);
 }finally{await db.close();}
});

test('employee projection discards sensitive fields and rejects incomplete records',()=>{
 assert.deepEqual(employeeSummary({Id:'7',DisplayName:'Fictional Employee',Active:true,SSN:'secret',PrimaryEmailAddr:{Address:'private'},BirthDate:'2000-01-01'}),{id:'7',name:'Fictional Employee',active:true});
 assert.throws(()=>employeeSummary({Id:'7',DisplayName:'Name'}));assert.throws(()=>employeeSummary({Id:'7/attack',DisplayName:'Name',Active:true}));
});
function syncFixture(pages,connection={employee_snapshot:[]}) {
 const events=[],saved={refresh:null,employees:null};
 return {events,saved,run:()=>synchronizeEmployees({connection,now:()=>1000000,refresh:async()=>({access_token:'new-access',refresh_token:'rotated-refresh'}),saveRefresh:async token=>{events.push('saved-refresh');saved.refresh=token;},fetchPage:async(access,start)=>{assert.equal(access,'new-access');assert.equal(events[0],'saved-refresh');events.push(start);const page=pages[(start-1)/1000];if(page instanceof Error)throw page;return {QueryResponse:{Employee:page??[]}};},saveSnapshot:async(employees,syncedAt)=>{saved.employees=employees;saved.syncedAt=syncedAt;}})};
}
test('snapshot sync tracks stable IDs, inactive staff, renamed staff, additions, removals and duplicate-free repeat runs',async()=>{
 const pages=[[{Id:'1',DisplayName:'Renamed Employee',Active:true},{Id:'2',DisplayName:'Inactive Employee',Active:false},{Id:'3',DisplayName:'New Employee',Active:true}]];
 const f=syncFixture(pages,{employee_snapshot:[{id:'1',name:'Old Name',active:true},{id:'2',name:'Inactive Employee',active:false},{id:'4',name:'Removed',active:true}]});
 const result=await f.run();assert.deepEqual(result.summary,{added:1,updated:1,unchanged:1,removed:1,total:3});assert.equal(f.saved.refresh,'rotated-refresh');
 const repeated=await syncFixture(pages,{employee_snapshot:result.employees}).run();assert.deepEqual(repeated.summary,{added:0,updated:0,unchanged:3,removed:0,total:3});
});
test('pagination finishes before replacing snapshot and provider failure still preserves refreshed token',async()=>{
 const first=Array.from({length:1000},(_,i)=>({Id:String(i+1),DisplayName:'Sample '+i,Active:true}));
 const f=syncFixture([first,[{Id:'1001',DisplayName:'Last sample',Active:false}]]);assert.equal((await f.run()).employees.length,1001);assert.deepEqual(f.events,['saved-refresh',1,1001]);
 const failed=syncFixture([first,new Error('provider failure')]);await assert.rejects(()=>failed.run());assert.equal(failed.saved.refresh,'rotated-refresh');assert.equal(failed.saved.employees,null);
 const duplicate=syncFixture([first,[first[0]]]);await assert.rejects(()=>duplicate.run());assert.equal(duplicate.saved.employees,null);
});
test('empty complete source clears snapshot, malformed source cannot replace it, and capped source remains unchanged',async()=>{
 const empty=await syncFixture([],{employee_snapshot:[{id:'1',name:'Gone',active:true}]}).run();assert.equal(empty.summary.removed,1);assert.deepEqual(empty.employees,[]);
 const broken=syncFixture([[{Id:'1',DisplayName:'Incomplete'}]]);await assert.rejects(()=>broken.run());assert.equal(broken.saved.employees,null);
 let saved=false;
 await assert.rejects(()=>synchronizeEmployees({connection:{},refresh:async()=>({access_token:'a',refresh_token:'r'}),saveRefresh:async()=>{},fetchPage:async(access,start)=>({QueryResponse:{Employee:Array.from({length:1000},(_,i)=>({Id:String(start+i),DisplayName:'Sample',Active:true}))}}),saveSnapshot:async()=>{saved=true;}}));assert.equal(saved,false);
});
test('live handler renews grant, persists safe employee directory, and serves cache without tokens',async()=>{
 const calls=[];
 const f=fixture({fetcher:async(url,init)=>{calls.push({url,init});if(url.includes('/tokens/bearer'))return Response.json({access_token:'access',refresh_token:calls.length>2?'rotated':'initial'});if(url.includes('/query?'))return Response.json({QueryResponse:{Employee:[{Id:'11',DisplayName:'Sample Sync Employee',Active:true,SSN:'never-save'}]}});return Response.json({CompanyInfo:{Id:'1',CompanyName:'Fictional test company'}});}});
 await f.send(complete(await start(f)));
 const result=await f.send({action:'syncEmployees'});assert.equal(result.status,200);assert.deepEqual(result.body.summary,{added:1,updated:0,unchanged:0,removed:0,total:1});
 assert.equal(await unseal(f.connection.refresh_cipher,key,owner+':sandbox:12345'),'rotated');assert.equal(f.connection.sync_lock_id,null);assert.equal(JSON.stringify(f.connection.employee_snapshot).includes('SSN'),false);
 const cached=await f.send({action:'status'});assert.equal(cached.body.employees.length,1);assert.equal(JSON.stringify(cached.body).includes('rotated'),false);
 const query=new URL(calls.find(c=>c.url.includes('/query?')).url);assert.equal(query.hostname,'sandbox-quickbooks.api.intuit.com');assert.ok(query.searchParams.get('query').includes('Active in (true, false)'));
 f.connection.sync_lock_id='f'.repeat(64);f.connection.sync_lock_until=new Date(2000000).toISOString();assert.equal((await f.send({action:'syncEmployees'})).status,409);assert.equal((await f.send({action:'disconnect'})).status,409);
 f.setAuth(null);assert.equal((await f.send({action:'syncEmployees'})).status,403);
});

test('database lease excludes concurrent syncs and fences stale writes after recovery',async()=>{
 const db=new PGlite();
 try {
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);');
  for(const name of ['quickbooks.sql','quickbooks-employee-sync.sql'])await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
  await db.exec(`insert into auth.users values('${owner}');set role service_role;insert into public.quickbooks_connections(owner_id,environment,realm_id,company_name,refresh_cipher,verified_at) values('${owner}','sandbox','12345','Sample company','cipher',now());`);
  const first='a'.repeat(64),second='b'.repeat(64);
  assert.equal((await db.query(`update public.quickbooks_connections set sync_lock_id='${first}',sync_lock_until=now()+interval '5 minutes' where owner_id='${owner}' and (sync_lock_until is null or sync_lock_until<now()) returning owner_id`)).rows.length,1);
  assert.equal((await db.query(`update public.quickbooks_connections set sync_lock_id='${second}' where owner_id='${owner}' and (sync_lock_until is null or sync_lock_until<now()) returning owner_id`)).rows.length,0);
  await db.exec(`update public.quickbooks_connections set sync_lock_until=now()-interval '1 second';`);
  assert.equal((await db.query(`update public.quickbooks_connections set sync_lock_id='${second}',sync_lock_until=now()+interval '5 minutes' where owner_id='${owner}' and sync_lock_until<now() returning owner_id`)).rows.length,1);
  assert.equal((await db.query(`update public.quickbooks_connections set refresh_cipher='stale' where owner_id='${owner}' and sync_lock_id='${first}' returning owner_id`)).rows.length,0);
  assert.equal((await db.query(`update public.quickbooks_connections set sync_lock_id=null,sync_lock_until=null where owner_id='${owner}' and sync_lock_id='${first}' returning owner_id`)).rows.length,0);
  assert.equal((await db.query(`select refresh_cipher from public.quickbooks_connections`)).rows[0].refresh_cipher,'cipher');
  await assert.rejects(()=>db.exec(`update public.quickbooks_connections set employee_snapshot='{}'::jsonb;`));
 }finally{await db.close();}
});
