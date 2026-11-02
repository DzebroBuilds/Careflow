"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth/actions";

export interface NavLink { href: string; label: string }
export interface SidebarProps {
  main: NavLink[]; homes: NavLink[]; showAgency: boolean;
  user: { name: string; role: string; scope: string };
}

const isOn = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-0.5">
      <span className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-side-dim">{title}</span>
      {children}
    </nav>
  );
}

export function Sidebar({ main, homes, showAgency, user }: SidebarProps) {
  const path = usePathname();
  const found = main.findIndex((n) => isOn(path, n.href));
  const idx = Math.max(0, found);
  const all = [...main, ...homes, ...(showAgency ? [{ href: "/agency", label: "Control center" }] : [])];
  const link = (n: NavLink) => `press flex h-[34px] items-center rounded-md px-2.5 font-medium ${isOn(path, n.href) ? "bg-side-2 text-white" : "hover:bg-side-2 hover:text-white"}`;

  return (
    <>
      <nav aria-label="Primary" className="glass sticky top-0 z-30 flex gap-1 overflow-x-auto rounded-none border-x-0 border-t-0 p-2 md:hidden">
        {all.map((n) => (
          <Link key={n.href} href={n.href} aria-current={isOn(path, n.href) ? "page" : undefined}
            className={`press flex h-9 shrink-0 items-center rounded-md px-3 font-medium ${isOn(path, n.href) ? "bg-accent-soft text-accent" : "text-fg-2"}`}>
            {n.label}
          </Link>
        ))}
        <form action={logout} className="ml-auto shrink-0"><button className="press h-9 rounded-md px-3 font-medium text-fg-2">Sign out</button></form>
      </nav>

      <aside className="hidden flex-col gap-5 overflow-y-auto bg-side p-3 text-side-fg md:flex">
        <div className="flex items-center gap-2.5 px-2 pt-1 text-[15px] font-semibold tracking-wide text-white">
          <span className="grid size-[26px] place-items-center rounded-md bg-accent font-mono text-[13px] text-accent-fg">C</span>
          Careflow
        </div>
        {main.length > 0 && (
          <Group title="Workspace">
            <div className="relative flex flex-col gap-0.5">
              <span aria-hidden className="nav-pill absolute inset-x-0 top-0 h-[34px] rounded-md bg-side-2" style={{ transform: `translateY(${idx * 36}px)`, opacity: found < 0 ? 0 : 1 }} />
              {main.map((n) => (
                <Link key={n.href} href={n.href} aria-current={isOn(path, n.href) ? "page" : undefined}
                  className={`press relative flex h-[34px] items-center rounded-md px-2.5 font-medium ${found >= 0 && isOn(path, n.href) ? "text-white" : "hover:text-white"}`}>
                  {n.label}
                </Link>
              ))}
            </div>
          </Group>
        )}
        {homes.length > 0 && (
          <Group title={homes.length === 1 ? "Your home" : "Homes"}>
            {homes.map((n) => <Link key={n.href} href={n.href} aria-current={isOn(path, n.href) ? "page" : undefined} className={link(n)}>{n.label}</Link>)}
          </Group>
        )}
        {showAgency && (
          <Group title="Agency"><Link href="/agency" aria-current={path === "/agency" ? "page" : undefined} className={link({ href: "/agency", label: "" })}>Control center</Link></Group>
        )}
        <div className="mt-auto border-t border-side-line px-2 pt-3">
          <div className="truncate font-medium text-white">{user.name}</div>
          <div className="truncate text-xs text-side-dim">{user.role} · {user.scope}</div>
          <form action={logout}><button className="press hov mt-2 -ml-1.5 rounded-md px-1.5 py-1 text-[13px] text-side-fg hover:bg-side-2">Sign out</button></form>
        </div>
      </aside>
    </>
  );
}
