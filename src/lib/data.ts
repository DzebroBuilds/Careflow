// Data access for the UI. Reads the fake fixtures today; swap the bodies for Prisma queries against
// home_summaries / residents / staff_credentials later without touching any page.
import { BAD_MONTHLY, HOMES, RESIDENTS, STAFF } from "./demo-data";
import {
  credentialState, scoreHome, severityOf, tierOf,
  type CareDocStatus, type CredentialState, type HomeScore, type MonthlyStatus, type Severity, type Tier,
} from "./compliance/scoring";

const DOC: Record<string, CareDocStatus> = { o: "CURRENT", d: "REVIEW_DUE", x: "CONFLICT", m: "MISSING" };
export const DOC_LABELS = ["RIT", "ISP", "PRMS", "Safety Plan", "PBSP"] as const;

export interface HomeSummary extends HomeScore {
  key: string; name: string; beds: number; residents: number; tier: Tier; severity: Severity; openItems: number;
}

const bad = (home: string) => (BAD_MONTHLY as Record<string, Record<string, string>>)[home] ?? {};

export async function getHomeSummaries(): Promise<HomeSummary[]> {
  return HOMES.map((h) => {
    const rs = RESIDENTS.filter((r) => r.home === h.key);
    const tracking = rs.flatMap((r) =>
      ["MAR", "ONA", "Safety Plan"].map((t) => {
        const b = bad(h.key)[`${r.id}:${t}`];
        return { status: (b === "missing" ? "MISSING" : b === "rejected" ? "REJECTED" : "VERIFIED") as MonthlyStatus };
      }),
    );
    const open = rs.reduce((n, r) => n + r.openDiscrepancies, 0);
    const sc = scoreHome({
      careDocStatuses: rs.flatMap((r) => [...r.docs].map((c) => DOC[c])),
      tracking,
      openDiscrepancies: open,
      credentialDaysLeft: STAFF.filter((s) => s.home === h.key).flatMap((s) => [s.cpr, s.background, s.medAdmin]),
    });
    return {
      ...sc, key: h.key, name: h.name, beds: h.beds, residents: rs.length,
      tier: tierOf(sc.total), severity: severityOf(sc.total),
      openItems: open + tracking.filter((t) => t.status !== "VERIFIED").length,
    };
  });
}

export interface ResidentRow {
  id: string; home: string; homeName: string; room: string; flags: readonly string[];
  docs: { label: string; status: CareDocStatus }[]; openDiscrepancies: number;
}

export async function getResidents(): Promise<ResidentRow[]> {
  return RESIDENTS.map((r) => ({
    id: r.id, home: r.home, homeName: HOMES.find((h) => h.key === r.home)!.name, room: r.room, flags: r.flags,
    docs: [...r.docs].map((c, i) => ({ label: DOC_LABELS[i], status: DOC[c] })),
    openDiscrepancies: r.openDiscrepancies,
  }));
}

export interface CredentialRow { staff: string; role: string; home: string; label: string; daysLeft: number; state: CredentialState }

export async function getCredentials(): Promise<CredentialRow[]> {
  const L = [["CPR / First Aid", "cpr"], ["Background check", "background"], ["Med administration", "medAdmin"]] as const;
  return STAFF.flatMap((s) =>
    L.map(([label, k]) => ({
      staff: s.name, role: s.role, home: HOMES.find((h) => h.key === s.home)!.name, label,
      daysLeft: s[k], state: credentialState(s[k]),
    })),
  ).sort((a, b) => a.daysLeft - b.daysLeft);
}

// ───────────── Dashboards ─────────────

export const HOME_LIST = HOMES.map((h) => ({ key: h.key, name: h.name }));

export async function getHome(key: string) {
  const all = await getHomeSummaries();
  return all.find((h) => h.key === key.toUpperCase()) ?? null;
}

export async function getRiskDistribution(home?: string) {
  const counts = new Map<string, number>();
  for (const r of RESIDENTS.filter((x) => !home || x.home === home)) for (const f of r.flags) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts].map(([risk, n]) => ({ risk, n })).sort((a, b) => b.n - a.n);
}

