const sandboxRef='scriqnmzyshhixrdufjf';
export function isProductionDeployment(env) {return env.CAREFLOW_DEPLOYMENT==='production'||env.NEXT_PUBLIC_CAREFLOW_DATA_MODE==='production';}
export function productionChecks(env) {
 let app=null,database=null;
 try{app=new URL(env.NEXT_PUBLIC_CAREFLOW_APP_ORIGIN||'');}catch{/* Report the missing or malformed setting below. */}
 try{database=new URL(env.NEXT_PUBLIC_SUPABASE_URL||'');}catch{/* Report the missing or malformed setting below. */}
 const privateOrigin=!!app&&app.protocol==='https:'&&!app.username&&!app.password&&app.pathname==='/'&&!app.search&&!app.hash&&!app.hostname.endsWith('.github.io')&&app.hostname!=='localhost'&&app.hostname.includes('.');
 const projectRef=env.CAREFLOW_PRODUCTION_SUPABASE_REF||'';
 const exposedSecrets=Object.keys(env).filter(name=>name.startsWith('NEXT_PUBLIC_')&&/SECRET|PRIVATE_KEY|SERVICE_ROLE|TOKEN_ENCRYPTION|PASSWORD|OPENAI_API_KEY/.test(name)&&!!env[name]);
 return [
  {id:'deployment',passed:env.CAREFLOW_DEPLOYMENT==='production',detail:'Set CAREFLOW_DEPLOYMENT=production for the reviewed production release.'},
  {id:'data-mode',passed:env.NEXT_PUBLIC_CAREFLOW_DATA_MODE==='production',detail:'Set NEXT_PUBLIC_CAREFLOW_DATA_MODE=production only for the separate production environment.'},
  {id:'live-enabled',passed:env.NEXT_PUBLIC_CAREFLOW_LIVE_ENABLED==='true',detail:'Enable the private workspace only after its production setup is verified.'},
  {id:'origin',passed:privateOrigin,detail:'Set NEXT_PUBLIC_CAREFLOW_APP_ORIGIN to the approved HTTPS application origin, outside GitHub Pages.'},
  {id:'separate-database',passed:/^[a-z0-9]{20}$/.test(projectRef)&&projectRef!==sandboxRef&&!!database&&database.origin===`https://${projectRef}.supabase.co`&&database.pathname==='/'&&!database.search&&!database.hash&&!database.username&&!database.password,detail:'Use a separate hosted production project; CAREFLOW_PRODUCTION_SUPABASE_REF must match NEXT_PUBLIC_SUPABASE_URL.'},
  {id:'publishable-key',passed:/^sb_publishable_[A-Za-z0-9_-]{10,}$/.test(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||''),detail:'Provide the production project publishable key. Secret and service-role keys must never be public.'},
  {id:'server-origin',passed:privateOrigin&&env.CAREFLOW_ALLOWED_ORIGIN===app.origin,detail:'CAREFLOW_ALLOWED_ORIGIN must match the production application origin. Configure it on each deployed backend too.'},
  {id:'no-public-secrets',passed:exposedSecrets.length===0,detail:'Remove any secret, password, private-key or service-role variables with a NEXT_PUBLIC_ prefix.'},
  {id:'sandbox-integration',passed:env.NEXT_PUBLIC_CAREFLOW_INTUIT_ENABLED!=='true',detail:'Disable the sandbox-only Intuit interface in production. Live financial authorization requires a separately implemented and verified production integration.'},
 ];
}
export function assertProductionConfig(env) {
 if(!isProductionDeployment(env))return;
 const failed=productionChecks(env).filter(check=>!check.passed);
 if(failed.length)throw new Error('Production configuration is incomplete:\n'+failed.map(check=>`- ${check.id}: ${check.detail}`).join('\n'));
}
