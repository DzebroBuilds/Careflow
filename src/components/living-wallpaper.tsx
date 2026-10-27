'use client';
import { useEffect,useRef,useState,useSyncExternalStore } from 'react';
import './living-wallpaper.css';
const motionQuery='(prefers-reduced-motion: reduce)';
function subscribeMotion(callback:()=>void){const query=window.matchMedia(motionQuery);query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);}
function reducedMotion(){return window.matchMedia(motionQuery).matches;}
export default function LivingWallpaper(){
 const reduced=useSyncExternalStore(subscribeMotion,reducedMotion,()=>true);
 const [paused,setPaused]=useState(false),[visible,setVisible]=useState(true);
 const scene=useRef<HTMLDivElement>(null);
 useEffect(()=>{const target=scene.current;if(!target)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));observer.observe(target);return()=>observer.disconnect();},[]);
 const stopped=paused||reduced||!visible;
 return <><div ref={scene} className="site-wallpaper" data-paused={stopped} aria-hidden="true"><div className="site-wallpaper-image" style={{backgroundImage:`url(${process.env.NEXT_PUBLIC_CAREFLOW_BASE_PATH||''}/careflow-home-background-v1.webp)`}}/><div className="site-wallpaper-mist"/><div className="site-wallpaper-light"/><div className="site-wallpaper-veil"/></div><button className="site-wallpaper-control" type="button" disabled={reduced} aria-pressed={paused||reduced} onClick={()=>setPaused(value=>!value)}><span aria-hidden="true">{paused||reduced?'▷':'Ⅱ'}</span>{reduced?'Scenery motion off':paused?'Play scenery':'Pause scenery'}</button></>;
}
