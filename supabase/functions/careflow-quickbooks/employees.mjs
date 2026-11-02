export function employeeSummary(value) {
 if(!value||!/^\d{1,30}$/.test(String(value.Id||''))||typeof value.DisplayName!=='string'||!value.DisplayName.trim()||value.DisplayName.length>200||typeof value.Active!=='boolean')throw new Error('QuickBooks returned an incomplete employee record.');
 return {id:String(value.Id),name:value.DisplayName,active:value.Active};
}
export async function synchronizeEmployees({connection,refresh,saveRefresh,fetchPage,saveSnapshot,now=()=>Date.now()}) {
 const tokens=await refresh();
 if(typeof tokens.access_token!=='string'||!tokens.access_token||typeof tokens.refresh_token!=='string'||!tokens.refresh_token||tokens.access_token.length>8000||tokens.refresh_token.length>8000)throw new Error('QuickBooks returned an incomplete refresh grant.');
 // Persist rotation before the first query, even if the following read fails.
 await saveRefresh(tokens.refresh_token);
 const employees=[],seen=new Set();
 for(let start=1;start<=5001;start+=1000) {
  const result=await fetchPage(tokens.access_token,start);
  if(!result||typeof result!=='object'||!result.QueryResponse||typeof result.QueryResponse!=='object'||Array.isArray(result.QueryResponse))throw new Error('QuickBooks returned an incomplete employee page.');
  const page=result.QueryResponse.Employee??[];
  if(!Array.isArray(page)||page.length>1000)throw new Error('QuickBooks returned an invalid employee page.');
  for(const value of page) {
   const employee=employeeSummary(value);
   if(seen.has(employee.id))throw new Error('Employee pages changed during synchronization. Retry the sync.');
   seen.add(employee.id);employees.push(employee);
  }
  if(employees.length>5000)throw new Error('This test sync supports up to 5,000 employees. No directory changes were saved.');
  if(page.length<1000)break;
 }
 const before=new Map((connection.employee_snapshot??[]).map(e=>[e.id,e]));
 let added=0,updated=0,unchanged=0;
 for(const employee of employees) {
  const previous=before.get(employee.id);
  if(!previous)added++;else if(previous.name!==employee.name||previous.active!==employee.active)updated++;else unchanged++;
 }
 const removed=[...before.keys()].filter(id=>!seen.has(id)).length;
 employees.sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
 const syncedAt=new Date(now()).toISOString();
 await saveSnapshot(employees,syncedAt);
 return {employees,syncedAt,summary:{added,updated,unchanged,removed,total:employees.length}};
}
