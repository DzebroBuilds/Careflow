import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { ActionList } from "@/components/actions";
import { ExportFindings } from "@/components/audit-export";
import { Card, CardHead, Meter, PageHeader, Tag } from "@/components/ui";
import { getActions, getHomeSummaries } from "@/lib/data";

export const metadata: Metadata = { title: "Audit simulator" };

const OUTCOME = {
  audit_ready: { tone: "good", label: "Would likely pass", text: "A reviewer would find only minor items." },
  watch: { tone: "warn", label: "Would likely get findings", text: "Expect written findings and a correction plan." },
  at_risk: { tone: "bad", label: "Would likely fail", text: "Serious gaps. Fix the critical and high items before any visit." },
} as const;

export default async function Audit() {
  await requirePermission("view:audit");
  const [homes, items] = await Promise.all([getHomeSummaries(), getActions()]);
  const sorted = [...homes].sort((a, b) => a.total - b.total);
  const serious = items.filter((i) => i.severity === "critical" || i.severity === "high");
  return (
    <>
      <PageHeader title="Audit simulator" sub="If a reviewer walked into each home today, what would they find? Findings are drawn from your live records." />
      <div className="rise mb-4 grid gap-3 md:grid-cols-2">
        {sorted.map((h) => {
          const o = OUTCOME[h.tier];
          return (
            <Card key={h.key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2>{h.name}</h2>
                  <p className="mt-0.5 text-[13px] text-fg-2">{o.text}</p>
                </div>
                <Tag tone={o.tone}>{o.label}</Tag>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1"><Meter label={`${h.name} readiness`} value={h.total} tone={o.tone} /></div>
                <span className="font-mono text-sm tabular-nums">{h.total}/100</span>
              </div>
              <p className="mt-2 text-[13px] text-fg-3">{items.filter((i) => i.home === h.key && (i.severity === "critical" || i.severity === "high")).length} serious findings</p>
            </Card>
          );
        })}
      </div>
      <Card className="mb-4">
        <CardHead title="Audit binder" aside={<ExportFindings items={items} name="careflow" />} />
        <p className="px-4 py-3 text-[13px] text-fg-2">
          Export every open finding with its fix, owner and due date. Hand it to a house manager as a punch list, or attach it to a correction plan.
          Finding wording is illustrative and is not a citation of a specific Oregon rule.
        </p>
      </Card>
      <ActionList items={serious} title="Serious findings, all homes" limit={12} />
    </>
  );
}
