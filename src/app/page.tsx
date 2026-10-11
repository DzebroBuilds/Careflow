import { requirePermission } from "@/lib/auth/guard";
import Link from "next/link";
import { CountUp } from "@/components/count-up";
import { Card, Meter, PageHeader, Tag } from "@/components/ui";
import { getCredentials, getHomeSummaries } from "@/lib/data";

const TIER = {
  audit_ready: { tone: "good", label: "Audit ready" },
  watch: { tone: "warn", label: "Watch" },
  at_risk: { tone: "bad", label: "At risk" },
} as const;

export default async function Overview() {
  await requirePermission("view:overview");
  const [homes, creds] = await Promise.all([getHomeSummaries(), getCredentials()]);
  const urgent = creds.filter((c) => c.state === "lapsed" || c.state === "due_7").slice(0, 6);
  const sorted = [...homes].sort((a, b) => a.total - b.total);

  return (
    <>
      <PageHeader title="Readiness overview" sub={`${homes.length} homes · ${homes.reduce((n, h) => n + h.residents, 0)} residents`} />
      <div className="grid gap-4 lg:grid-cols-2">
        {sorted.map((h, i) => {
          const t = TIER[h.tier];
          return (
            <Card key={h.key} className="lift p-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate">{h.name}</h2>
                    <p className="text-fg-3">{h.residents} of {h.beds} beds · {h.openItems} open items</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[38px] leading-none font-semibold tracking-tight tabular-nums"><CountUp value={h.total} delay={i * 60} /></div>
                    <div className="mt-1.5"><Tag tone={t.tone}>{t.label}</Tag></div>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-[110px_1fr_36px] items-center gap-x-3 gap-y-2.5 text-[13px]">
                  {([["Documents", h.docs], ["Monthly files", h.tracking], ["Risk consistency", h.risk], ["Staff credentials", h.staff]] as const).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-fg-2">{k}</dt>
                      <dd className="m-0"><Meter delay={i * 60 + 120} label={k} value={v} tone={v >= 85 ? "good" : v >= 70 ? "warn" : "bad"} /></dd>
                      <dd className="m-0 text-right font-mono text-xs tabular-nums text-fg-2">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2>Credentials needing action</h2>
          <Link href="/staff" className="press rounded px-2 py-1 text-[13px] font-medium text-accent hover:bg-accent-soft">View all</Link>
        </div>
        <ul>
          {urgent.map((c) => (
            <li key={c.staff + c.label} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0">
              <div className="min-w-0">
                <div className="truncate font-medium">{c.staff} <span className="font-normal text-fg-3">· {c.home}</span></div>
                <div className="text-fg-2">{c.label}</div>
              </div>
              <Tag tone={c.state === "lapsed" ? "bad" : "warn"}>{c.daysLeft < 0 ? `Lapsed ${-c.daysLeft}d ago` : `${c.daysLeft}d left`}</Tag>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
