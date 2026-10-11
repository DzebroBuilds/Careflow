"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/residents", label: "Residents" },
  { href: "/staff", label: "Staff credentials" },
] as const;

export function Sidebar() {
  const path = usePathname();
  return (
    <>
    <nav aria-label="Primary" className="flex gap-1 overflow-x-auto bg-side p-2 md:hidden">
      {NAV.map((n) => {
        const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={`press flex h-9 shrink-0 items-center rounded-md px-3 font-medium text-side-fg ${on ? "bg-side-2 text-white" : ""}`}>
            {n.label}
          </Link>
        );
      })}
    </nav>
    <aside className="hidden flex-col gap-5 bg-side p-3 text-side-fg md:flex">
      <div className="flex items-center gap-2.5 px-2 pt-1 text-[15px] font-semibold tracking-wide text-white">
        <span className="grid size-[26px] place-items-center rounded-md bg-accent font-mono text-[13px] text-accent-fg">C</span>
        Careflow
      </div>
      <nav aria-label="Primary" className="flex flex-col gap-0.5">
        <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-side-dim">Workspace</span>
        {NAV.map((n) => {
          const on = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className={`press flex h-[34px] items-center rounded-md px-2.5 font-medium ${on ? "bg-side-2 text-white" : "hover:bg-side-2"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-auto px-2 text-xs text-side-dim">Demo data. No real residents.</p>
    </aside>
    </>
  );
}
