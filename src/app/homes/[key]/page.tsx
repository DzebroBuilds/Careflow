import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { notFound } from "next/navigation";
import { CountUp } from "@/components/count-up";
import { MedsPanel, ResidentsPanel, StaffPanel, TrackingPanel } from "@/components/panels";
import { Meter, Tag } from "@/components/ui";
import { HOME_LIST, getHome } from "@/lib/data";

const TIER = { audit_ready: ["good", "Audit ready"], watch: ["warn", "Watch"], at_risk: ["bad", "At risk"] } as const;

export function generateStaticParams() { return HOME_LIST.map((h) => ({ key: h.key })); }

export async function generateMetadata({ params }: PageProps<"/homes/[key]">): Promise<Metadata> {
  const h = await getHome((await params).key);
  return { title: h?.name ?? "Home" };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-[17px]">{title}</h2>
      {children}
    </section>
  );
}

export default async function HomePage({ params }: PageProps<"/homes/[key]">) {
  await requirePermission("view:homes");
  const h = await getHome((await params).key);
  if (!h) notFound();
  const [tone, label] = TIER[h.tier];
  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>{h.name}</h1>
          <p className="mt-1 text-fg-2">{h.residents} of {h.beds} beds · {h.openItems} open items</p>
        </div>
        <div className="flex items-center gap-3">
          <Tag tone={tone}>{label}</Tag>
          <span className="text-[44px] leading-none font-semibold tracking-tight"><CountUp value={h.total} /></span>
        </div>
      </header>
      <div className="rise mb-2 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-line bg-surface p-4 lg:grid-cols-4">
        {([["Documents", h.docs], ["Monthly files", h.tracking], ["Risk consistency", h.risk], ["Staff credentials", h.staff]] as const).map(([k, v], i) => (
          <div key={k}>
            <div className="mb-1.5 flex justify-between text-[13px]"><span className="text-fg-2">{k}</span><span className="font-mono text-xs tabular-nums">{v}</span></div>
            <Meter label={k} value={v} delay={i * 60} tone={v >= 85 ? "good" : v >= 70 ? "warn" : "bad"} />
          </div>
        ))}
      </div>
      <Section title="Residents"><ResidentsPanel home={h.key} /></Section>
      <Section title="Staff"><StaffPanel home={h.key} /></Section>
      <Section title="Monthly files"><TrackingPanel home={h.key} /></Section>
      <Section title="Medications"><MedsPanel home={h.key} /></Section>
    </>
  );
}
