import type { Metadata } from "next";
import { Card, CardHead, PageHeader, Stat, StatGrid, Tag } from "@/components/ui";
import { REPORTING_CLOCKS, getIncidents } from "@/lib/data";

export const metadata: Metadata = { title: "Incidents" };

const STATE = {
  overdue: { tone: "bad", label: "Overdue" }, due_soon: { tone: "warn", label: "Due soon" }, open: { tone: "neutral", label: "Open" },
  on_time: { tone: "good", label: "Reported on time" }, late: { tone: "bad", label: "Reported late" },
} as const;

const hrs = (h: number) => (Math.abs(h) >= 48 ? `${Math.round(Math.abs(h) / 24)}d` : `${Math.round(Math.abs(h))}h`);

export default async function Incidents() {
  const rows = await getIncidents();
  const n = (s: string) => rows.filter((r) => r.state === s).length;
  const done = rows.filter((r) => r.state === "on_time" || r.state === "late");
  return (
    <>
      <PageHeader title="Incidents" sub="Each incident starts a reporting clock. Nothing is lost between shifts." />
      <StatGrid>
        <Stat label="Overdue" value={n("overdue")} sub="Report now" tone={n("overdue") ? "bad" : "good"} />
        <Stat label="Due soon" value={n("due_soon")} sub="Inside the last third of the window" tone={n("due_soon") ? "warn" : "good"} />
        <Stat label="Reported on time" value={`${done.length ? Math.round((n("on_time") / done.length) * 100) : 100}%`} sub={`${n("on_time")} of ${done.length} reported`} tone={n("late") ? "warn" : "good"} />
        <Stat label="Last 10 days" value={rows.length} sub="Across all homes" />
      </StatGrid>

      <Card className="mb-4 overflow-x-auto">
        <CardHead title="Incident log, most urgent first" />
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Incident</th>
              <th scope="col" className="px-2 py-2.5">Home</th>
              <th scope="col" className="px-2 py-2.5">Type</th>
              <th scope="col" className="px-2 py-2.5">Occurred</th>
              <th scope="col" className="px-4 py-2.5">Report</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="max-w-[360px] px-4 py-3 font-normal">
                  <div className="font-medium"><span className="font-mono text-[13px]">{r.resident}</span> <span className="text-fg-3">· {r.id}</span></div>
                  <div className="text-[13px] text-fg-2">{r.summary}</div>
                </th>
                <td className="px-2 py-3 whitespace-nowrap text-fg-2">{r.homeName}</td>
                <td className="px-2 py-3 text-fg-2">{r.type}</td>
                <td className="px-2 py-3 font-mono text-[13px] whitespace-nowrap text-fg-2">{hrs(r.occurredHoursAgo)} ago</td>
                <td className="px-4 py-3">
                  <Tag tone={STATE[r.state].tone}>{STATE[r.state].label}</Tag>
                  <div className="mt-1 font-mono text-xs text-fg-3">
                    {r.reportedAfterHours !== null ? `after ${hrs(r.reportedAfterHours)}` : r.dueInHours < 0 ? `${hrs(r.dueInHours)} past due` : `${hrs(r.dueInHours)} left`}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHead title="Reporting clocks" aside={<Tag tone="warn">Placeholder values</Tag>} />
        <p className="px-4 pt-3 text-[13px] text-fg-2">These windows are configuration. Confirm each one against current Oregon requirements and your client&rsquo;s policy before relying on it.</p>
        <ul className="p-2">
          {REPORTING_CLOCKS.map((c) => (
            <li key={c.type} className="flex items-baseline justify-between gap-4 rounded-md px-2 py-1.5">
              <span className="font-medium">{c.type}{c.note && <span className="ml-2 font-normal text-fg-3">{c.note}</span>}</span>
              <span className="font-mono text-[13px] tabular-nums text-fg-2">within {c.hours}h</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
