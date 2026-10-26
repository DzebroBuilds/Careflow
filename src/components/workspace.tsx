'use client';
import Link from 'next/link';
import HomeAccess from './home-access';
import dynamic from 'next/dynamic';
import { operationSections } from '@/lib/operation-sections';
import { sectionFromSearch,sectionHref,isPlainNavigation,beforeNavigationEvent } from '@/lib/workspace-navigation';
import { operationsKey } from '@/lib/demo-operations';
import DocumentReaderHub from './document-reader-hub';
import { normalizeResidentWorkspace, residentDocumentDraft, monthlyDocumentGaps, monthlyTypes, monthEnd, validateResidentDocument, type Resident, type DocumentType } from '@/lib/residents';
import DashboardOverview from './dashboard-overview';
import './dashboard-theme.css';
import TodayAttention from './today-attention';
import WeeklyReview from './weekly-review';
import './workspace-polish.css';
import { visibleNotes, withReviewMetadata, requirementId, requirements } from '@/lib/compliance';
import { navigation, sectionLabel, viewEntries, type RecordTemplate } from '@/lib/dashboard';
import Icon from './icon';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, configured, productionEnabled, sampleDataOnly } from '@/lib/supabase';
import { categories, sampleWorkspace, isOverdue, localDate, reviewCsv, type Workspace as Data, type Entry, type Home, type Category } from '@/lib/workspace';

import { parseDemoWorkspace } from '@/lib/demo-storage';
import { rememberedUntil } from '@/lib/auth-storage';


function FeatureLoading(){return <section className="cf-panel cf-feature-loading" role="status" aria-live="polite"><div className="cf-loading-line"/><div className="cf-loading-line short"/><p>Loading workspace tools…</p></section>;}
const OperationsDemo=dynamic(()=>import('./operations-demo'),{loading:FeatureLoading});
const QuickbooksConnection=dynamic(()=>import('./quickbooks-connection'),{loading:FeatureLoading});
const ResidentWorkspace=dynamic(()=>import('./resident-workspace'),{loading:FeatureLoading});
const ResidentDocumentEditor=dynamic(()=>import('./resident-document-editor'),{loading:FeatureLoading});
const ConnectedTools=dynamic(()=>import('./connected-tools'),{loading:FeatureLoading});
const TeamLab=dynamic(()=>import('./team-lab'),{loading:FeatureLoading});
const ManagerChat=dynamic(()=>import('./manager-chat'),{loading:FeatureLoading});
const ComplianceTracker=dynamic(()=>import('./compliance-tracker'),{loading:FeatureLoading});
const DashboardViews=dynamic(()=>import('./dashboard-views'),{loading:FeatureLoading});

const blank: Data = {homes:[],entries:[],activity:[],residents:[]};
const demoKey = 'careflow-demo-v1';

