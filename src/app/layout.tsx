import type { Metadata } from "next";
import localFont from "next/font/local";
import { Sidebar } from "@/components/sidebar";
import { TopBar, type PaletteItem } from "@/components/topbar";
import { getCredentials, getHomeSummaries, getResidents } from "@/lib/data";
import { can, ROLE_LABEL, type Permission } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

// Self-hosted via @fontsource: no runtime request to Google, works offline and in CI.
const publicSans = localFont({
  src: "../../node_modules/@fontsource-variable/public-sans/files/public-sans-latin-wght-normal.woff2",
  variable: "--font-public-sans",
  weight: "100 900",
  display: "swap",
});
const plexMono = localFont({
  src: [
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "500" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Careflow", template: "%s · Careflow" },
  description: "Compliance readiness for Oregon group homes.",
};

const MAIN: { href: string; label: string; hint: string; p: Permission }[] = [
  { href: "/", label: "Overview", hint: "Readiness by home", p: "view:overview" },
  { href: "/today", label: "Today", hint: "Ranked action queue", p: "view:today" },
  { href: "/residents", label: "Residents", hint: "Care files", p: "view:residents" },
  { href: "/staff", label: "Staff", hint: "Credentials and training", p: "view:staff" },
  { href: "/medications", label: "Medications", hint: "Orders and coverage", p: "view:medications" },
  { href: "/monthly", label: "Monthly files", hint: "MAR, ONA, Safety Plan", p: "view:monthly" },
  { href: "/incidents", label: "Incidents", hint: "Reporting clocks", p: "view:incidents" },
  { href: "/audit", label: "Audit simulator", hint: "What a reviewer would find", p: "view:audit" },
];

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSession();
  const shell = async () => {
    if (!user) return null;
    const [residents, creds, homes] = await Promise.all([getResidents(), getCredentials(), can(user.role, "view:homes") ? getHomeSummaries() : Promise.resolve([])]);
    const main = MAIN.filter((m) => can(user.role, m.p));
    const homeLinks = homes.map((h) => ({ href: `/homes/${h.key}`, label: h.name }));
    const showAgency = can(user.role, "view:agency");
    const items: PaletteItem[] = [
      ...main.map((m) => ({ id: "p-" + m.href, label: m.label, hint: m.hint, group: "Page", href: m.href })),
      ...homeLinks.map((h) => ({ id: "h-" + h.href, label: h.label, hint: "Home dashboard", group: "Home", href: h.href })),
      ...(showAgency ? [{ id: "p-agency", label: "Control center", hint: "All clients", group: "Page", href: "/agency" }] : []),
      ...(can(user.role, "view:residents") ? residents.map((r) => ({ id: "r-" + r.id, label: `Resident ${r.id}`, hint: `${r.homeName} · ${r.room}`, group: "Resident", href: "/residents" })) : []),
      ...(can(user.role, "view:staff") ? [...new Set(creds.map((c) => c.staff))].map((n) => ({ id: "s-" + n, label: n, hint: "Staff", group: "Staff", href: "/staff" })) : []),
    ];
    const scope = user.home ? (homes[0]?.name ?? `Home ${user.home}`) : user.role === "AGENCY" ? "All clients" : "All homes";
    return { items, main, homeLinks, showAgency, scope };
  };
  const s = await shell();

  return (
    <html lang="en" suppressHydrationWarning className={`${publicSans.variable} ${plexMono.variable}`}>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}' }} />
      </head>
      <body>
        {user && s ? (
          <div className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[244px_minmax(0,1fr)] md:grid-rows-1">
            <Sidebar main={s.main.map(({ href, label }) => ({ href, label }))} homes={s.homeLinks} showAgency={s.showAgency}
              user={{ name: user.name, role: ROLE_LABEL[user.role], scope: s.scope }} />
            <main className="min-h-0 overflow-y-auto">
              <TopBar items={s.items} />
              <div className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-8 md:px-8">{children}</div>
            </main>
          </div>
        ) : children}
      </body>
    </html>
  );
}
