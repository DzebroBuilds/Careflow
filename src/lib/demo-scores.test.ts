import { describe, expect, it } from "vitest";
import { BAD_MONTHLY, HOMES, RESIDENTS, STAFF } from "./demo-data";
import { scoreHome, type CareDocStatus, type MonthlyStatus } from "./compliance/scoring";

const DOC: Record<string, CareDocStatus> = { o: "CURRENT", d: "REVIEW_DUE", x: "CONFLICT", m: "MISSING" };

function homeScore(key: string) {
  const rs = RESIDENTS.filter((r) => r.home === key);
  const bad = (BAD_MONTHLY as Record<string, Record<string, string>>)[key] ?? {};
  const tracking = rs.flatMap((r) =>
    ["MAR", "ONA", "Safety Plan"].map((t): { status: MonthlyStatus } => ({
      status: bad[`${r.id}:${t}`] === "missing" ? "MISSING" : bad[`${r.id}:${t}`] === "rejected" ? "REJECTED" : "VERIFIED",
    })),
  );
  return scoreHome({
    careDocStatuses: rs.flatMap((r) => [...r.docs].map((c) => DOC[c])),
    tracking,
    openDiscrepancies: rs.reduce((n, r) => n + r.openDiscrepancies, 0),
    credentialDaysLeft: STAFF.filter((s) => s.home === key).flatMap((s) => [s.cpr, s.background, s.medAdmin]),
  });
}

describe("demo data reproduces the prototype scores", () => {
  it.each([["A", 92], ["B", 81], ["C", 66], ["D", 96]])("home %s scores %i", (key, total) => {
    expect(homeScore(key).total).toBe(total);
  });
  it("has 4 homes, 19 residents, 14 staff", () => {
    expect([HOMES.length, RESIDENTS.length, STAFF.length]).toEqual([4, 19, 14]);
  });
});