function download(text: string, filename: string, type = 'text/csv;charset=utf-8') { const url = URL.createObjectURL(new Blob([text],{type})); const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function dateLabel(value: string) { return value ? new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : 'No date'; }

export default function Workspace({demo=false,initialSection="Readiness center"}:{demo?:boolean;initialSection?:string}) {
  const router = useRouter();
  const [data,setData] = useState<Data>(blank);
  const [homeId,setHomeId] = useState('');
  const [section,setSection] = useState<string>(initialSection);
  const [metricsScope,setMetricsScope]=useState<'overall'|'house'>('overall');
  const [menuOpen,setMenuOpen] = useState(false);
  const [search,setSearch] = useState('');
  const [filter,setFilter] = useState('All');
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [userId,setUserId] = useState('');
  const [roles,setRoles] = useState<Record<string,string>>({});
  const [editing,setEditing] = useState<Entry|null>(null);
  const [homeModal,setHomeModal] = useState(false);
  const [file,setFile] = useState<File|null>(null);
  const [storageReady,setStorageReady] = useState(true);
  const currentHref=useRef('');
  const searchRef = useRef<HTMLInputElement>(null);
  const entryDialog = useRef<HTMLDialogElement>(null);
  const homeDialog = useRef<HTMLDialogElement>(null);

  const loadCloud = useCallback(async () => {
    if (!supabase) return;
    const deadline = rememberedUntil();
    if (deadline && deadline <= Date.now()) { await supabase.auth.signOut({scope:'local'}); router.replace('/login'); return; }
    const {data:identity,error:identityError} = await supabase.auth.getUser();
    if (identityError || !identity.user) { router.replace('/login'); return; }
    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw new Error('Could not verify your sign-in.');
    if (assurance.data.currentLevel !== 'aal2') { router.replace('/verify'); return; }
    const id = identity.user.id; setUserId(id);
    const [homes,entries,activity,members,residents] = await Promise.all([
      supabase.from('homes').select('*').order('name'),
      supabase.from('records').select('*').order('updated_at',{ascending:false}),
      supabase.from('activity').select('*').order('created_at',{ascending:false}).limit(200),
      supabase.from('home_members').select('home_id,role').eq('user_id',id),
      supabase.from('residents').select('*').order('name'),
    ]);
    const failure = [homes,entries,activity,members,residents].find(result=>result.error);
    if (failure?.error) throw new Error('Workspace could not be loaded. Check the database setup and your access, then retry.');
    const next: Data = {homes:homes.data??[],entries:entries.data??[],activity:activity.data??[],residents:residents.data??[]};
    setData(next); setRoles(Object.fromEntries((members.data??[]).map(m=>[m.home_id,m.role])));
    setHomeId(current=>next.homes.some(h=>h.id===current)?current:next.homes[0]?.id??'');
  }, [router]);
  useEffect(()=>{
    let active = true;
    async function initialize() {
      try {
        setSection(sectionFromSearch(window.location.search,initialSection));
        currentHref.current=window.location.pathname+window.location.search+window.location.hash;
        if (demo) {
          let next = sampleWorkspace();
          try { const stored = localStorage.getItem(demoKey); if(stored) { next=parseDemoWorkspace(stored); } } catch { setNotice('Sample storage could not be read. A fresh sample workspace is loaded.'); }
          if(active) { next=normalizeResidentWorkspace(next,localDate());setData(next);setHomeId(next.homes[0]?.id??'');setUserId('demo'); }
        } else if(configured && productionEnabled) await loadCloud();
      } catch { if(active) setError('Could not load your workspace. Retry or check your connection.'); }
      finally { if(active) setLoading(false); }
    }
    void initialize();
    return ()=>{active=false;};
  // The workspace initializes once for this route. Reloads are explicit after writes.

  },[demo,loadCloud,initialSection]);
  useEffect(()=>{ if(editing) entryDialog.current?.showModal(); else entryDialog.current?.close(); },[editing]);
  useEffect(()=>{ if(homeModal) homeDialog.current?.showModal(); else homeDialog.current?.close(); },[homeModal]);
  useEffect(() => {
    if (demo || !supabase || !productionEnabled) return;
    let timeout: ReturnType<typeof setTimeout>;
    const lock = () => { setData(blank); void supabase!.auth.signOut({scope:'local'}).finally(() => router.replace('/login')); };
    const reset = () => {
      clearTimeout(timeout);
      const deadline = rememberedUntil();
      if (deadline && deadline <= Date.now()) { lock(); return; }
      // A trusted personal browser keeps its verified session; shared browsers retain the idle timeout.
      timeout = setTimeout(deadline ? reset : lock, deadline ? Math.min(deadline - Date.now(), 24 * 60 * 60 * 1000) : 15 * 60 * 1000);
    };
    const resume = () => { if (document.visibilityState === 'visible') reset(); };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', reset);
    const events = ['pointerdown','keydown','touchstart'] as const;
    events.forEach(event => window.addEventListener(event, reset, {passive:true}));
    const {data:{subscription}} = supabase.auth.onAuthStateChange(event => { if(event==='SIGNED_OUT') {setData(blank);router.replace('/login');} });
    reset();
    return () => { clearTimeout(timeout); subscription.unsubscribe(); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', reset); events.forEach(event => window.removeEventListener(event, reset)); };
  }, [demo, router]);

  const home = data.homes.find(h=>h.id===homeId);
  const records = data.entries.filter(e=>e.home_id===homeId);
  const canApprove = demo || home?.owner_id===userId || roles[homeId]==='admin';
  const writable = demo || canApprove || roles[homeId]==='staff';
  const open = records.filter(e=>e.status!=='Complete');
  const overdue = open.filter(e=>isOverdue(e));
  const isOverview = section==='Readiness center';
  const shown = viewEntries(data.entries,homeId,section).filter(e=>(filter==='All'||(filter==='Overdue'?isOverdue(e):e.status===filter)) && `${e.title} ${e.subject} ${e.assignee} ${e.notes}`.toLowerCase().includes(search.toLowerCase()));
  const panelOnly = ['QuickBooks','Document reader','Connected tools','Reports','Templates','Homes','Help','Support Documents','Compliance tracker','Weekly review','Residents'].includes(section)||operationSections.includes(section);
  const menuGroups=(demo||data.homes.some(home=>home.owner_id===userId))?[...navigation,{group:'Operations',items:[['Staff directory','Staff directory','people'],['Shift coverage','Shift coverage','calendar'],['Time approvals','Time approvals','clock'],['Expenses','Expenses','folder'],['Payroll preparation','Payroll preparation','chart']] as const}]:navigation;
  useEffect(()=>{if(!menuOpen)return;document.querySelector<HTMLButtonElement>('.cf-sidebar .cf-nav-close')?.focus();const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMenuOpen(false);document.querySelector<HTMLButtonElement>('.ct-brand button')?.focus();}if(event.key==='Tab'&&window.innerWidth<=1024){const items=[...document.querySelectorAll<HTMLElement>('.cf-sidebar a[href],.cf-sidebar button:not(:disabled),.cf-sidebar summary')].filter(item=>item.getBoundingClientRect().height>0);const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[menuOpen]);
  const searchable=['Staff directory','Time approvals'].includes(section)||(!isOverview&&!panelOnly&&!['Your team','Settings','Activity history'].includes(section));
  const primaryNav=[['Readiness center','Today','grid'],['Staff directory','People','people'],['Shift coverage','Schedule','calendar'],['Time approvals','Time','clock'],['Payroll preparation','Payroll','chart'],['Expenses','Expenses','folder'],['Residents','Residents','people'],['Document reader','OCR reader','file'],['QuickBooks','QuickBooks','chart']].filter(([id])=>menuGroups.some(group=>group.items.some(item=>item[0]===id)));
  const moreNav=menuGroups.map(group=>({...group,items:group.items.filter(item=>!primaryNav.some(([id])=>id===item[0]))})).filter(group=>group.items.length);
  useEffect(()=>{const restore=()=>{const nextSection=sectionFromSearch(window.location.search,initialSection);const previousSection=sectionFromSearch(new URL(currentHref.current||window.location.href,window.location.origin).search,initialSection);if(nextSection===previousSection){currentHref.current=window.location.pathname+window.location.search+window.location.hash;return;}if(!window.dispatchEvent(new Event(beforeNavigationEvent,{cancelable:true}))){window.history.pushState(window.history.state,'',currentHref.current);return;}currentHref.current=window.location.pathname+window.location.search+window.location.hash;setSection(sectionFromSearch(window.location.search,initialSection));setSearch('');setFilter('All');setMenuOpen(false);requestAnimationFrame(()=>document.getElementById('workspace-content')?.focus({preventScroll:true}));};window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[initialSection]);
  function hrefForSection(next:string){return sectionHref(typeof window==='undefined'?(demo?'/demo/':'/dashboard/'):window.location.pathname,typeof window==='undefined'?'':window.location.search,next);}
  function goTo(next:string) {if(!window.dispatchEvent(new Event(beforeNavigationEvent,{cancelable:true})))return;const href=hrefForSection(next);if(href!==window.location.pathname+window.location.search)window.history.pushState(window.history.state,'',href);currentHref.current=href;setSection(next);setSearch('');setFilter('All');setMenuOpen(false);requestAnimationFrame(()=>document.getElementById('workspace-content')?.focus({preventScroll:true}));}
  function navigate(event:React.MouseEvent<HTMLAnchorElement>,next:string){if(isPlainNavigation(event)){event.preventDefault();goTo(next);}}

  function useTemplate(t:RecordTemplate) { setError('');setFile(null);setEditing({id:'',home_id:homeId,category:t.category,title:t.title,subject:'',assignee:'',due_date:localDate(),priority:'Normal',status:'Open',notes:t.notes,evidence_path:null,evidence_name:null,updated_at:''}); }

  function commit(next: Data) { try { localStorage.setItem(demoKey,JSON.stringify(next));setData(next);setStorageReady(true); } catch {setStorageReady(false);throw new Error('Your browser could not save this change. Free storage or enable site storage, then retry.');} }
  function demoLog(next:Data,action:string,id=homeId) { next.activity=[{id:crypto.randomUUID(),home_id:id,action,created_at:new Date().toISOString(),actor_id:'demo'},...next.activity].slice(0,200);commit(next); }
  function createEntry(category: Category = 'Residents', title = '') { setError('');setFile(null);setEditing({id:'',home_id:homeId,category,title,subject:'',assignee:'',due_date:localDate(),priority:'Normal',status:'Open',notes:'',evidence_path:null,evidence_name:null,updated_at:''}); }
  async function saveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(!editing||busy) return; setBusy(true);setError('');
    let uploadedPath: string|null=null;
    try {
      const form = new FormData(event.currentTarget);
      const entry:Entry = {...editing,id:editing.id||crypto.randomUUID(),home_id:homeId,title:String(form.get('title')).trim(),subject:String(form.get('subject')).trim(),assignee:String(form.get('assignee')).trim(),category:form.get('category') as Category,due_date:String(form.get('due_date')),priority:form.get('priority') as Entry['priority'],status:form.get('status') as Entry['status'],notes:withReviewMetadata(editing,String(form.get('notes')).trim()),updated_at:new Date().toISOString()};
      if(!entry.title) throw new Error('Enter a task title.');
      validateResidentDocument(entry,data.residents??[]);
      if(entry.status==='Complete' && !canApprove) throw new Error('Administrator approval is required to complete a record.');
      if(demo) demoLog({...data,entries:[entry,...data.entries.filter(e=>e.id!==entry.id)]},editing.id?'Record updated':'Record created');
      else {
        if(!supabase) throw new Error('Database is not connected.');
        if(file) {
          if(file.size>10*1024*1024) throw new Error('Choose a file smaller than 10 MB.');
          if(!['application/pdf','image/png','image/jpeg','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) throw new Error('Use PDF, Word (.docx), PNG, JPEG, or plain text evidence.');
          uploadedPath=`${homeId}/${entry.id}/${crypto.randomUUID()}`;
          const upload=await supabase.storage.from('evidence').upload(uploadedPath,file,{contentType:file.type,upsert:false});
          if(upload.error) throw new Error('Evidence upload failed. Your record was not saved.');
          entry.evidence_path=uploadedPath; entry.evidence_name=file.name;
        }
        const result = editing.id ? await supabase.from('records').update(entry).eq('id',entry.id).select('id').single() : await supabase.from('records').insert(entry).select('id').single();
        if(result.error) {if(uploadedPath) await supabase.storage.from('evidence').remove([uploadedPath]);throw new Error(result.error.code==='23505'?'A document of this type already exists for this resident and month. Open that record instead.':'Record could not be saved. Check your access and retry.');}
        setEditing(null);
        await loadCloud();
      }
      setEditing(null);setNotice('Record saved.');
    } catch(e) {setError(e instanceof Error?e.message:'Save failed. Please retry.');}
    finally {setBusy(false);}
  }
  async function saveResident(resident:Resident) {
    if(!canApprove||resident.home_id!==homeId)throw new Error('Administrator access is required to manage residents.');
    if(!resident.name.trim()||!resident.document_types.length||resident.document_types.some(type=>!monthlyTypes.includes(type)))throw new Error('Enter a resident name and valid monthly document requirements.');
    if(resident.document_types.length<3&&resident.applicability_notes.trim().length<5)throw new Error('Record a reason for excluded document types.');
    const existing=(data.residents??[]).some(item=>item.id===resident.id);
    if(demo)demoLog({...data,residents:[resident,...(data.residents??[]).filter(item=>item.id!==resident.id)]},existing?'Resident profile updated':'Resident created');
    else {const result=existing?await supabase!.from('residents').update(resident).eq('id',resident.id).eq('home_id',homeId).select('id').single():await supabase!.from('residents').insert(resident).select('id').single();if(result.error)throw new Error('Resident profile could not be saved. Check your access and retry.');await loadCloud();}
    setNotice('Resident profile saved.');
  }
  function startResidentDocument(resident:Resident,type:DocumentType,period:string) {
    if(!writable||resident.home_id!==homeId||resident.status!=='Active')return;
    setError('');setFile(null);
    if(monthEnd(period)<resident.admission_date){setError('Choose a month on or after the resident’s admission date.');return;}
    const existing=type!=='incident'?data.entries.find(entry=>entry.home_id===homeId&&entry.resident_id===resident.id&&entry.document_type===type&&entry.document_period===period):null;
    setEditing(existing||residentDocumentDraft(resident,type,period));
  }
  async function startMonthlyPack(resident:Resident,period:string) {
    if(!writable||resident.home_id!==homeId||resident.status!=='Active')throw new Error('This resident is not available for a new monthly pack.');
    if(monthEnd(period)<resident.admission_date)throw new Error('Choose a month on or after the resident’s admission date.');
    const drafts=monthlyDocumentGaps(data.entries,resident,period).map(type=>({...residentDocumentDraft(resident,type,period),id:crypto.randomUUID(),updated_at:new Date().toISOString()}));
    if(!drafts.length)return;
    if(demo)demoLog({...data,entries:[...drafts,...data.entries]},'Monthly resident document pack created');
    else {const result=await supabase!.from('records').insert(drafts).select('id');if(result.error){if(result.error.code==='23505')await loadCloud();throw new Error('Monthly pack could not be created. Refresh the workspace; a pack may already exist.');}await loadCloud();}
    setNotice(`${drafts.length} monthly document records created. Attach evidence and assign reviewers next.`);
  }
  async function saveHome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy) return;setBusy(true);setError('');
    try {
      const form=new FormData(event.currentTarget); const h:Home={id:crypto.randomUUID(),name:String(form.get('name')).trim(),license_due:String(form.get('license_due')),owner_id:userId};
      if(!h.name) throw new Error('Enter a home name.');
      if(demo) demoLog({...data,homes:[...data.homes,h]},'Home created',h.id);
      else {const result=await supabase!.from('homes').insert(h);if(result.error)throw new Error('Home could not be created. Please retry.');await loadCloud();}
      setHomeId(h.id);setHomeModal(false);setNotice('Home added. Start adding its records.');
    } catch(e) {setError(e instanceof Error?e.message:'Could not add home.');} finally {setBusy(false);}
  }
  async function openEvidence(entry:Entry) {
    if(!entry.evidence_path||!supabase) return; setError('');
    const result=await supabase.storage.from('evidence').download(entry.evidence_path);
    if(result.error) {setError('Evidence could not be downloaded. Check your connection and access.');return;}
    const url=URL.createObjectURL(result.data);const a=document.createElement('a');a.href=url;a.download=entry.evidence_name||'evidence';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportPacket() {if(!home)return;download(reviewCsv(home,records),`careflow-review-${localDate()}.csv`);setNotice('Review packet exported. It contains record details and evidence filenames; attached files are downloaded separately.');}
  async function retry() {setError('');setLoading(true);try{await loadCloud();}catch{setError('Could not load the workspace. Check the database setup.');}finally{setLoading(false);}}

  if(loading) return <main className="cf-gate"><div className="cf-loading" role="status" aria-label="Loading CareFlow"><div className="cf-brand"><span className="cf-logo"><Icon name="cross"/></span>CareFlow</div><div className="cf-skeleton"/><div className="cf-skeleton"/><div className="cf-skeleton"/><span className="sr-only">Loading your workspace…</span></div></main>;
  if(!demo&&(!configured||!productionEnabled)) return <main className="cf-gate"><div className="cf-panel max-w-xl"><Link href="/" className="cf-brand">CareFlow</Link><p className="cf-eyebrow mt-8">Production setup</p><h1 className="mt-2 text-3xl font-semibold">Your live workspace is being prepared.</h1><p className="mt-4 text-[#607067]">Private sign-in and account provisioning are being configured. The sample dashboard is available with fictional data.</p><div className="mt-7 flex flex-wrap gap-3"><Link className="cf-primary" href="/demo">Open sample workspace</Link><Link className="cf-secondary" href="/setup">View setup requirements</Link></div></div></main>;
  return <main className={`cf-shell ct-shell ${menuOpen?'menu-expanded':''}`}><a href="#workspace-content" className="cf-skip">Skip to workspace</a>
    {menuOpen&&<button className="cf-nav-backdrop" aria-label="Close navigation" onClick={()=>setMenuOpen(false)}/>}
    <aside className="cf-sidebar" aria-label="CareFlow sidebar"><button className="cf-nav-close" aria-label="Close navigation menu" onClick={()=>{setMenuOpen(false);document.querySelector<HTMLButtonElement>('.ct-brand button')?.focus();}}>×</button>
      <Link href="/" className="cf-brand"><span className="cf-logo"><Icon name="cross" size={20}/></span><span>CareFlow<small>Your care workspace</small></span></Link>
      <nav id="workspace-nav" aria-label="Workspace navigation" className={`cf-nav ${menuOpen?'is-open':''}`}>
        <div className="cf-nav-group"><p>Workspace</p>{primaryNav.map(([id,label,icon])=><Link key={id} prefetch={false} href={hrefForSection(id)} title={label} aria-label={label} aria-current={section===id?'page':undefined} onClick={event=>navigate(event,id)} className={`cf-nav-link ${section===id?'active':''}`}><span className="cf-nav-icon"><Icon name={icon} size={19}/></span>{label}</Link>)}</div>
        <details className="cf-nav-more" key={moreNav.some(group=>group.items.some(item=>item[0]===section))?'active-tool':'other-tool'} open={moreNav.some(group=>group.items.some(item=>item[0]===section))}><summary>More tools<Icon name="chevron" size={16}/></summary>{moreNav.map(group=><div className="cf-nav-group" key={group.group}><p>{group.group}</p>{group.items.map(([id,label,icon])=><Link key={id} prefetch={false} href={hrefForSection(id)} aria-label={label} aria-current={section===id?'page':undefined} onClick={event=>navigate(event,id)} className={`cf-nav-link ${section===id?'active':''}`}><span className="cf-nav-icon"><Icon name={icon} size={18}/></span>{label}</Link>)}</div>)}</details>
      </nav>
      <div className="cf-sidebar-footer"><button className="cf-sidebar-action" onClick={()=>setHomeModal(true)}><Icon name="home" size={17}/>Add a home</button><button className="cf-sidebar-action" onClick={()=>goTo('Settings')}><Icon name="lock" size={17}/>Settings & access</button>{demo?<Link className="cf-sidebar-action" href="/demo/start">Demo guide ↗</Link>:<button className="cf-sidebar-action" onClick={async()=>{await supabase!.auth.signOut();router.push('/login');}}>Sign out</button>}</div>
    </aside>
    <div className="cf-main">
      <header className="cf-topbar">
        <div className="ct-brand"><button className="ct-icon-button" aria-label="Toggle navigation" aria-expanded={menuOpen} aria-controls="workspace-nav" onClick={()=>setMenuOpen(!menuOpen)}><Icon name="menu"/></button><strong>CareFlow</strong></div>
        <label className="ct-location"><Icon name="home" size={17}/><span className="sr-only">Current location</span><select value={homeId} onChange={e=>{setMetricsScope('house');setHomeId(e.target.value);setSearch('');setFilter('All');}}>{!data.homes.length&&<option value="">No homes</option>}{data.homes.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        {searchable&&<label className="ct-search"><Icon name="search" size={18}/><span className="sr-only">Search this view</span><input type="search" name="workspaceSearch" autoComplete="off" spellCheck={false} placeholder={section==='Staff directory'?'Search people or employee codes…':section==='Time approvals'?'Search employee names or dates…':'Search records…'} value={search} onChange={e=>setSearch(e.target.value)}/></label>}
        <div className="ct-tools"><button className="ct-icon-button ct-help" aria-label="Help" onClick={()=>goTo('Help')}><Icon name="help"/></button><button className="ct-icon-button" aria-label={`${overdue.length} overdue notifications`} onClick={()=>{goTo('Calendar');setFilter('Overdue');}}><Icon name="bell"/>{overdue.length>0&&<span className="ct-badge">{overdue.length}</span>}</button><button className="cf-avatar" aria-label="Profile and settings" onClick={()=>goTo('Settings')}>{demo?'D':'C'}</button></div>
      </header>
      {!demo&&sampleDataOnly&&<div className="cf-demo"><span><strong>Private test workspace</strong><span className="cf-demo-separator">·</span> Fictional information only.</span><Link href="/setup">Production setup →</Link></div>}{demo&&<div className="cf-demo"><span><strong>Interactive demo</strong><span className="cf-demo-separator">·</span> Sample changes stay in this browser.</span><Link href="/demo/start">Demo guide →</Link></div>}
      <div id="workspace-content" tabIndex={-1} className="cf-content cf-view-enter" key={section+homeId}>
        {error&&<div className="cf-error" role="alert">{error}{!editing&&!homeModal&&<button className="ml-3 underline" onClick={retry}>Retry</button>}</div>}
        {notice&&<div className="cf-notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice('')}>×</button></div>}
        <div className="cf-heading"><div><p className="cf-eyebrow">{isOverview?'A clearer view of your home':'CareFlow workspace'}</p><h1>{sectionLabel(section)}</h1><p className="cf-subtitle">{isOverview?'Keep the important things moving. See what needs attention, who owns it, and what comes next.':section==='Your team'?'Explore five assistant roles with fictional scenarios and human review.':section==='Activity history'?'A history of changes across this home.':section==='Settings'?'Manage your workspace and review your access.':section==='Connected tools'?'Connect selected Google tools and plan your next property search.':section==='Weekly review'?'Prepare the owner’s working agenda, assign follow-ups, and record human decisions.':section==='Compliance tracker'?'Compare houses, find evidence gaps, and review the records behind every score.':section==='Support Documents'?'Find Oregon support forms, instructions, and document-review resources.':section==='Calendar'?'See upcoming and overdue tasks, organized by their due dates.':section==='Approvals'?'Review the evidence and make a clear decision on work awaiting approval.':section==='Templates'?'Start recurring work with an editable checklist and a named owner.':section==='Reports'?'Review this home’s progress and export the records for your next meeting.':section==='Staff directory'?'Your team, their roles, and the homes they support.':section==='Shift coverage'?'A clear view of who is working and where you need cover.':section==='Time approvals'?'Review hours carefully, then send approved time to payroll preparation.':section==='Payroll preparation'?'Review approved hours and prepare a clear gross-pay worksheet.':section==='Expenses'?'Keep household spending organized and ready for review.':section==='Document reader'?'Turn source documents into drafts you can check and save.':section==='QuickBooks'?'Manage your connection and review the imported directory.':'Keep evidence, responsibilities, and follow-up together.'}</p></div><div className="flex flex-wrap gap-2">{home&&(isOverview||categories.includes(section as Category)||section==='Calendar'||section==='Approvals')&&<button className="cf-secondary" onClick={exportPacket}>↓ Export review</button>}{home&&writable&&!panelOnly&&section!=='House checklist'&&section!=='Approvals'&&section!=='Your team'&&section!=='Settings'&&section!=='Activity history'&&<button className="cf-primary" onClick={()=>createEntry(categories.includes(section as Category)?section as Category:'Residents')}>+ Add record</button>}</div></div>
        {!data.homes.length?<div className="cf-panel cf-empty"><h2>Create your first home</h2><p>Each home has its own records, readiness queue, and review packet.</p><button className="cf-primary mt-5" onClick={()=>setHomeModal(true)}>+ Add a home</button></div>:<>
        {isOverview&&home&&<DashboardOverview key={homeId} records={records} residents={data.residents??[]} home={home} onGo={goTo} onCreate={(category,title)=>{if(category==='Staff orientation')goTo('Staff directory');else createEntry(category,title);}} writable={writable} query={search}/>}
        {isOverview&&<TodayAttention key={homeId} entries={data.entries} homeId={homeId} homeName={home?.name||'Selected home'} onOpen={entry=>{setError('');setFile(null);setEditing(entry);}}/>}
        {operationSections.includes(section)&&<OperationsDemo key={section+homeId} demo={demo} ownerId={userId} homes={data.homes} homeId={homeId} section={section} query={search} onGo={goTo}/>}
        {section==='Document reader'&&<DocumentReaderHub demo={demo} residents={data.residents??[]} homeId={homeId} writable={writable} onResidents={()=>goTo('Residents')} onStart={resident=>startResidentDocument(resident,'mar',localDate().slice(0,7))}/>}
        {(section==='Connected tools'||section==='QuickBooks')&&<QuickbooksConnection key={'intuit-'+homeId} demo={demo} owner={home?.owner_id===userId} homeId={homeId}/>}
        {section==='Connected tools'&&<ConnectedTools key={homeId} demo={demo} allowed={!!home&&canApprove} homeName={home?.name||'Your home'}/>}
        {section==='Weekly review'&&<WeeklyReview entries={data.entries} homeId={homeId} homeName={home?.name||'Your home'} writable={writable} onOpen={entry=>{setFile(null);setEditing(entry);}} onTemplate={useTemplate} onExport={exportPacket}/>}
        {section==='Residents'&&<ResidentWorkspace key={homeId} residents={data.residents??[]} entries={data.entries} homes={data.homes} homeId={homeId} canManage={canApprove} writable={writable} onResident={saveResident} onPack={startMonthlyPack} onDocument={startResidentDocument} onOpen={entry=>{setFile(null);setEditing(entry);}} onEvidence={openEvidence}/> }
        {section==='Compliance tracker'&&<ComplianceTracker residents={data.residents??[]} onResidents={()=>goTo('Residents')} initialScope={metricsScope} entries={data.entries} homes={data.homes} homeId={homeId} writable={writable} canApprove={canApprove} onHome={id=>{setMetricsScope('house');setHomeId(id);setSearch('');setFilter('All');}} onOpen={entry=>{setFile(null);setEditing(entry);}} onDraft={entry=>{setFile(null);setEditing(entry);}} onEvidence={openEvidence} onTemplate={useTemplate} onCalendar={()=>goTo('Calendar')}/>}
        {!operationSections.includes(section)&&section!=='QuickBooks'&&section!=='Document reader'&&(panelOnly||section==='House checklist')&&<DashboardViews section={section} records={records} homes={data.homes} homeId={homeId} writable={writable} onTemplate={useTemplate} onHome={id=>{setHomeId(id);goTo('Readiness center');}} onAddHome={()=>setHomeModal(true)} onExport={exportPacket} onArea={goTo}/>}
        {section==='Calendar'&&<p className="cf-agenda-note">Due-date agenda · Unfinished tasks are ordered by date. Open a record to change its owner or deadline. Your home’s license review is {dateLabel(home?.license_due||'')}. This calendar does not schedule appointments or shifts.</p>}
        {section==='Approvals'&&<p className="cf-agenda-note">Review notes and evidence before marking a record complete. {canApprove?'You can approve records from their details.':'Only an owner or administrator can mark records complete.'}</p>}
        {panelOnly?null:section==='Your team'?(demo?<TeamLab key={homeId} homeName={home?.name||'Sample home'}/>:<ManagerChat key={homeId} homeId={homeId} homeName={home?.name||'Select a home'} allowed={!!home&&canApprove}/>):section==='Activity history'?<section className="cf-panel"><h2>Activity history</h2><p className="mt-2 text-sm text-[#718177]">{demo?'Sample change history in this browser.':'Database-generated change history. Times are shown in your local timezone.'}</p><div className="mt-5">{data.activity.filter(a=>a.home_id===homeId).length?data.activity.filter(a=>a.home_id===homeId).map(a=><article className="cf-activity" key={a.id}><span className="cf-activity-dot"/><div><p className="font-medium">{a.action}</p><p className="mt-1 text-xs text-[#718177]">{new Date(a.created_at).toLocaleString()} · {a.actor_id==='demo'?'Demo user':a.actor_id===userId?'You':'Workspace member'}</p></div></article>):<p className="cf-empty">No changes yet. Add or update a record to start the history.</p>}</div></section>:section==='Settings'?<section className="cf-panel"><h2>Workspace settings</h2><dl className="cf-settings"><dt>Home</dt><dd>{home?.name}</dd><dt>Program</dt><dd>Oregon Residential Treatment Home</dd><dt>Your access</dt><dd>{canApprove?'Owner / administrator':roles[homeId]||'Read only'}</dd><dt>Storage</dt><dd>{demo?'Sample data in this browser':'Connected Supabase database'}</dd><dt>Approval</dt><dd>Owners and administrators approve completed records.</dd></dl>{demo&&<><p className="mt-6 text-sm text-[#718177]">Reset removes sample edits from this browser and restores fictional examples.</p><button className="cf-secondary mt-4" onClick={()=>{if(!window.confirm('Reset the sample workspace? Your sample edits will be removed.'))return;try{const next=normalizeResidentWorkspace(sampleWorkspace(),localDate());commit(next);localStorage.removeItem(operationsKey);setHomeId(next.homes[0].id);setNotice('Sample workspace reset.');}catch(e){setError((e as Error).message);}}}>Reset sample workspace</button></>}{!demo&&home&&<HomeAccess key={home.id} homeId={home.id} owner={home.owner_id===userId}/>}<p className="mt-6"><Link className="text-sm underline text-[#235a45]" href="/setup">View production setup and access provisioning</Link></p></section>:<section className="cf-panel cf-records"><div className="cf-list-header"><div><h2>{isOverview?'Priority queue':section==='Calendar'?'Upcoming & overdue':section==='Approvals'?'Waiting for a decision':section==='House checklist'?'Saved house checks':sectionLabel(section)}</h2><p className="mt-1 text-sm text-[#718177]">{isOverview?'The next steps that keep your home moving.':`${shown.length} record${shown.length===1?'':'s'} in this view`}</p></div><div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="search">Search records</label><input ref={searchRef} id="search" className="cf-input cf-search" placeholder="Search records…" value={search} onChange={e=>setSearch(e.target.value)}/><label className="sr-only" htmlFor="status-filter">Filter by status</label><select id="status-filter" className="cf-input !w-auto" value={filter} onChange={e=>setFilter(e.target.value)}>{[... (section==='Approvals'?['All']:['All','Open','In review']),...(!isOverview&&section!=='Calendar'&&section!=='Approvals'?['Complete']:[]),'Overdue'].map(v=><option key={v}>{v}</option>)}</select></div></div>
          {shown.length?<div className="cf-record-list">{shown.map(e=><article key={e.id} className="cf-record"><span className={`cf-record-symbol ${e.status==='Complete'?'done':''}`} aria-hidden="true"><Icon name={e.status==='Complete'?'check':e.category==='Incidents'?'flag':'file'} size={18}/></span><div className="min-w-0 flex-1"><p className="cf-record-area">{e.category}</p><button className="cf-record-title" onClick={()=>{setFile(null);setEditing(e);}}>{e.title}</button><p className="mt-1 text-sm text-[#718177]">{e.subject||'No subject'} · {e.assignee||'Unassigned'}</p>{e.evidence_name&&<button className="mt-2 text-xs underline text-[#235a45]" onClick={()=>openEvidence(e)}>↓ {e.evidence_name}</button>}</div><div className="cf-record-meta"><span className={`cf-badge ${e.status==='Complete'?'green':isOverdue(e)?'red':e.status==='In review'?'purple':'amber'}`}>{isOverdue(e)?'Overdue':e.status}</span><p className="mt-2 text-xs text-[#718177]">{dateLabel(e.due_date)}{e.priority==='High'?' · High priority':''}</p></div></article>)}</div>:<div className="cf-empty"><h3>{search||filter!=='All'?'No matching records':isOverview?'You’re all caught up.':'No records yet.'}</h3><p>{search||filter!=='All'?'Try a different search or status.':section==='House checklist'?'Use a template above to start your first house check.':section==='Approvals'?'There are no records waiting for review.':'Add a record to track evidence and follow-up for this home.'}</p>{(search||filter!=='All')&&<button className="cf-secondary mt-4" onClick={()=>{setSearch('');setFilter('All');searchRef.current?.focus();}}>Clear filters</button>}{writable&&section!=='Approvals'&&section!=='House checklist'&&!search&&filter==='All'&&<button className="cf-secondary mt-4" onClick={()=>createEntry(categories.includes(section as Category)?section as Category:'Residents')}>+ Add record</button>}</div>}
        </section>}</>}
        <footer className="cf-footer"><span style={{display:'block',marginBottom:8,fontWeight:500}}>Developed by OASISWEB&amp;AI</span>CareFlow · Record readiness supports your review; it does not certify regulatory compliance.{!storageReady&&<span className="text-red-700"> Browser storage is unavailable.</span>}</footer>
      </div>
    </div>
    <dialog ref={entryDialog} aria-label="Record details" className="cf-dialog" onCancel={()=>setEditing(null)} onClose={()=>setEditing(null)}>
      {editing&&<form onSubmit={saveEntry} key={editing.id||'new'}><div className="cf-dialog-header"><div><p className="cf-eyebrow">{home?.name}</p><h2>{editing.id?'Record details':'Add a record'}</h2></div><button type="button" aria-label="Close record" onClick={()=>setEditing(null)} disabled={busy}>×</button></div>{error&&<div role="alert" className="cf-error">{error}</div>}<p className="cf-subtitle">{requirements.find(r=>r.id===requirementId(editing))?`Checklist: ${requirements.find(r=>r.id===requirementId(editing))!.name}. Save to update the linked readiness metric.`:null}</p><fieldset disabled={!writable||busy}><ResidentDocumentEditor entry={editing} residents={data.residents??[]} file={file} demo={demo} onChange={update=>setEditing(current=>current?update(current):current)}/><div className="cf-form-grid"><Field label="Task title" name="title" value={editing.title} required maxLength={200}/><label>Area<select name="category" className="cf-input" value={editing.category} onChange={event=>{const value=event.target.value as Category;setEditing(current=>current?{...current,category:value}:current);}}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><Field label="Subject / reference" name="subject" value={editing.subject} maxLength={200}/><Field label="Assigned to" name="assignee" value={editing.assignee} maxLength={120}/><Field label="Due date" name="due_date" type="date" value={editing.due_date} required/><label>Priority<select name="priority" className="cf-input" defaultValue={editing.priority}><option>Normal</option><option>High</option></select></label><label>Status<select name="status" className="cf-input" defaultValue={editing.status}><option>Open</option><option>In review</option>{canApprove||editing.status==='Complete'?<option disabled={!canApprove}>Complete</option>:null}</select></label><label className="sm:col-span-2">Notes / evidence summary<textarea name="notes" className="cf-input min-h-28" defaultValue={visibleNotes(editing.notes)} maxLength={10000}/></label>{!demo&&<label className="sm:col-span-2">Attach evidence (PDF, DOCX, PNG, JPEG, TXT · 10 MB max)<input className="cf-input" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,text/plain" onChange={e=>setFile(e.target.files?.[0]??null)}/>{editing.evidence_name&&<span className="text-xs font-normal">Current attachment: {editing.evidence_name}. A new upload replaces the reference.</span>}</label>}</div></fieldset>{editing.title.startsWith('House check · ')&&<p className="mt-4 text-xs text-[#718177]">Keep the “House check · ” title prefix and Inspection binder area to include this record in House checklist.</p>}{demo&&<p className="mt-4 text-xs text-[#718177]">Sample workspace saves text only. File storage becomes available in the connected workspace.</p>}<div className="cf-dialog-actions"><button type="button" className="cf-secondary" onClick={()=>setEditing(null)} disabled={busy}>Close</button>{writable&&<button type="submit" className="cf-primary" disabled={busy}>{busy?'Saving…':'Save record'}</button>}</div></form>}
    </dialog>
    <dialog ref={homeDialog} aria-label="Add a home" className="cf-dialog" onCancel={()=>setHomeModal(false)} onClose={()=>setHomeModal(false)}>{homeModal&&<form onSubmit={saveHome}><div className="cf-dialog-header"><h2>Add a home</h2><button type="button" aria-label="Close home form" onClick={()=>setHomeModal(false)}>×</button></div>{error&&<div role="alert" className="cf-error">{error}</div>}<div className="space-y-5"><Field label="Home name" name="name" required maxLength={120}/><Field label="License review date" name="license_due" type="date" required/></div><div className="cf-dialog-actions"><button type="button" className="cf-secondary" onClick={()=>setHomeModal(false)} disabled={busy}>Cancel</button><button type="submit" className="cf-primary" disabled={busy}>{busy?'Saving…':'Add home'}</button></div></form>}</dialog>
  </main>;
}
function Field({label,name,value,type='text',required=false,maxLength}:{label:string;name:string;value?:string;type?:string;required?:boolean;maxLength?:number}) {return <label>{label}<input name={name} className="cf-input" type={type} defaultValue={value} required={required} maxLength={maxLength}/></label>;}
