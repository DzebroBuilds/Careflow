import {PGlite} from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fortyPeople} from '../src/lib/operations-fixture.ts';
const db=new PGlite();
await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('aal',current_setting('request.jwt.claim.aal',true))$$;grant usage on schema auth to authenticated;grant execute on function auth.uid(),auth.jwt() to authenticated;create schema careflow_private;revoke all on schema careflow_private from public;grant usage on schema careflow_private to authenticated;create table public.homes(id uuid primary key,owner_id uuid,name text);alter table public.homes enable row level security;grant select on public.homes to authenticated;create policy owner_home on public.homes for select to authenticated using(owner_id=auth.uid());`);
await db.exec(await readFile(new URL('../supabase/operations-test.sql',import.meta.url),'utf8'));
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',staff='33333333-3333-4333-8333-333333333333';
const homes=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',owner_id:owner,name:'Test one'},{id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',owner_id:owner,name:'Test two'}];
await db.exec(`insert into auth.users values('${owner}'),('${other}'),('${staff}');insert into public.homes values('${homes[0].id}','${owner}','Test one'),('${homes[1].id}','${owner}','Test two');`);
async function asUser(id,aal='aal2'){await db.exec(`reset role;set request.jwt.claim.sub='${id}';set request.jwt.claim.aal='${aal}';set role authenticated;`);}
const fixture=fortyPeople(homes),empty={version:1,staff:[],shifts:[],time:[],expenses:[]};
await asUser(owner);
await db.query('insert into public.operations_test_workspaces(owner_id,revision,payload) values($1,1,$2)',[owner,JSON.stringify(fixture)]);
assert.deepEqual((await db.query('select payload from public.operations_test_workspaces')).rows[0].payload,fixture);
await db.exec('reset role;');await asUser(owner);assert.equal((await db.query('select jsonb_array_length(payload->\'staff\') as n from public.operations_test_workspaces')).rows[0].n,40);
await db.query('update public.operations_test_workspaces set payload=$1,revision=2 where owner_id=$2 and revision=1',[JSON.stringify({...fixture,staff:fixture.staff.map((p,i)=>i? p:{...p,job:'Edited and remembered'})}),owner]);
assert.equal((await db.query('select count(*)::int as n from public.operations_test_history')).rows[0].n,2);
assert.equal((await db.query('update public.operations_test_workspaces set revision=2 where owner_id=$1 and revision=1 returning revision',[owner])).rows.length,0);
await assert.rejects(()=>db.exec('update public.operations_test_workspaces set revision=99'));
await assert.rejects(()=>db.exec('delete from public.operations_test_history'));
await assert.rejects(()=>db.exec('update public.operations_test_history set revision=4'));
await assert.rejects(()=>db.exec('delete from public.operations_test_workspaces'));
for(const bad of [{...fixture,staff:[{...fixture.staff[0],homeIds:['foreign']}]},{...fixture,staff:[{...fixture.staff[0],hourlyCents:-2}]},{...fixture,time:[{...fixture.time[0],staffId:'missing'}]},{...fixture,time:[...fixture.time,{...fixture.time[0],id:'duplicate-time'}]}])await assert.rejects(()=>db.query('update public.operations_test_workspaces set revision=3,payload=$1',[JSON.stringify(bad)]));
await asUser(owner,'aal1');assert.equal((await db.query('select * from public.operations_test_workspaces')).rows.length,0);assert.equal((await db.query('select * from public.operations_test_history')).rows.length,0);
for(const user of [other,staff]){await asUser(user);assert.equal((await db.query('select * from public.operations_test_workspaces')).rows.length,0);assert.equal((await db.query('select * from public.operations_test_history')).rows.length,0);assert.equal((await db.query('update public.operations_test_workspaces set revision=3 returning owner_id')).rows.length,0);await assert.rejects(()=>db.query('insert into public.operations_test_workspaces(owner_id,revision,payload) values($1,1,$2)',[owner,JSON.stringify(empty)]));await assert.rejects(()=>db.query('insert into public.operations_test_workspaces(owner_id,revision,payload) values($1,1,$2)',[user,JSON.stringify(empty)]));}
await db.exec('reset role;set role anon;');await assert.rejects(()=>db.exec('select * from public.operations_test_workspaces'));await assert.rejects(()=>db.exec('select * from public.operations_test_history'));
await db.close();console.log('PASS: saved 40-person roster, reconnect, revision history, stale-write protection, malformed data, owner isolation, MFA and anonymous denial.');
