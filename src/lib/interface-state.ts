export function pageSlice<T>(rows:T[],requested:number,pageSize=25){
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new Error('Invalid page size.');
 const pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const page=Math.max(1,Math.min(pages,Number.isFinite(requested)?Math.floor(requested):1));
 const start=(page-1)*pageSize,end=Math.min(rows.length,start+pageSize);
 return {rows:rows.slice(start,end),page,pages,total:rows.length,from:rows.length?start+1:0,to:end};
}
export function snapshotFields(entries:Iterable<[string,FormDataEntryValue]>){return JSON.stringify([...entries].map(([key,value])=>[key,typeof value==='string'?value:{name:value.name,size:value.size,type:value.type,lastModified:value.lastModified}]));}
export function profileErrorField(error:string){if(/code/i.test(error))return 'staff-code';if(/hourly rate/i.test(error))return 'staff-rate';if(/email/i.test(error))return 'staff-email';return undefined;}
