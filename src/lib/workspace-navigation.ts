import { navigation } from './dashboard.ts';
import { operationSections } from './operation-sections.ts';
export const beforeNavigationEvent='careflow-before-navigate';
const sections=[...new Set([...navigation.flatMap(group=>group.items.map(item=>item[0])),...operationSections])];
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const bySlug=new Map(sections.map(section=>[slug(section),section]));
export function sectionFromSearch(search:string,fallback:string){return bySlug.get(new URLSearchParams(search).get('view')||'')||fallback;}
export function sectionHref(pathname:string,search:string,section:string){
 if(!pathname.startsWith('/')||pathname.startsWith('//')||!sections.includes(section))throw new Error('Invalid workspace destination.');
 const params=new URLSearchParams(search);params.set('view',slug(section));return `${pathname}?${params.toString()}`;
}
export function isPlainNavigation(event:{button:number;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean;defaultPrevented:boolean}){return !event.defaultPrevented&&event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;}
export function sectionLinkHref(pathname:string,search:string,section:string,basePath=''){
 if(basePath&&!/^\/[A-Za-z0-9_-]+$/.test(basePath))throw new Error('Invalid application base path.');
 const path=basePath&&pathname===basePath?'/':basePath&&pathname.startsWith(basePath+'/')?pathname.slice(basePath.length):pathname;
 // Next Link adds its configured basePath; native history uses sectionHref instead.
 return sectionHref(path,search,section);
}
