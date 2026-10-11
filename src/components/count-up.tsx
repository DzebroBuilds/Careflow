"use client";
import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `value` once on mount. Renders the final value first so SSR and no-JS stay correct. */
export function CountUp({ value, delay = 0, duration = 700 }: { value: number; delay?: number; duration?: number }) {
  const [n, setN] = useState(value);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setN(Math.round(value * (1 - Math.pow(1 - t, 4)))); // ease-out quart
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, delay, duration]);

  return <span className="tabular-nums">{n}</span>;
}
