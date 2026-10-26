import { supabase } from './supabase';
import { parseOperations, type Operations } from './demo-operations';
import type { Home } from './workspace';
export async function loadOperations(ownerId:string,homes:Home[]){
 if(!supabase)throw new Error('Database is unavailable.');
 const result=await supabase.from('operations_test_workspaces').select('payload,revision,updated_at').eq('owner_id',ownerId).maybeSingle();
 if(result.error)throw new Error('Saved HR test data could not be loaded. Retry after verifying your sign-in.');
 if(!result.data)return {payload:{version:1,staff:[],shifts:[],time:[],expenses:[]} as Operations,revision:0,updatedAt:''};
 return {payload:parseOperations(JSON.stringify(result.data.payload),homes),revision:result.data.revision as number,updatedAt:result.data.updated_at as string};
}
export async function persistOperations(ownerId:string,revision:number,payload:Operations,homes:Home[]){
 if(!supabase)throw new Error('Database is unavailable.');
 parseOperations(JSON.stringify(payload),homes);
 const row={owner_id:ownerId,revision:revision+1,payload};
 const result=revision===0?await supabase.from('operations_test_workspaces').insert(row).select('revision,updated_at').single():await supabase.from('operations_test_workspaces').update(row).eq('owner_id',ownerId).eq('revision',revision).select('revision,updated_at').single();
 if(result.error)throw new Error('Change was not saved. Another session may have updated this roster. Reload saved data and retry.');
 return {revision:result.data.revision as number,updatedAt:result.data.updated_at as string};
}
