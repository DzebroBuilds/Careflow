import { describe, expect, it } from "vitest";
import { blocksScheduling, credentialState, daysBetween, scoreHome, severityOf, tierOf } from "./scoring";
import { detectTypeFromName, gate, simulateExtraction } from "./gatekeeper";
import { harmonize } from "./harmonizer";

describe("scoreHome", () => {
  it("scores a perfect home 100", () => {
    const s = scoreHome({
      careDocStatuses: ["CURRENT", "CURRENT"],
      tracking: [{ status: "VERIFIED" }],
      openDiscrepancies: 0,
      credentialDaysLeft: [90, 400],
    });
    expect(s).toEqual({ docs: 100, tracking: 100, risk: 100, staff: 100, total: 100 });
  });
  it("weights 30/30/25/15", () => {
    const s = scoreHome({
      careDocStatuses: ["MISSING"],
      tracking: [{ status: "VERIFIED" }],
      openDiscrepancies: 0,
      credentialDaysLeft: [100],
    });
    expect(s.total).toBe(70); // 0*.3 + 100*.3 + 100*.25 + 100*.15
  });
  it("does not penalise a re-upload that is processing over a verified file", () => {
    const s = scoreHome({
      careDocStatuses: [],
      tracking: [{ status: "PROCESSING", previousStatus: "VERIFIED" }, { status: "PROCESSING", previousStatus: "REJECTED" }],
      openDiscrepancies: 0,
      credentialDaysLeft: [],
    });
    expect(s.tracking).toBe(50);
  });
  it("ignores archived tracking rows and floors risk at 0", () => {
    const s = scoreHome({
      careDocStatuses: [],
      tracking: [{ status: "ARCHIVED" }],
      openDiscrepancies: 50,
      credentialDaysLeft: [],
    });
    expect(s.tracking).toBe(100);
    expect(s.risk).toBe(0);
  });
  it("counts credentials inside 30 days as not ok", () => {
    expect(scoreHome({ careDocStatuses: [], tracking: [], openDiscrepancies: 0, credentialDaysLeft: [30, 31, -1, 5] }).staff).toBe(25);
  });
});

describe("tiers and severity", () => {
  it("tier boundaries", () => {
    expect([tierOf(85), tierOf(84), tierOf(70), tierOf(69)]).toEqual(["audit_ready", "watch", "watch", "at_risk"]);
  });
  it("severity boundaries", () => {
    expect([severityOf(59), severityOf(60), severityOf(69), severityOf(70), severityOf(85)]).toEqual([
      "critical", "high", "high", "watch", "clear",
    ]);
  });
});

describe("credentials", () => {
  it("maps days left to reminder state", () => {
    expect([-1, 0, 7, 8, 15, 16, 30, 31].map(credentialState)).toEqual([
      "lapsed", "due_7", "due_7", "due_15", "due_15", "due_30", "due_30", "ok",
    ]);
  });
  it("blocks scheduling only after lapse", () => {
    expect(blocksScheduling(-1)).toBe(true);
    expect(blocksScheduling(0)).toBe(false);
  });
  it("counts calendar days across DST", () => {
    expect(daysBetween(new Date(2026, 2, 7), new Date(2026, 2, 9))).toBe(2);
  });
});

describe("gatekeeper", () => {
  it("passes a clean PDF", () => {
    expect(gate("MAR", simulateExtraction("MAR_ZB_2026-09.pdf"))).toEqual({ status: "PASSED", failedFields: [] });
  });
  it("rejects unsigned files and lists the missing fields", () => {
    const r = gate("MAR", simulateExtraction("MAR_ZB_2026-09_unsigned.pdf"));
    expect(r.status).toBe("REJECTED");
    expect(r.failedFields).toEqual(["Staff signature (p.2)", "Date of review"]);
  });
  it("rejects a wrong document type", () => {
    expect(gate("MAR", simulateExtraction("ONA_ZB.pdf")).failedFields).toEqual(["Reads as ONA, row expects MAR"]);
  });
  it("rejects non-PDFs and low-confidence scans", () => {
    expect(gate("MAR", simulateExtraction("mar.png", "image/png")).failedFields).toEqual(["File is not a PDF"]);
    expect(gate("MAR", { ...simulateExtraction("mar.pdf"), confidence: 0.3 }).failedFields).toContain("Scan too unclear to read");
  });
  it("detects type from name", () => {
    expect(detectTypeFromName("SafetyPlan_JP.pdf")).toBe("SAFETY_PLAN");
    expect(detectTypeFromName("random.pdf")).toBeNull();
  });
});

describe("harmonize", () => {
  it("flags a risk in the RIT that is missing from the Safety Plan", () => {
    const d = harmonize(
      { RIT: { ELOPEMENT: { rating: "high" } }, ISP: { ELOPEMENT: { rating: "high" } }, PRMS: { ELOPEMENT: { rating: "high" } }, PBSP: { ELOPEMENT: { rating: "high" } } },
    );
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ risk: "ELOPEMENT", kind: "MISSING_SECTION", targetDoc: "SAFETY_PLAN" });
  });
  it("flags conflicting ratings", () => {
    const d = harmonize(
      { RIT: { FALLS: { rating: "high" } }, ISP: { FALLS: { rating: "standard" } }, PRMS: { FALLS: { rating: "high" } }, SAFETY_PLAN: { FALLS: { rating: "high" } }, PBSP: { FALLS: { rating: "high" } } },
    );
    expect(d).toEqual([expect.objectContaining({ kind: "CONFLICT", sourceDoc: "RIT", targetDoc: "ISP" })]);
  });
  it("reports nothing when documents agree or the risk is absent", () => {
    expect(harmonize({})).toEqual([]);
  });
});