export async function getCareDocCounts(home?: string) {
  const c: Record<CareDocStatus, number> = { CURRENT: 0, REVIEW_DUE: 0, CONFLICT: 0, MISSING: 0, PROCESSING: 0, ARCHIVED: 0 };
  for (const r of RESIDENTS.filter((x) => !home || x.home === home)) for (const ch of r.docs) c[DOC[ch]]++;
  return c;
}

export interface TrackingRow { resident: string; home: string; homeName: string; cells: { type: string; status: MonthlyStatus }[] }

export async function getTracking(home?: string): Promise<TrackingRow[]> {
  return RESIDENTS.filter((r) => !home || r.home === home).map((r) => ({
    resident: r.id, home: r.home, homeName: HOMES.find((h) => h.key === r.home)!.name,
    cells: ["MAR", "ONA", "Safety Plan"].map((t) => {
      const b = bad(r.home)[`${r.id}:${t}`];
      return { type: t, status: (b === "missing" ? "MISSING" : b === "rejected" ? "REJECTED" : "VERIFIED") as MonthlyStatus };
    }),
  }));
}

export interface StaffRow {
  name: string; role: string; home: string; homeName: string; trainingHours: number; requiredHours: number;
  creds: { label: string; daysLeft: number; state: CredentialState }[]; worst: number; canPassMeds: boolean;
}

export async function getStaff(home?: string): Promise<StaffRow[]> {
  return STAFF.filter((s) => !home || s.home === home).map((s) => {
    const creds = [
      { label: "CPR / First Aid", daysLeft: s.cpr }, { label: "Background check", daysLeft: s.background }, { label: "Med administration", daysLeft: s.medAdmin },
    ].map((c) => ({ ...c, state: credentialState(c.daysLeft) }));
    return {
      name: s.name, role: s.role, home: s.home, homeName: HOMES.find((h) => h.key === s.home)!.name,
      trainingHours: s.trainingHours, requiredHours: 24, creds,
      worst: Math.min(...creds.map((c) => c.daysLeft)), canPassMeds: s.medAdmin >= 0,
    };
  }).sort((a, b) => a.worst - b.worst);
}

export interface MedRow { resident: string; home: string; homeName: string; meds: { name: string; dose: string | null; freq: string; prn: boolean }[] }

export async function getMedications(home?: string): Promise<MedRow[]> {
  return RESIDENTS.filter((r) => !home || r.home === home).map((r) => ({
    resident: r.id, home: r.home, homeName: HOMES.find((h) => h.key === r.home)!.name,
    meds: r.meds.map((m) => {
      const [left, freq] = m.split(" · ");
      const mt = left.match(/^(.*?)(?:\s+(\d[\d.,]*\s?(?:mg|mcg|IU)))?$/);
      return { name: mt?.[1] ?? left, dose: mt?.[2] ?? null, freq, prn: freq === "PRN" };
    }),
  }));
}

// ───────────── Action queue and audit findings ─────────────

