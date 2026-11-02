import type { Entry } from './workspace';
export function weeklyReview(entries:Entry[],homeId:string,today:string) {
  const end=new Date(today+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+7);const through=end.toISOString().slice(0,10);
  const open=entries.filter(e=>e.home_id===homeId&&e.status!=='Complete');
  const overdue=open.filter(e=>!!e.due_date&&e.due_date<today);
  const awaiting=open.filter(e=>e.status==='In review');
  const unassigned=open.filter(e=>!e.assignee.trim());
  const upcoming=open.filter(e=>e.due_date>=today&&e.due_date<=through);
  const rank=(e:Entry)=>e.due_date&&e.due_date<today?0:e.priority==='High'?1:!e.assignee.trim()?2:e.status==='In review'?3:4;
  const queue=[...open].sort((a,b)=>rank(a)-rank(b)||(a.due_date||'9999').localeCompare(b.due_date||'9999')||a.title.localeCompare(b.title));
  return {queue,overdue,awaiting,unassigned,upcoming,through};
}
