import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { Sparkline } from "@/components/sparkline";
import { Card, CardHead, PageHeader, Stat, StatGrid, Tag } from "@/components/ui";
import { getClients } from "@/lib/data";

export const metadata: Metadata = { title: "Agency control center" };

const SEV = { critical: ["bad", "Critical"], high: ["bad", "High"], watch: ["warn", "Watch"], clear: ["good", "Clear"] } as const;

export default async function Agency() {
  await requirePermission("view:agency");
  const clients = (await getClients()).sort((a, b) => a.score - b.score);
  const paying = clients.filter((c) => c.status === "Active");
  const mrr = paying.reduce((n, c) => n + c.mrr, 0);
  const atRisk = clients.filter((c) => c.severity === "critical" || c.severity === "high");
  return (
    <>
      <PageHeader title="Control center" sub="Every client, worst first. Demo clients other than Northwest Supported Living are invented." />
      <StatGrid>
        <Stat label="Monthly revenue" value={`$${mrr.toLocaleString()}`} sub={`${paying.length} paying · ${clients.length - paying.length} trial`} tone="good" />
        <Stat label="Homes managed" value={clients.reduce((n, c) => n + c.homes, 0)} sub={`${clients.reduce((n, c) => n + c.residents, 0)} residents`} />
        <Stat label="Clients at risk" value={atRisk.length} sub="Score under 70. Churn risk too." tone={atRisk.length ? "bad" : "good"} />
        <Stat label="Approvals waiting" value={clients.reduce((n, c) => n + c.pendingApprovals, 0)} sub="Drafts your team must review" tone="warn" />
      </StatGrid>
      <Card className="overflow-x-auto">
        <CardHead title="Clients" />
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Client</th>
              <th scope="col" className="px-2 py-2.5">Homes</th>
              <th scope="col" className="px-2 py-2.5">Readiness</th>
              <th scope="col" className="px-2 py-2.5">8-week trend</th>
              <th scope="col" className="px-2 py-2.5 text-right">Approvals</th>
              <th scope="col" className="px-2 py-2.5">Last active</th>
              <th scope="col" className="px-4 py-2.5 text-right">MRR</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const [tone, label] = SEV[c.severity];
              return (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                  <th scope="row" className="px-4 py-3 font-medium">{c.name}{c.status === "Trial" && <span className="ml-2 align-middle"><Tag tone="neutral">Trial</Tag></span>}</th>
                  <td className="px-2 py-3 text-fg-2">{c.homes} · {c.residents} res.</td>
                  <td className="px-2 py-3"><span className="mr-2 font-mono text-[15px] font-semibold tabular-nums">{c.score}</span><Tag tone={tone}>{label}</Tag></td>
                  <td className="px-2 py-3"><Sparkline values={c.trend} label={`${c.name} readiness trend`} /></td>
                  <td className="px-2 py-3 text-right font-mono text-[13px] tabular-nums">{c.pendingApprovals || "—"}</td>
                  <td className="px-2 py-3 whitespace-nowrap text-fg-2">{c.lastActive}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums">{c.mrr ? `$${c.mrr.toLocaleString()}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}
