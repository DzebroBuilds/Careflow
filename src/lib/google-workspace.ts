export const googleScopes = {
 files: 'https://www.googleapis.com/auth/drive.file',
 calendar: 'https://www.googleapis.com/auth/calendar.events.owned',
 contacts: 'https://www.googleapis.com/auth/contacts.readonly',
 email: 'https://www.googleapis.com/auth/gmail.send',
} as const;
export type GoogleService = keyof typeof googleScopes;
export function base64Utf8(text:string){return btoa(Array.from(new TextEncoder().encode(text),b=>String.fromCharCode(b)).join(''));}
function encodedHeader(text:string){const chunks:string[]=[];let part='';for(const character of text){if(new TextEncoder().encode(part+character).length>42){chunks.push(part);part='';}part+=character;}if(part)chunks.push(part);return chunks.map(s=>`=?UTF-8?B?${base64Utf8(s)}?=`).join('\r\n ');}
export function gmailMessage(to:string,subject:string,body:string){
 if(!/^[^\s@<>,;:\r\n]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(to)||/[\r\n]/.test(subject))throw new Error('Use one valid recipient and a single-line subject.');
 if(!subject.trim()||!body.trim())throw new Error('Add a subject and message.');
 const encoded=base64Utf8(body).match(/.{1,76}/g)?.join('\r\n')||'';
 return base64Utf8(`To: ${to}\r\nSubject: ${encodedHeader(subject)}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encoded}`).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function eventTimes(start:string,end:string){
 const a=new Date(start),b=new Date(end);
 if(!start||!end||!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||b<=a)throw new Error('Choose an end time after the start time.');
 return {start:{dateTime:a.toISOString()},end:{dateTime:b.toISOString()}};
}
export type DocElement={paragraph?:{elements?:{textRun?:{content?:string}}[]};table?:{tableRows?:{tableCells?:{content?:DocElement[]}[]}[]}};
export type GoogleDocument={documentId:string;title:string;revisionId?:string;body?:{content?:DocElement[]};tabs?:{documentTab?:{body?:{content?:DocElement[]}};childTabs?:GoogleDocument['tabs']}[]};
export function documentText(doc:GoogleDocument){
 const content=(items:DocElement[]):string=>items.map(e=>e.paragraph?.elements?.map(x=>x.textRun?.content||'').join('')||e.table?.tableRows?.map(r=>r.tableCells?.map(c=>content(c.content||[])).join('\t')).join('\n')||'').join('');
 const tabs=(items:NonNullable<GoogleDocument['tabs']>):string=>items.map(t=>content(t.documentTab?.body?.content||[])+tabs(t.childTabs||[])).join('\n');
 return doc.tabs?.length?tabs(doc.tabs):content(doc.body?.content||[]);
}
export function sheetRows(text:string){const rows=text.replace(/\r\n/g,'\n').split('\n');if(rows.at(-1)==='')rows.pop();if(rows.length>50)throw new Error('Use at most 50 rows per edit.');const values=rows.map(r=>r.split('\t'));if(values.some(r=>r.length>12))throw new Error('Use at most 12 columns per edit.');return values;}
export function sheetBounds(range:string){
 const match=/^(?:(?:'(?:[^'\r\n]|'')+'|[^'!\r\n]+)!)?([A-Za-z]{1,3})([1-9]\d{0,6})(?::([A-Za-z]{1,3})([1-9]\d{0,6}))?$/.exec(range);
 if(!match)throw new Error('Use a bounded range such as Training!A1:D10.');
 const column=(s:string)=>Array.from(s.toUpperCase()).reduce((n,c)=>n*26+c.charCodeAt(0)-64,0);
 const rows=Number(match[4]||match[2])-Number(match[2])+1,columns=column(match[3]||match[1])-column(match[1])+1;
 if(rows<1||columns<1||rows>50||columns>12)throw new Error('Choose a range of at most 50 rows and 12 columns.');
 return {rows,columns};
}
