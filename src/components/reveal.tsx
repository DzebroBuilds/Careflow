'use client';
import { useEffect } from 'react';
export default function Reveal() {
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});
  document.querySelectorAll('[data-reveal]').forEach(element=>{if(element.getBoundingClientRect().top>window.innerHeight)element.classList.add('will-reveal');observer.observe(element);});
  return ()=>observer.disconnect();
 },[]);
 return null;
}