export type ActionSeverity = "critical" | "high" | "medium" | "low";
export interface ActionItem {
  id: string; severity: ActionSeverity; title: string; detail: string; home: string; homeName: string;
  owner: string; due: string; category: "Staff" | "Medication records" | "Monthly files" | "Care plans" | "Risk consistency"; href: string;
}
const SEV_W: Record<ActionSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export async function getActions(home?: string): Promise<ActionItem[]> {
  const out: ActionItem[] = [];
  const hn = (k: string) => HOMES.find((h) => h.key === k)!.name;

  for (const s of await getStaff(home)) for (const c of s.creds) {
    if (c.state === "ok") continue;
    const med = c.label === "Med administration";
    const base = { home: s.home, homeName: s.homeName, category: "Staff" as const, href: `/homes/${s.home}` };
    if (c.state === "lapsed") out.push({ ...base, id: `c-${s.name}-${c.label}`, severity: "critical", title: `${s.name}: ${c.label} lapsed ${-c.daysLeft}d ago`, detail: med ? "Cannot administer medications until renewed. Remove from med passes and the schedule." : "Remove from the schedule until renewed.", owner: "House manager", due: "Today" });
    else out.push({ ...base, id: `c-${s.name}-${c.label}`, severity: c.state === "due_7" ? "high" : "medium", title: `${s.name}: ${c.label} expires in ${c.daysLeft}d`, detail: "Reminder sent to the employee. Book the renewal.", owner: "House manager", due: c.state === "due_7" ? "This week" : "This month" });
  }

  for (const r of await getTracking(home)) for (const c of r.cells) {
    if (c.status === "VERIFIED") continue;
    out.push({ id: `m-${r.resident}-${c.type}`, severity: "high", category: c.type === "MAR" ? "Medication records" : "Monthly files", home: r.home, homeName: r.homeName,
      title: c.status === "REJECTED" ? `${c.type} for ${r.resident} was rejected` : `${c.type} for ${r.resident} not uploaded`,
      detail: c.status === "REJECTED" ? "Missing staff signature and review date. Get it signed and upload again." : "September file is overdue. Upload the signed copy.", owner: "House manager", due: "Overdue", href: "/monthly" });
  }

  for (const r of await getResidents()) {
    if (home && r.home !== home) continue;
    for (const d of r.docs) {
      if (d.status === "MISSING") out.push({ id: `d-${r.id}-${d.label}`, severity: "high", category: "Care plans", home: r.home, homeName: r.homeName, title: `${r.id}: ${d.label} is missing`, detail: "Request from the case manager or upload the signed plan.", owner: "Compliance team", due: "This week", href: "/residents" });
      else if (d.status === "CONFLICT") out.push({ id: `d-${r.id}-${d.label}`, severity: "medium", category: "Care plans", home: r.home, homeName: r.homeName, title: `${r.id}: ${d.label} conflicts with other plans`, detail: "Review the proposed sync and approve it.", owner: "Compliance team", due: "This week", href: "/residents" });
      else if (d.status === "REVIEW_DUE") out.push({ id: `d-${r.id}-${d.label}`, severity: "low", category: "Care plans", home: r.home, homeName: r.homeName, title: `${r.id}: ${d.label} review is due`, detail: "Schedule the annual review with the team.", owner: "Compliance team", due: "This month", href: "/residents" });
    }
    if (r.openDiscrepancies) out.push({ id: `x-${r.id}`, severity: "medium", category: "Risk consistency", home: r.home, homeName: r.homeName, title: `${r.id}: ${r.openDiscrepancies} risk ${r.openDiscrepancies === 1 ? "discrepancy" : "discrepancies"} between plans`, detail: "The same risk is described differently across plans. Approve the sync.", owner: "Compliance team", due: "This week", href: "/residents" });
  }
  void hn;
  return out.sort((a, b) => SEV_W[a.severity] - SEV_W[b.severity]);
}

// ───────────── Agency control center (fake clients) ─────────────

export interface ClientRow {
  id: string; name: string; homes: number; residents: number; score: number; severity: Severity; trend: number[];
  mrr: number; pendingApprovals: number; lastActive: string; status: "Active" | "Trial";
}

// Client "Northwest Supported Living" is computed from the real demo data; the others are invented.
export async function getClients(): Promise<ClientRow[]> {
  const mine = await getHomeSummaries();
  const avg = Math.round(mine.reduce((n, h) => n + h.total, 0) / mine.length);
  const mk = (id: string, name: string, homes: number, residents: number, score: number, approvals: number, active: string, status: "Active" | "Trial" = "Active"): ClientRow => ({
    id, name, homes, residents, score, severity: severityOf(score), mrr: status === "Trial" ? 0 : 1000, pendingApprovals: approvals, lastActive: active, status,
    trend: Array.from({ length: 8 }, (_, i) => Math.max(30, Math.min(100, Math.round(score - (7 - i) * (id.charCodeAt(0) % 3 - 0.6) + ((i * 7 + id.charCodeAt(1)) % 5) - 2)))).map((v, i, a) => (i === a.length - 1 ? score : v)),
  });
  return [
    mk("nsl", "Northwest Supported Living", mine.length, mine.reduce((n, h) => n + h.residents, 0), avg, 7, "Today"),
    mk("cvh", "Columbia Valley Homes", 5, 27, 88, 2, "Today"),
    mk("wsc", "Willamette Support Collective", 4, 21, 74, 5, "Yesterday"),
    mk("rrc", "Rogue River Care", 4, 18, 58, 9, "3 days ago"),
    mk("hdr", "High Desert Residential", 5, 24, 91, 1, "Today"),
    mk("cst", "Coastline Community Living", 4, 19, 69, 4, "2 days ago"),
    mk("ssm", "Siskiyou Supported Living", 4, 16, 82, 0, "Today", "Trial"),
  ];
}

