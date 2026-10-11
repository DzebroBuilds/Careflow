"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/today", label: "Today" },
  { href: "/residents", label: "Residents" },
  { href: "/staff", label: "Staff" },
  { href: "/medications", label: "Medications" },
  { href: "/monthly", label: "Monthly files" },
  { href: "/audit", label: "Audit simulator" },
] as const;

const HOMES = [
  { href: "/homes/A", label: "Alder House" },
  { href: "/homes/B", label: "Birch Lane" },
  { href: "/homes/C", label: "Cascade Court" },
  { href: "/homes/D", label: "Dogwood Place" },
] as const;

const isOn = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Sidebar() {
  const path = usePathname();
  const found = NAV.findIndex((n) => isOn(path, n.href));
  const idx = Math.max(0, found);
  return (
    <>
      <nav aria-label="Primary" className="glass sticky top-0 z-30 flex gap-1 overflow-x-auto rounded-none border-x-0 border-t-0 p-2 md:hidden">
        {[...NAV, ...HOMES, { href: "/agency", label: "Control center" }].map((n) => (
          <Link key={n.href} href={n.href} aria-current={isOn(path, n.href) ? "page" : undefined}
            className={`press flex h-9 shrink-0 items-center rounded-md px-3 font-medium ${isOn(path, n.href) ? "bg-accent-soft text-accent" : "text-fg-2"}`}>
            {n.label}
          </Link>
        ))}
      </nav>
      <aside className="hidden flex-col gap-5 bg-side p-3 text-side-fg md:flex">
        <div className="flex items-center gap-2.5 px-2 pt-1 text-[15px] font-semibold tracking-wide text-white">
          <span className="grid size-[26px] place-items-center rounded-md bg-accent font-mono text-[13px] text-accent-fg">C</span>
          Careflow
        </div>
        <nav aria-label="Primary" className="relative flex flex-col gap-0.5">
          <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-side-dim">Workspace</span>
          <div className="relative flex flex-col gap-0.5">
            <span aria-hidden className="nav-pill absolute inset-x-0 top-0 h-[34px] rounded-md bg-side-2" style={{ transform: `translateY(${idx * 36}px)`, opacity: found < 0 ? 0 : 1 }} />
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={isOn(path, n.href) ? "page" : undefined}
                className={`press relative flex h-[34px] items-center rounded-md px-2.5 font-medium ${found >= 0 && isOn(path, n.href) ? "text-white" : "hover:text-white"}`}>
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
        <nav aria-label="Homes" className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-side-dim">Homes</span>
          {HOMES.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}
              className={`press flex h-[34px] items-center rounded-md px-2.5 font-medium ${path === n.href ? "bg-side-2 text-white" : "hover:bg-side-2 hover:text-white"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Agency" className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-side-dim">Agency</span>
          <Link href="/agency" aria-current={path === "/agency" ? "page" : undefined}
            className={`press flex h-[34px] items-center rounded-md px-2.5 font-medium ${path === "/agency" ? "bg-side-2 text-white" : "hover:bg-side-2 hover:text-white"}`}>
            Control center
          </Link>
        </nav>
        <p className="mt-auto px-2 text-xs text-side-dim">Demo data. No real residents.</p>
      </aside>
    </>
  );
}
