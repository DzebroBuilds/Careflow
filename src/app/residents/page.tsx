import type { Metadata } from "next";
import { Card, PageHeader, Tag } from "@/components/ui";
import { getResidents } from "@/lib/data";

export const metadata: Metadata = { title: "Residents" };

const DOC = {
  CURRENT: { tone: "good", label: "Current" },
  REVIEW_DUE: { tone: "warn", label: "Review due" },
  CONFLICT: { tone: "bad", label: "Conflict" },
  MISSING: { tone: "bad", label: "Missing" },
  PROCESSING: { tone: "neutral", label: "Processing" },
  ARCHIVED: { tone: "neutral", label: "Archived" },
} as const;

export default async function Residents() {
  const rows = await getResidents();
  const heads = rows[0].docs.map((d) => d.label);
  return (
    <>
      <PageHeader title="Residents" sub="Only exceptions are called out; a check means current. Initials only in the demo." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Resident</th>
              <th scope="col" className="px-2 py-2.5">Home</th>
              {heads.map((h) => <th key={h} scope="col" className="px-2 py-2.5">{h}</th>)}
              <th scope="col" className="px-4 py-2.5 text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-2.5 font-medium">
                  <span className="font-mono text-[13px]">{r.id}</span>
                  <span className="ml-2 font-normal text-fg-3">{r.room}</span>
                </th>
                <td className="px-2 py-2.5 whitespace-nowrap text-fg-2">{r.homeName}</td>
                {r.docs.map((d) => (
                  <td key={d.label} className="px-2 py-2.5">
                    {d.status === "CURRENT" ? (
                      <span className="text-fg-3"><span aria-hidden>✓</span><span className="sr-only">Current</span></span>
                    ) : (
                      <Tag tone={DOC[d.status].tone}>{DOC[d.status].label}</Tag>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums">{r.openDiscrepancies || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
