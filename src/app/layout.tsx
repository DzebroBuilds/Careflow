import type { Metadata } from "next";
import localFont from "next/font/local";
import { Sidebar } from "@/components/sidebar";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${plexMono.variable}`}>
      <body>
        <div className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[244px_minmax(0,1fr)] md:grid-rows-1">
          <Sidebar />
          <main className="min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1240px] px-4 py-6 md:px-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
