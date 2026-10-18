import type { Metadata } from "next";
import "./globals.css";
import "./careflow-vertex.css";

export const metadata: Metadata = {
  title: "CareFlow | Managed Readiness for Oregon RTH Operators",
  description: "Managed documentation-readiness service in development for small Oregon RTH operators. Explore the fictional-data demo and discuss a founding pilot.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