// ───────────── Incidents ─────────────

// PLACEHOLDER reporting clocks (hours from occurrence). Confirm each against current Oregon rules and
// the client's own policy before relying on them; these are configuration, not legal advice.
export const REPORTING_CLOCKS = [
  { type: "Allegation of abuse or neglect", hours: 2, note: "Mandatory report. Treat as immediate." },
  { type: "Elopement", hours: 4, note: "Notify guardian and case manager." },
  { type: "Injury needing medical care", hours: 24, note: "" },
  { type: "Hospital visit", hours: 24, note: "" },
  { type: "Medication error", hours: 24, note: "" },
  { type: "Behavioral incident", hours: 48, note: "" },
] as const;

export type IncidentType = (typeof REPORTING_CLOCKS)[number]["type"];
export interface IncidentRow {
  id: string; resident: string; home: string; homeName: string; type: IncidentType; summary: string;
  occurredHoursAgo: number; reportedAfterHours: number | null; dueInHours: number;
  state: "overdue" | "due_soon" | "open" | "on_time" | "late";
}

const RAW: { resident: string; type: IncidentType; summary: string; ago: number; reported: number | null }[] = [
  { resident: "TG", type: "Elopement", summary: "Left the house at shift change. Found within 15 minutes, no injury.", ago: 6, reported: null },
  { resident: "OL", type: "Medication error", summary: "Evening dose given 90 minutes late. Prescriber notified.", ago: 20, reported: null },
  { resident: "CW", type: "Injury needing medical care", summary: "Fall in the bathroom. Urgent care visit, sprained wrist.", ago: 30, reported: 5 },
  { resident: "JP", type: "Behavioral incident", summary: "Refused evening medications twice, protocol followed.", ago: 40, reported: 30 },
  { resident: "SF", type: "Hospital visit", summary: "Breakthrough seizure, ambulance transport, discharged same day.", ago: 70, reported: 29 },
  { resident: "ZB", type: "Medication error", summary: "Wrong time on MAR initials, corrected same shift.", ago: 150, reported: 8 },
  { resident: "LH", type: "Behavioral incident", summary: "Self-injury episode, de-escalated per PBSP.", ago: 210, reported: 20 },
];

export async function getIncidents(): Promise<IncidentRow[]> {
  return RAW.map((x, i) => {
    const r = RESIDENTS.find((q) => q.id === x.resident)!;
    const clock = REPORTING_CLOCKS.find((c) => c.type === x.type)!.hours;
    const due = clock - x.ago;
    const state: IncidentRow["state"] =
      x.reported !== null ? (x.reported <= clock ? "on_time" : "late") : due < 0 ? "overdue" : due <= clock / 3 ? "due_soon" : "open";
    return {
      id: `INC-${1040 + i}`, resident: x.resident, home: r.home, homeName: HOMES.find((h) => h.key === r.home)!.name, type: x.type, summary: x.summary,
      occurredHoursAgo: x.ago, reportedAfterHours: x.reported, dueInHours: due, state,
    };
  }).sort((a, b) => {
    const ao = a.reportedAfterHours === null, bo = b.reportedAfterHours === null;
    if (ao !== bo) return ao ? -1 : 1; // unreported first
    return ao ? a.dueInHours - b.dueInHours : a.occurredHoursAgo - b.occurredHoursAgo;
  });
}
