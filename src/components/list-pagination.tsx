'use client';
export default function ListPagination({page,pages,total,from,to,label,onPage}:{page:number;pages:number;total:number;from:number;to:number;label:string;onPage:(page:number)=>void}){
 return <nav className="cf-pagination" aria-label={`${label} pages`}><p role="status" aria-live="polite" aria-atomic="true">{total?`Showing ${from}–${to} of ${total} ${label}`:`No ${label} to show`}</p>{pages>1&&<div><button type="button" className="cf-secondary" aria-label={`Previous page of ${label}`} disabled={page===1} onClick={()=>onPage(page-1)}>Previous</button><span>Page {page} of {pages}</span><button type="button" className="cf-secondary" aria-label={`Next page of ${label}`} disabled={page===pages} onClick={()=>onPage(page+1)}>Next</button></div>}</nav>;
}
