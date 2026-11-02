'use client';
import { useCallback,useEffect,useState } from 'react';
import { supabase } from '@/lib/supabase';
type Member={user_id:string;role:string};
export default function HomeAccess({homeId,owner}:{homeId:string;owner:boolean}) {
 const [members,setMembers]=useState<Member[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[removing,setRemoving]=useState<Member|null>(null);
 const load=useCallback(async()=>{if(!supabase)return;const result=await supabase.from('home_members').select('user_id,role').eq('home_id',homeId);if(result.error)throw new Error('Could not load home access.');setMembers(result.data??[]);},[homeId]);
 useEffect(()=>{let active=true;if(supabase)void supabase.from('home_members').select('user_id,role').eq('home_id',homeId).then(result=>{if(!active)return;if(result.error)setMessage('Could not load home access.');else setMembers(result.data??[]);});return()=>{active=false;};},[homeId]);
 async function save(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();if(!supabase||!owner||busy)return;setBusy(true);setMessage('');
  const form=event.currentTarget,values=new FormData(form);
  try {
   const result=await supabase.from('home_members').upsert({home_id:homeId,user_id:String(values.get('user_id')).trim(),role:String(values.get('role'))},{onConflict:'home_id,user_id'});
   if(result.error)throw new Error('Access could not be saved. Verify the user ID belongs to a provisioned account.');
   form.reset();await load();setMessage('Home access saved.');
  }catch(error){setMessage(error instanceof Error?error.message:'Access could not be saved.');}finally{setBusy(false);}
 }
 async function revoke() {
  if(!supabase||!owner||!removing||busy)return;setBusy(true);setMessage('');
  try {
   const result=await supabase.from('home_members').delete().eq('home_id',homeId).eq('user_id',removing.user_id).select('user_id').single();
   if(result.error)throw new Error('Access could not be removed. Refresh the list and check your owner access.');
   setRemoving(null);await load();setMessage('Team membership removed from this home.');
  }catch(error){setMessage(error instanceof Error?error.message:'Access could not be removed.');}finally{setBusy(false);}
 }
 return <section className="mt-8 border-t border-[#e0e6dc] pt-6"><h3 className="font-semibold">Team access</h3><p className="mt-2 text-sm leading-6 text-[#718177]">Accounts are created by your CareFlow administrator. The home owner assigns and removes team access.</p>
 {message&&<p className="cf-notice mt-4" role="status">{message}</p>}
 <div className="mt-5 space-y-3">{members.length?members.map(member=><div key={member.user_id} className="flex flex-wrap justify-between items-center gap-3 text-xs"><code className="break-all">{member.user_id}</code><span>{member.role}</span>{owner&&<button type="button" className="cf-secondary" disabled={busy} aria-label={`Remove ${member.user_id} from this home`} onClick={()=>setRemoving(member)}>Remove access</button>}</div>):<p className="text-sm text-[#718177]">No additional team members.</p>}</div>
 {removing&&owner&&<section className="cf-notice mt-5" aria-label="Confirm removal of team access"><h4 className="font-semibold">Remove this home membership?</h4><p className="mt-2 text-sm break-all">Account {removing.user_id} currently has {removing.role} access. Confirm removal to revoke this membership.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className="cf-primary" disabled={busy} onClick={()=>void revoke()}>{busy?'Removing...':'Confirm removal'}</button><button type="button" className="cf-secondary" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button></div></section>}
 {owner&&<form onSubmit={save} className="cf-form-grid mt-6"><fieldset disabled={busy} className="contents"><label className="text-xs font-semibold">Provisioned user ID<input name="user_id" className="cf-input mt-2" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" placeholder="User ID from account setup"/></label><label className="text-xs font-semibold">Role<select name="role" className="cf-input mt-2"><option value="viewer">Viewer - read only</option><option value="staff">Staff - create and submit</option><option value="admin">Administrator - review and approve</option></select></label><button className="cf-primary w-fit">{busy?'Saving...':'Save team access'}</button></fieldset></form>}
 </section>;
}
