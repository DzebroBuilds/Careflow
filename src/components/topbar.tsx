"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface PaletteItem { id: string; label: string; hint: string; group: string; href: string }

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setDark(t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }, [dark]);
  return { dark, toggle };
}

export function TopBar({ items }: { items: PaletteItem[] }) {
  const [open, setOpen] = useState(false);
  const { dark, toggle } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div className="glass sticky top-3 z-20 mx-4 mt-3 flex h-11 items-center gap-2 rounded-lg px-2 md:mx-8">
        <button
          onClick={() => setOpen(true)}
          className="press hov flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 text-left text-fg-3 hover:bg-surface-2"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-current stroke-[1.75]"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
          <span className="truncate">Search residents, staff, pages</span>
          <kbd className="ml-auto hidden rounded border border-line-strong bg-surface-2 px-1.5 font-mono text-[11px] sm:block">Ctrl K</kbd>
        </button>
        <button
          onClick={toggle}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          className="press hov grid size-8 place-items-center rounded-md text-fg-2 hover:bg-surface-2"
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] fill-none stroke-current stroke-[1.75]" strokeLinecap="round" strokeLinejoin="round">
            {dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></> : <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />}
          </svg>
        </button>
      </div>
      {open && <Palette items={items} onClose={() => setOpen(false)} />}
    </>
  );
}

// Opened from the keyboard hundreds of times a day, so it deliberately has no enter animation.
function Palette({ items, onClose }: { items: PaletteItem[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? items.filter((x) => `${x.label} ${x.hint} ${x.group}`.toLowerCase().includes(t)).slice(0, 30) : items.slice(0, 30);
  }, [q, items]);

  useEffect(() => { setI(0); }, [q]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [i]);

  const go = (x: PaletteItem | undefined) => { if (!x) return; onClose(); router.push(x.href); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" style={{ background: "var(--scrim)" }} onMouseDown={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Search"
        className="glass w-full max-w-[600px] overflow-hidden rounded-xl"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          else if (e.key === "ArrowDown") { e.preventDefault(); setI((n) => Math.min(results.length - 1, n + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setI((n) => Math.max(0, n - 1)); }
          else if (e.key === "Enter") go(results[i]);
        }}
      >
        <input
          autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search"
          className="h-[50px] w-full border-0 border-b border-line bg-transparent px-4 text-[15px] outline-none"
        />
        <div ref={listRef} role="listbox" className="max-h-[min(380px,50vh)] overflow-y-auto p-1.5">
          {results.length === 0 && <p className="p-6 text-center text-fg-3">No matches</p>}
          {results.map((x, n) => (
            <button
              key={x.id} role="option" aria-selected={n === i}
              onMouseMove={() => setI(n)} onClick={() => go(x)}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left ${n === i ? "bg-accent-soft" : ""}`}
            >
              <span className="truncate font-medium">{x.label}</span>
              <span className="shrink-0 text-xs text-fg-3">{x.group} · {x.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
