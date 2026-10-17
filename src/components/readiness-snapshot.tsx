import { residentPeriodMetrics, type Resident } from '@/lib/residents';
import { complianceMetrics } from '@/lib/metrics';
import { localDate, type Entry, type Home } from '@/lib/workspace';
import './metrics-center.css';

export default function ReadinessSnapshot({residents=[],entries,homes,homeId,onOpen}:{residents?:Resident[];entries:Entry[];homes:Home[];homeId:string;onOpen:(scope:'overall'|'house')=>void}) {
  const metrics=complianceMetrics(entries,homes,localDate());
  const house=metrics.houses.find(item=>item.home.id===homeId);
  const monthly=residentPeriodMetrics(entries,residents,homes,localDate().slice(0,7),localDate());
  return <section className="cf-metrics-snapshot" aria-label="House and CareFlow metrics"><button onClick={()=>onOpen('house')}><div><p className="cf-eyebrow">THIS HOUSE</p><h2>{house?.home.name||'Choose a house'}</h2><p>{house?.fileTypes??0}/20 document types have files<br/>{house?.missingFiles??0} records need files · {house?.overdue??0} overdue</p></div><strong>{house?.score??'—'}<small>/100</small></strong><span className="cf-metrics-snapshot-action">Inspect house metrics & files <span aria-hidden="true">→</span></span></button><button onClick={()=>onOpen('overall')}><div><p className="cf-eyebrow">ALL YOUR HOUSES</p><h2>CareFlow overall</h2><p>{homes.length} houses · {metrics.files} attached files<br/>{metrics.fileTypes}/{metrics.requiredTypes} document types have evidence</p></div><strong>{metrics.score??'—'}<small>/100</small></strong><span className="cf-metrics-snapshot-action">Compare houses & track evidence <span aria-hidden="true">→</span></span></button><p className="cf-metrics-snapshot-caption">Resident monthly documents: {monthly.files}/{monthly.expected} have files · {monthly.missing} not started. Scores above reflect the house starter checklist; inspect metrics for resident coverage.</p></section>;
}
