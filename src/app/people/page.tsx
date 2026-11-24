"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./people.css";
import { supabase, configured, productionEnabled } from "@/lib/supabase";
import StaffDirectory from "../../components/staff-directory";
import { staffAccess, type Employee as StaffEmployee, type EmployeeAssignment as StaffAssignment, type EmployeeCredential as StaffCredential, type HomeRole } from "@/lib/staff-directory";
import type { Home } from "@/lib/workspace";

type Employee = { id: string; name: string; role: string; facility: string; status: "Active" | "Onboarding"; hours: number; rate: number };
const seed: Employee[] = [
  { id:"CF-101",name:"Jordan Lee",role:"Care coordinator",facility:"North House",status:"Active",hours:38,rate:28 },
  { id:"CF-102",name:"Morgan Rivera",role:"Support specialist",facility:"East House",status:"Active",hours:42,rate:24 },
  { id:"CF-103",name:"Taylor Brooks",role:"Shift supervisor",facility:"North House",status:"Active",hours:40,rate:32 },
  { id:"CF-104",name:"Casey Patel",role:"Support specialist",facility:"West House",status:"Onboarding",hours:0,rate:25 }
];
const tabs = ["Overview","Employees","Timesheets","Payroll","Integrations"] as const;
type Tab = typeof tabs[number];
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
export default function PeoplePage(){
 const [tab,setTab]=useState<Tab>("Overview");
 const [employees,setEmployees]=useState(seed);
 const [query,setQuery]=useState("");
 const [facility,setFacility]=useState("All facilities");
 const [approved,setApproved]=useState<string[]>([]);
 const [notice,setNotice]=useState("");
 // Connected staff directory (docs/staff-directory.md). When the app is
 // configured for live data, the Employees tab below is backed by the
 // Supabase employees / assignments / credentials tables instead of the
 // fictional seed. Every other tab stays the prototype, and any failure
 // to load (no session, no MFA, migration not applied) leaves the
 // prototype in place — it is never replaced by an error screen.
 const [connected,setConnected]=useState(false);
 const [connectedError,setConnectedError]=useState("");
 const [staffEmployees,setStaffEmployees]=useState<StaffEmployee[]>([]);
 const [staffAssignments,setStaffAssignments]=useState<StaffAssignment[]>([]);
 const [staffCredentials,setStaffCredentials]=useState<StaffCredential[]>([]);
 const [staffHomes,setStaffHomes]=useState<Home[]>([]);
 const [staffHomeId,setStaffHomeId]=useState("all");
 const [staffRoles,setStaffRoles]=useState<Record<string,string>>({});
 const [staffUserId,setStaffUserId]=useState("");
 useEffect(()=>{
   if(!configured||!productionEnabled||!supabase) return;
   let active=true;
   (async()=>{
     try{
       const {data:identity,error:identityError}=await supabase.auth.getUser();
       if(identityError||!identity.user) return;
       const assurance=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
       if(assurance.error||assurance.data.currentLevel!=="aal2") return;
       const [homes,staff,assignments,credentials,members]=await Promise.all([
         supabase.from("homes").select("*").order("name"),
         supabase.from("employees").select("*").order("display_name"),
         supabase.from("employee_home_assignments").select("*").order("start_date",{ascending:false}),
         supabase.from("employee_credentials").select("*").order("expiry_date"),
         supabase.from("home_members").select("home_id,role").eq("user_id",identity.user.id),
       ]);
       const failure=[homes,staff,assignments,credentials,members].find((result)=>result.error);
       if(failure?.error) throw new Error("Staff directory could not be loaded.");
       if(!active) return;
       setStaffUserId(identity.user.id);
       setStaffHomes(homes.data??[]);
       setStaffEmployees(staff.data??[]);
       setStaffAssignments(assignments.data??[]);
       setStaffCredentials(credentials.data??[]);
       setStaffRoles(Object.fromEntries((members.data??[]).map((m)=>[m.home_id,m.role])));
       setConnected(true);
     }catch{
       if(active) setConnectedError("Connected staff directory is unavailable. Showing the fictional prototype.");
     }
   })();
   return ()=>{active=false;};
 },[]);
 const roleForHome=(id:string): HomeRole | null => {
   const home=staffHomes.find((h)=>h.id===id);
   if(!home) return null;
   if(home.owner_id===staffUserId) return "owner";
   return (staffRoles[id] as HomeRole | undefined) ?? null;
 };
 const staffCanManage = staffHomeId==="all"
   ? staffHomes.some((h)=>staffAccess(roleForHome(h.id)).write)
   : staffAccess(roleForHome(staffHomeId)).write;
 const filtered=useMemo(()=>employees.filter(e=>(facility==="All facilities"||e.facility===facility)&&(`${e.name} ${e.role} ${e.id}`.toLowerCase().includes(query.toLowerCase()))),[employees,facility,query]);
 const hours=employees.reduce((sum,e)=>sum+e.hours,0);
 const gross=employees.reduce((sum,e)=>sum+e.hours*e.rate+Math.max(0,e.hours-40)*e.rate*.5,0);
 const approve=(id:string)=>{setApproved(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);setNotice("Sample approval updated locally. No payroll submitted.");};
 const addSample=()=>{if(employees.some(e=>e.id==="CF-105")){setNotice("Sample employee already added.");return;}setEmployees(prev=>[...prev,{id:"CF-105",name:"Alex Kim",role:"Support specialist",facility:"East House",status:"Onboarding",hours:0,rate:26}]);setNotice("Fictional employee added to this browser session only.");};
 return <main className="people-shell">
  <header className="people-header"><Link href="/demo" className="people-brand"><span className="people-mark">C</span> CareFlow <span className="people-brand-light">/ People</span></Link>{connected?<span className="people-demo">Connected workspace · Home-scoped directory</span>:<span className="people-demo">Fictional demonstration · No payroll connection</span>}<Link href="/demo" className="people-back">← Workspace</Link></header>
  <section className="people-heading"><div><p className="people-kicker">WORKFORCE OPERATIONS</p><h1>People & payroll</h1><p>Manage your team, review hours, and prepare payroll in one calm workspace.</p></div><button onClick={addSample} className="people-primary">+ Add sample employee</button></section>
  <nav className="people-tabs" aria-label="People sections">{tabs.map(t=><button key={t} onClick={()=>{setTab(t);setNotice("");}} aria-current={tab===t?"page":undefined} className={tab===t?"selected":""}>{t}</button>)}</nav>
  {notice&&<div className="people-notice" role="status">{notice}<button onClick={()=>setNotice("")} aria-label="Dismiss notification">×</button></div>}
  {connectedError&&<div className="people-notice" role="status">{connectedError}<button onClick={()=>setConnectedError("")} aria-label="Dismiss notification">×</button></div>}
  {(tab==="Overview"||tab==="Payroll")&&<section className="people-metrics" aria-label="Sample workforce metrics"><article><span>Team members</span><strong>{employees.length}</strong><small>Fictional profiles</small></article><article><span>Hours recorded</span><strong>{hours}</strong><small>Current sample period</small></article><article><span>Estimated gross wages</span><strong>{money(gross)}</strong><small>Illustrative only · before deductions</small></article><article><span>Timesheets approved</span><strong>{approved.length} / {employees.length}</strong><small>Local demonstration state</small></article></section>}
  {tab==="Overview"&&<div className="people-columns"><section className="people-card"><div className="people-card-head"><h2>Team at a glance</h2><button onClick={()=>setTab("Employees")}>View directory →</button></div>{employees.map(e=><div className="people-line" key={e.id}><span className="people-avatar">{e.name.split(" ").map(s=>s[0]).join("")}</span><span className="people-line-main"><b>{e.name}</b><small>{e.role} · {e.facility}</small></span><span className={"people-status "+(e.status==="Active"?"active":"")}>{e.status}</span></div>)}</section><section className="people-card"><h2>Payroll readiness</h2><p className="people-muted">Review and approve sample hours before exporting to a supported payroll workflow.</p><div className="people-readiness"><strong>{approved.length}/{employees.length}</strong><span>timesheets reviewed</span></div><button className="people-primary" onClick={()=>setTab("Timesheets")}>Review timesheets →</button><p className="people-footnote">No payments, tax filings, or direct deposits are initiated here.</p></section></div>}
  {tab==="Employees"&&(connected
    ? <StaffDirectory employees={staffEmployees} assignments={staffAssignments} credentials={staffCredentials} homes={staffHomes} homeId={staffHomeId} onHomeChange={setStaffHomeId} canManage={staffCanManage} />
    : <section className="people-card"><div className="people-card-head"><h2>Employee directory</h2><span>{filtered.length} employees</span></div><div className="people-filters"><input aria-label="Search employees" placeholder="Search employees..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter facility" value={facility} onChange={e=>setFacility(e.target.value)}>{["All facilities","North House","East House","West House"].map(f=><option key={f}>{f}</option>)}</select></div><div className="people-table-wrap"><table><thead><tr><th>Employee</th><th>Role</th><th>Facility</th><th>Status</th></tr></thead><tbody>{filtered.map(e=><tr key={e.id}><td><b>{e.name}</b><small>{e.id}</small></td><td>{e.role}</td><td>{e.facility}</td><td><span className={"people-status "+(e.status==="Active"?"active":"")}>{e.status}</span></td></tr>)}</tbody></table></div>{filtered.length===0&&<p className="people-muted">No matching employees.</p>}</section>)}
  {tab==="Timesheets"&&<section className="people-card"><div className="people-card-head"><h2>Timesheet approvals</h2><span>Sample pay period</span></div><div className="people-table-wrap"><table><thead><tr><th>Employee</th><th>Hours</th><th>Overtime</th><th>Estimated gross</th><th>Review</th></tr></thead><tbody>{employees.map(e=><tr key={e.id}><td><b>{e.name}</b><small>{e.facility}</small></td><td>{e.hours}h</td><td>{Math.max(0,e.hours-40)}h</td><td>{money(e.hours*e.rate+Math.max(0,e.hours-40)*e.rate*.5)}</td><td><button className={"people-approve "+(approved.includes(e.id)?"approved":"")} onClick={()=>approve(e.id)}>{approved.includes(e.id)?"✓ Approved":"Approve sample"}</button></td></tr>)}</tbody></table></div><p className="people-footnote">Overtime uses a simplified example, not an Oregon wage-law determination. Real payroll requires validated time rules, rates, approvals, and provider integration.</p></section>}
  {tab==="Payroll"&&<section className="people-card"><h2>Payroll preparation</h2><p className="people-muted">Estimated wages shown above are calculated from fictional sample data. Taxes, benefits, deductions, reimbursements, and payroll liabilities are not calculated.</p><div className="people-callout"><b>Payroll processing is not connected.</b><p>Once your QuickBooks Payroll subscription and authorized API access are verified, CareFlow can prepare reviewed time data for an approved integration. Until then, payroll submission remains unavailable.</p></div><button className="people-secondary" onClick={()=>setTab("Integrations")}>Review integration requirements →</button></section>}
  {tab==="Integrations"&&<section className="people-card"><h2>QuickBooks connection</h2><div className="people-integration"><span className="people-q">qb</span><div><b>Intuit QuickBooks</b><p>ChatGPT connector detected previously. This website has no OAuth connection or payroll API authorization.</p></div><span className="people-status">Not connected to CareFlow</span></div><h3>Before enabling synchronization</h3><ol className="people-steps"><li>Confirm QuickBooks Online and whether QuickBooks Payroll is active.</li><li>Register a separate Intuit developer app and configure secure server-side OAuth.</li><li>Verify employee, time-entry, and payroll API permissions and product availability.</li><li>Map employees to facilities, implement least-privilege access and encrypted token storage.</li><li>Test reconciliation and duplicate prevention in a sandbox before any live sync.</li></ol><p className="people-footnote">No Intuit credentials, bank details, SSNs, or actual employee information are stored by this demonstration.</p></section>}
 </main>;
}
