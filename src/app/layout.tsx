import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareFlow | Oregon RTH Readiness Workspace",
  description: "A clearer way for Oregon Residential Treatment Home operators to stay inspection-ready.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
