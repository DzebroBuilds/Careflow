import type { Metadata } from "next";
import { Card, PageHeader, Tag } from "@/components/ui";
import { getCredentials } from "@/lib/data";

export const metadata: Metadata = { title: "Staff credentials" };

const STATE = {
  lapsed: { tone: "bad", label: "Lapsed" },
  due_7: { tone: "bad", label: "Due in 7 days" },
  due_15: { tone: "warn", label: "Due in 15 days" },
  due_30: { tone: "warn", label: "Due in 30 days" },
  ok: { tone: "good", label: "Current" },
} as const;

export default async function Staff() {
  const rows = await getCredentials();
  return (
    <>
      <PageHeader title="Staff credentials" sub="Soonest expiry first. Reminders go out at 30, 15 and 7 days; scheduling is blocked once a credential lapses." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Staff</th>
              <th scope="col" className="px-2 py-2.5">Home</th>
              <th scope="col" className="px-2 py-2.5">Credential</th>
              <th scope="col" className="px-2 py-2.5 text-right">Days left</th>
              <th scope="col" className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staff + r.label} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-2.5 font-medium">{r.staff}<span className="ml-2 font-normal text-fg-3">{r.role}</span></th>
                <td className="px-2 py-2.5 whitespace-nowrap text-fg-2">{r.home}</td>
                <td className="px-2 py-2.5">{r.label}</td>
                <td className="px-2 py-2.5 text-right font-mono text-[13px] tabular-nums">{r.daysLeft}</td>
                <td className="px-4 py-2.5"><Tag tone={STATE[r.state].tone}>{STATE[r.state].label}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
