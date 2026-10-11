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
