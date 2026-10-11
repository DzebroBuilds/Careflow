import type { Metadata } from "next";
import localFont from "next/font/local";
import { Sidebar } from "@/components/sidebar";
import { TopBar, type PaletteItem } from "@/components/topbar";
import { HOME_LIST, getCredentials, getResidents } from "@/lib/data";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [residents, creds] = await Promise.all([getResidents(), getCredentials()]);
  const items: PaletteItem[] = [
    { id: "p-over", label: "Overview", hint: "Readiness by home", group: "Page", href: "/" },
    { id: "p-res", label: "Residents", hint: "Care files", group: "Page", href: "/residents" },
    { id: "p-staff", label: "Staff", hint: "Credentials and training", group: "Page", href: "/staff" },
    { id: "p-med", label: "Medications", hint: "Orders and coverage", group: "Page", href: "/medications" },
    { id: "p-mon", label: "Monthly files", hint: "MAR, ONA, Safety Plan", group: "Page", href: "/monthly" },
    ...HOME_LIST.map((h) => ({ id: "h-" + h.key, label: h.name, hint: "Home dashboard", group: "Home", href: "/homes/" + h.key })),
    ...residents.map((r) => ({ id: "r-" + r.id, label: `Resident ${r.id}`, hint: `${r.homeName} · ${r.room}`, group: "Resident", href: "/residents" })),
    ...[...new Set(creds.map((c) => c.staff))].map((n) => ({ id: "s-" + n, label: n, hint: "Staff", group: "Staff", href: "/staff" })),
  ];
  return (
    <html lang="en" suppressHydrationWarning className={`${publicSans.variable} ${plexMono.variable}`}>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script dangerouslySetInnerHTML={{ __html: 'try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}' }} />
      </head>
      <body>
        <div className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[244px_minmax(0,1fr)] md:grid-rows-1">
          <Sidebar />
          <main className="min-h-0 overflow-y-auto">
            <TopBar items={items} />
            <div className="mx-auto w-full max-w-[1240px] px-4 pt-5 pb-8 md:px-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
