const encoder = new TextEncoder();
const tokenURL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const revokeURL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
const scope = 'com.intuit.quickbooks.accounting';
export const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join('');
export async function digest(value) {
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), n => n.toString(16).padStart(2, '0')).join('');
}
async function encryptionKey(secret) {
 const bytes = Uint8Array.from(atob(secret), c => c.charCodeAt(0));
 if (bytes.length !== 32) throw new Error('Invalid encryption configuration.');
 return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value, secret, context) {
 const iv = crypto.getRandomValues(new Uint8Array(12));
 const cipher = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context)}, await encryptionKey(secret), encoder.encode(value)));
 return btoa(String.fromCharCode(...iv, ...cipher));
}
export async function unseal(value, secret, context) {
 const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:encoder.encode(context)}, await encryptionKey(secret), bytes.slice(12)));
}
export function authorizationURL(config, state) {
 const url = new URL('https://appcenter.intuit.com/connect/oauth2');
 url.search = new URLSearchParams({client_id:config.clientId,response_type:'code',scope,redirect_uri:config.redirectURI,state}).toString();
 return url.href;
}
class Failure extends Error { constructor(message,status=400) {super(message);this.status=status;} }
export function createHandler({config,authenticate,store,fetcher=fetch,now=()=>Date.now()}) {
 const headers = {'Access-Control-Allow-Origin':config.origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 const basic=()=>`Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`;
 async function intuit(url, init) {
  const response=await fetcher(url,{...init,redirect:'error',signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Failure('Intuit could not complete verification. Restart the connection or try again later.',502);
  return response;
 }
 return async function handle(req) {
  try {
   if(req.headers.get('origin')!==config.origin)throw new Failure('Origin not allowed.',403);
   if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
   if(req.method!=='POST')throw new Failure('Method not allowed.',405);
   const auth=req.headers.get('authorization');
   if(!auth?.startsWith('Bearer '))throw new Failure('Sign in to CareFlow first.',401);
   const text=await req.text(); if(text.length>12000)throw new Failure('Request is too large.',413);
   let input;try{input=JSON.parse(text);}catch{throw new Failure('Invalid request.');}
   if(!input||typeof input!=='object'||!['status','start','complete','disconnect'].includes(input.action)||!/^[-a-f0-9]{36}$/i.test(input.homeId||''))throw new Failure('Invalid request.');
   // authenticate performs a fresh Auth lookup, verifies MFA and actual home ownership.
   const owner=await authenticate(auth.slice(7),input.homeId);
   if(!owner)throw new Failure('Owner access and authenticator verification are required.',403);
   const ready=!!(config.clientId&&config.clientSecret&&config.encryptionKey&&config.redirectURI);
   if(input.action==='status') {
    const connection=await store.connection(owner);
    return json({ready,environment:'sandbox',connected:!!connection,companyName:connection?.company_name??null,verifiedAt:connection?.verified_at??null});
   }
   if(!ready)throw new Failure('Intuit sandbox app setup is not complete yet.',503);
   const redirect=new URL(config.redirectURI);
   if(redirect.protocol!=='https:'||redirect.origin!==config.origin||redirect.search||redirect.hash)throw new Failure('Intuit return address needs server setup.',503);
   await encryptionKey(config.encryptionKey);
   if(input.action==='start') {
    if(!/^[a-f0-9]{64}$/.test(input.challenge||''))throw new Failure('Restart the connection in this browser.');
    if(await store.connection(owner))throw new Failure('Disconnect the existing sandbox company before connecting again.',409);
    const state=randomSecret();
    await store.saveAttempt({owner_id:owner,state_hash:await digest(state),challenge:input.challenge,expires_at:new Date(now()+10*60*1000).toISOString()});
    return json({authorizationURL:authorizationURL(config,state),state});
   }
   if(input.action==='complete') {
    if(!/^[a-f0-9]{64}$/.test(input.state||'')||!/^[a-f0-9]{64}$/.test(input.verifier||'')||!/^\d{1,30}$/.test(input.realmId||'')||typeof input.code!=='string'||input.code.length<1||input.code.length>4096)throw new Failure('Invalid Intuit return. Restart the connection.');
    // Atomic DELETE ... RETURNING makes each grant single-use and binds it to the initiating owner and browser.
    const attempt=await store.takeAttempt(owner,await digest(input.state),await digest(input.verifier),new Date(now()).toISOString());
    if(!attempt)throw new Failure('Connection expired or was already used. Restart in the original browser.',409);
    if(await store.connection(owner))throw new Failure('A sandbox company is already connected.',409);
    const tokenResponse=await intuit(tokenURL,{method:'POST',headers:{Authorization:basic(),'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({grant_type:'authorization_code',code:input.code,redirect_uri:config.redirectURI})});
    const tokens=await tokenResponse.json();
    if(typeof tokens.access_token!=='string'||typeof tokens.refresh_token!=='string'||tokens.refresh_token.length>8000||tokens.access_token.length>8000)throw new Failure('Intuit returned an incomplete grant.',502);
    const companyResponse=await intuit(`https://sandbox-quickbooks.api.intuit.com/v3/company/${input.realmId}/companyinfo/${input.realmId}`,{headers:{Authorization:`Bearer ${tokens.access_token}`,Accept:'application/json'}});
    const {CompanyInfo:company}=await companyResponse.json();
    if(!company||!/^\d+$/.test(String(company.Id||''))||typeof company.CompanyName!=='string'||!company.CompanyName.trim())throw new Failure('The authorized company could not be verified.',502);
    const verifiedAt=new Date(now()).toISOString();
    await store.saveConnection({owner_id:owner,environment:'sandbox',realm_id:input.realmId,company_name:company.CompanyName.slice(0,200),refresh_cipher:await seal(tokens.refresh_token,config.encryptionKey,`${owner}:sandbox:${input.realmId}`),verified_at:verifiedAt});
    return json({connected:true,environment:'sandbox',companyName:company.CompanyName.slice(0,200),verifiedAt});
   }
   const connection=await store.connection(owner);
   if(connection) {
    const token=await unseal(connection.refresh_cipher,config.encryptionKey,`${owner}:sandbox:${connection.realm_id}`);
    await intuit(revokeURL,{method:'POST',headers:{Authorization:basic(),'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({token})});
    await store.removeConnection(owner);
   }
   await store.removeAttempt(owner);
   return json({connected:false,environment:'sandbox'});
  } catch(error) {
   // Never return provider bodies, tokens, raw database errors, or stack traces.
   return json({error:error instanceof Failure?error.message:'The connection could not be completed. Try again or contact the CareFlow owner.'},error instanceof Failure?error.status:500);
  }
 };
}
