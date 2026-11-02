import { documentData, monthEnd, templateFor, validPeriod, type Resident } from './residents.ts';
import type { Entry } from './workspace.ts';

/** Administrative checks only: no clinical interpretation or automatic approval. */
export function checkDocument(entry:Entry,residents:Resident[]):string[] {
  const template=templateFor(entry.document_type);
  if(!template)return [];
  const issues:string[]=[],data=documentData(entry.document_data);
  const resident=residents.find(r=>r.id===entry.resident_id&&r.home_id===entry.home_id);
  if(!resident)issues.push('Confirm a resident belonging to this house.');
  const period=entry.document_period||'';
  if(!validPeriod(period))issues.push('Choose a valid reporting month.');
  for(const field of template.fields)if(!data.fields[field.id]?.trim())issues.push(`${field.label}: not recorded.`);
  if(template.id!=='incident'&&!data.rows.length)issues.push('No dated entries have been recorded.');
  const seen=new Set<string>();
  data.rows.forEach((row,i)=>{
    for(const field of template.rowFields)if(!row[field.id]?.trim())issues.push(`Entry ${i+1}: ${field.label} is missing.`);
    if(row.date&&validPeriod(period)&&template.id!=='incident'&&(row.date<period+'-01'||row.date>monthEnd(period)))issues.push(`Entry ${i+1}: date is outside the reporting month.`);
    if(row.date&&resident&&row.date<resident.admission_date)issues.push(`Entry ${i+1}: date precedes the resident’s admission.`);
    const key=JSON.stringify(template.rowFields.map(field=>row[field.id]?.trim()||''));
    if(Object.values(row).some(v=>v.trim())&&seen.has(key))issues.push(`Entry ${i+1}: possible duplicate entry; compare with earlier rows.`);
    seen.add(key);
  });
  if(template.id==='incident'&&data.fields.incident_date&&validPeriod(period)&&!data.fields.incident_date.startsWith(period))issues.push('Incident date is outside the reporting month.');
  return issues;
}

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function documentPrintHtml(entry:Entry,resident?:Resident) {
  const template=templateFor(entry.document_type);
  if(!template)throw new Error('Choose a document type first.');
  const data=documentData(entry.document_data),e=escape;
  const fields=template.fields.map(f=>`<section><h3>${e(f.label)}</h3><p>${e(data.fields[f.id]||'Not recorded')}</p></section>`).join('');
  const rows=data.rows.map((row,i)=>`<article><h3>Entry ${i+1}</h3>${template.rowFields.map(f=>`<section><h4>${e(f.label)}</h4><p>${e(row[f.id]||'Not recorded')}</p></section>`).join('')}</article>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(template.name)} — ${e(resident?.name||'Unassigned')}</title><style>@page{size:A4;margin:18mm}body{font:12px/1.6 Arial,sans-serif;color:#20382c;max-width:760px;margin:24px auto}h1{font-size:25px}h2{font-size:17px}h3,h4{font-size:12px;margin:12px 0 3px}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px}header{border-bottom:2px solid #41674c;padding-bottom:15px}section,article{break-inside:avoid}article{border-top:1px solid #bbc8bd;margin-top:18px;padding-top:8px}footer{border-top:1px solid #bbc8bd;margin-top:24px;font-size:10px}@media print{button{display:none}body{margin:0}}</style></head><body><header><p>CareFlow · Resident document · Template ${entry.template_version||1}</p><h1>${e(template.name)}</h1><p>Resident: ${e(resident?.name||'Unassigned')}<br>Reference: ${e(resident?.reference_code||'Not recorded')}<br>Reporting month: ${e(entry.document_period||'Not recorded')}</p></header><p>Draft snapshot. May contain unsaved edits. Original attachment: ${e(entry.evidence_name||'None linked')}.</p>${data.fields.import_reference?`<p>Source reference: ${e(data.fields.import_reference)}</p>`:''}${fields}<h2>${template.id==='incident'?'Notifications':'Dated entries'}</h2>${rows||'<p>No entries recorded.</p>'}<footer>Exported ${e(new Date().toISOString())}. Typed names and initials are not electronic signatures. This export does not certify clinical or regulatory compliance.<br>Developed by OASISWEB&amp;AI</footer><button onclick="window.print()">Print / Save as PDF</button></body></html>`;
}
