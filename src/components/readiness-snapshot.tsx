import { houseCompliance, overallCompliance, requirements } from '@/lib/compliance';
import { localDate, type Entry, type Home } from '@/lib/workspace';

export default function ReadinessSnapshot({entries,homes,homeId,onOpen}:{entries:Entry[];homes:Home[];homeId:string;onOpen:()=>void}) {
  const result=houseCompliance(entries,homeId,localDate());
  const overall=overallCompliance(entries,homes,localDate());
  return <section className="cf-readiness-snapshot" aria-label="Compliance readiness snapshot"><div><p className="cf-eyebrow">Your readiness at a glance</p><h2>Every next step,<br/>backed by evidence.</h2><p>{result.missing?`${result.missing} document types still need linked evidence records.`:'Every starter document type has a linked record. Review outstanding evidence checks next.'}</p><button className="cf-primary" onClick={onOpen}>Review compliance tracker →</button></div><div className="cf-snapshot-numbers"><div><span>This house</span><strong>{result.score}<small>/100</small></strong><p>{requirements.length-result.missing} of {requirements.length} types linked</p></div><div><span>Across all houses</span><strong>{overall??'—'}<small>/100</small></strong><p>{homes.length} home{homes.length===1?'':'s'} in your workspace</p></div><p className="cf-snapshot-caption">Starter checklist readiness · Human document review required</p></div></section>;
}
