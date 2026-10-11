import { BarList, Card, CardHead, Meter, Stat, StatGrid, Tag } from "@/components/ui";
import { getCareDocCounts, getMedications, getResidents, getRiskDistribution, getStaff, getTracking } from "@/lib/data";
import { ResidentsTable } from "@/components/residents-table";
import { MonthlyTable } from "@/components/monthly-table";

const CRED = {
  lapsed: { tone: "bad", label: "Lapsed" }, due_7: { tone: "bad", label: "≤ 7 days" }, due_15: { tone: "warn", label: "≤ 15 days" },
  due_30: { tone: "warn", label: "≤ 30 days" }, ok: { tone: "good", label: "Current" },
} as const;

export async function ResidentsPanel({ home }: { home?: string }) {
  const [rows, docs, risks] = await Promise.all([getResidents(), getCareDocCounts(home), getRiskDistribution(home)]);
  const list = home ? rows.filter((r) => r.home === home) : rows;
  const total = Object.values(docs).reduce((a, b) => a + b, 0);
  const withOpen = list.filter((r) => r.openDiscrepancies > 0).length;
  const pct = Math.round((docs.CURRENT / total) * 100);
  return (
    <>
      <StatGrid>
        <Stat label="Residents" value={list.length} sub={home ? "In this home" : `Across ${new Set(list.map((r) => r.home)).size} homes`} />
        <Stat label="Care files current" value={`${pct}%`} sub={`${docs.CURRENT} of ${total} documents`} tone={pct >= 85 ? "good" : pct >= 70 ? "warn" : "bad"} />
        <Stat label="Missing or conflicting" value={docs.MISSING + docs.CONFLICT} sub="Need action before audit" tone={docs.MISSING + docs.CONFLICT ? "bad" : "good"} />
        <Stat label="With open discrepancies" value={withOpen} sub="Risks that differ between plans" tone={withOpen ? "warn" : "good"} />
      </StatGrid>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHead title="Care-file status" />
          <div className="p-4">
            <BarList items={[
              { label: "Current", n: docs.CURRENT }, { label: "Review due", n: docs.REVIEW_DUE },
              { label: "Conflict", n: docs.CONFLICT }, { label: "Missing", n: docs.MISSING },
            ]} max={total} />
          </div>
        </Card>
        <Card>
          <CardHead title="Risk flags in this population" />
          <div className="p-4"><BarList items={risks.map((r) => ({ label: r.risk, n: r.n }))} /></div>
        </Card>
      </div>
      <ResidentsTable rows={list} />
    </>
  );
}

export async function StaffPanel({ home }: { home?: string }) {
  const staff = await getStaff(home);
  const creds = staff.flatMap((s) => s.creds);
  const lapsed = creds.filter((c) => c.state === "lapsed").length;
  const soon = creds.filter((c) => c.state === "due_7" || c.state === "due_15" || c.state === "due_30").length;
  const hours = staff.reduce((n, s) => n + s.trainingHours, 0);
  const need = staff.reduce((n, s) => n + s.requiredHours, 0);
  const blocked = staff.filter((s) => s.creds.some((c) => c.state === "lapsed"));
  return (
    <>
      <StatGrid>
        <Stat label="Staff" value={staff.length} sub={`${staff.filter((s) => s.role === "House Manager").length} house managers`} />
        <Stat label="Lapsed credentials" value={lapsed} sub={lapsed ? `${blocked.length} staff blocked from scheduling` : "None"} tone={lapsed ? "bad" : "good"} />
        <Stat label="Expiring within 30 days" value={soon} sub="Reminders at 30, 15 and 7 days" tone={soon ? "warn" : "good"} />
        <Stat label="Training hours" value={`${Math.round((hours / need) * 100)}%`} sub={`${hours} of ${need} required hours`} tone={hours / need >= 0.85 ? "good" : "warn"} />
      </StatGrid>
      <Card className="overflow-x-auto">
        <CardHead title="Staff, soonest expiry first" />
        <table className="w-full min-w-[820px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Staff</th>
              {!home && <th scope="col" className="px-2 py-2.5">Home</th>}
              <th scope="col" className="px-2 py-2.5">CPR / First Aid</th>
              <th scope="col" className="px-2 py-2.5">Background</th>
              <th scope="col" className="px-2 py-2.5">Med admin</th>
              <th scope="col" className="w-[150px] px-4 py-2.5">Training</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.name} className="border-b border-line last:border-0 hover:bg-surface-2">
                <th scope="row" className="px-4 py-2.5 font-medium">
                  {s.name}<div className="text-xs font-normal text-fg-3">{s.role}{!s.canPassMeds && " · cannot pass meds"}</div>
                </th>
                {!home && <td className="px-2 py-2.5 whitespace-nowrap text-fg-2">{s.homeName}</td>}
                {s.creds.map((c) => (
                  <td key={c.label} className="px-2 py-2.5">
                    {c.state === "ok"
                      ? <span className="font-mono text-[13px] tabular-nums text-fg-3">{c.daysLeft}d</span>
                      : <Tag tone={CRED[c.state].tone}>{c.daysLeft < 0 ? `Lapsed ${-c.daysLeft}d` : `${c.daysLeft}d left`}</Tag>}
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1"><Meter label={`${s.name} training hours`} value={Math.round((s.trainingHours / s.requiredHours) * 100)} tone={s.trainingHours / s.requiredHours >= 0.85 ? "good" : s.trainingHours / s.requiredHours >= 0.5 ? "warn" : "bad"} /></div>
                    <span className="font-mono text-xs tabular-nums text-fg-2">{s.trainingHours}/{s.requiredHours}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export async function TrackingPanel({ home }: { home?: string }) {
  const rows = await getTracking(home);
  return <MonthlyTable rows={rows} showHome={!home} />;
}

export async function MedsPanel({ home }: { home?: string }) {
  const [rows, staff] = await Promise.all([getMedications(home), getStaff(home)]);
  const all = rows.flatMap((r) => r.meds);
  const prn = all.filter((m) => m.prn).length;
  const poly = rows.filter((r) => r.meds.length >= 3).length;
  const cannot = staff.filter((s) => !s.canPassMeds);
  const covered = staff.filter((s) => s.creds[2].daysLeft > 30).length;
  return (
    <>
      <StatGrid>
        <Stat label="Active medications" value={all.length} sub={`${rows.length} residents`} />
        <Stat label="PRN orders" value={prn} sub="As-needed; each use must be logged" />
        <Stat label="On 3+ medications" value={poly} sub="Flagged for periodic order review" tone={poly ? "warn" : "good"} />
        <Stat label="Med-admin coverage" value={`${covered}/${staff.length}`} sub={cannot.length ? `${cannot.map((s) => s.name).join(", ")} cannot pass meds` : "All staff current"} tone={cannot.length ? "bad" : "good"} />
      </StatGrid>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.resident}>
            <CardHead title={r.resident} aside={<span className="text-[13px] text-fg-3">{!home && `${r.homeName} · `}{r.meds.length} meds</span>} />
            <ul className="p-2">
              {r.meds.map((m) => (
                <li key={m.name} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5">
                  <span className="min-w-0 truncate font-medium">{m.name} <span className="font-normal text-fg-3">{m.dose}</span></span>
                  {m.prn ? <Tag tone="warn">PRN</Tag> : <span className="shrink-0 font-mono text-xs text-fg-2">{m.freq}</span>}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
