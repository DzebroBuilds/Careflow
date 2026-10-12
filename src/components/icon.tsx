import type { CSSProperties } from 'react';
const paths: Record<string,string> = {
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
 check:'M5 12l4 4L19 6', file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
 cross:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', flag:'M4 22V3 M4 3c5-4 11 4 16 0v11c-5 4-11-4-16 0',
 clock:'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
 arrow:'M4 12h16 M14 6l6 6-6 6', shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6', home:'M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8'
};
export default function Icon({name,size=20,style}:{name:string;size?:number;style?:CSSProperties}) {return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]||paths.file}/></svg>;}
