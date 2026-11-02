import OpenAI from 'npm:openai@7.32.0';
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { runManager, validateManagerInput } from './manager.mjs';

const allowedOrigin='https://dzebrobuilds.github.io';
const cors={'Access-Control-Allow-Origin':allowedOrigin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const running=new Set<string>();
const lastRun=new Map<string,number>();
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});

Deno.serve(async(req:Request)=>{
  if(req.headers.get('origin') && req.headers.get('origin')!==allowedOrigin)return json({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  const auth=req.headers.get('authorization');
  if(!auth?.startsWith('Bearer '))return json({error:'Sign in to CareFlow first.'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await db.auth.getUser(auth.slice(7));
  if(authError||!user)return json({error:'Your session expired. Sign in again.'},401);
  const {data:assurance}=await db.auth.mfa.getAuthenticatorAssuranceLevel(auth.slice(7));
  if(assurance?.currentLevel!=='aal2')return json({error:'Complete authenticator verification first.'},403);
  // Initial live testing is restricted to the existing owner. Expand deliberately through server configuration.
  const testers=(Deno.env.get('CAREFLOW_AI_ALLOWED_USER_IDS')||'54f6a141-c041-4820-90b8-2780d3deeaea').split(',').map(x=>x.trim());
  if(!testers.includes(user.id))return json({error:'Live AI testing is not enabled for this CareFlow account yet.'},403);
  const text=await req.text();
  if(text.length>45000)return json({error:'Request is too large.'},413);
  let input;
  try{input=validateManagerInput(JSON.parse(text));}catch(e){return json({error:e instanceof Error?e.message:'Invalid request.'},400);}
  const {data:home,error:homeError}=await db.from('homes').select('id,owner_id').eq('id',input.homeId).maybeSingle();
  if(homeError||!home)return json({error:'You do not have access to this home.'},403);
  if(home.owner_id!==user.id){const {data:member}=await db.from('home_members').select('role').eq('home_id',input.homeId).eq('user_id',user.id).maybeSingle();if(member?.role!=='admin')return json({error:'Owner or administrator access is required.'},403);}
  const key=Deno.env.get('OPENAI_API_KEY');
  if(!key)return json({error:'The AI backend is deployed but its server key has not been activated yet.'},503);
  if(running.has(user.id)||Date.now()-(lastRun.get(user.id)||0)<30000)return json({error:'Please wait before starting another manager request.'},429);
  running.add(user.id);lastRun.set(user.id,Date.now());
  if(lastRun.size>500)for(const [id,time] of lastRun)if(Date.now()-time>3600000)lastRun.delete(id);
  const client=new OpenAI({apiKey:key,maxRetries:0,timeout:120000});
  const encoder=new TextEncoder();
  const response=new ReadableStream({async start(controller){
    let open=true;const emit=(value:unknown)=>{if(open)try{controller.enqueue(encoder.encode(JSON.stringify(value)+'\n'));}catch{open=false;}};
    emit({type:'status',text:'Dawit is reviewing your fictional request.'});
    try{const result=await runManager(client,input,emit,req.signal);emit({type:'result',...result});}
    catch(e){const status=(e as {status?:number}).status;const quota=e instanceof Error&&/billing|quota|usage.{0,30}limit/i.test(e.message);emit({type:'error',text:quota?'OpenAI API billing or usage limits are blocking this run. Check your API billing and limits.':status===429?'OpenAI is rate-limiting requests. Wait briefly before retrying.':status===401?'The server API key needs attention.':e instanceof Error&&e.name==='AbortError'?'The request timed out or was cancelled. Try a smaller request.':'The manager could not complete this request. No external action was taken.'});}
    finally{running.delete(user.id);if(open)try{controller.close();}catch{/* Client disconnected. */}}
  }});
  return new Response(response,{headers:{...cors,'Content-Type':'application/x-ndjson','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
});
