import type { CSSProperties } from 'react';
const paths: Record<string,string> = {
 pill:'M7 17L17 7 M4 20a6 6 0 0 1 0-8l8-8a6 6 0 0 1 8 8l-8 8a6 6 0 0 1-8 0', calendar:'M3 5h18v16H3z M7 2v6 M17 2v6 M3 11h18', folder:'M3 5h7l2 3h9v13H3z', chart:'M3 3v18h18 M6 16l5-6 4 3 5-7', lock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4', printer:'M6 9V3h12v6 M6 17H3V9h18v8h-3 M6 14h12v7H6z', menu:'M4 6h16 M4 12h16 M4 18h16', search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', help:'M12 17h.01 M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4', chevron:'M6 9l6 6 6-6', warning:'M12 3L2 21h20L12 3z M12 9v5 M12 17h.01',
 grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
 people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87',
 check:'M5 12l4 4L19 6', file:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
 cross:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z', flag:'M4 22V3 M4 3c5-4 11 4 16 0v11c-5 4-11-4-16 0',
 clock:'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
 arrow:'M4 12h16 M14 6l6 6-6 6', shield:'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6', home:'M3 10l9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8'
};
export default function Icon({name,size=20,style}:{name:string;size?:number;style?:CSSProperties}) {return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}><path d={paths[name]||paths.file}/></svg>;}
