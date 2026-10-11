import { describe, expect, it } from "vitest";
import { allowedHomes, can, landingPage, type Role } from "./permissions";

const HOMES = ["A", "B", "C", "D"];

describe("permissions", () => {
  it("only the agency sees the control center", () => {
    const roles: Role[] = ["AGENCY", "OWNER", "MANAGER", "DSP", "AUDITOR"];
    expect(roles.filter((r) => can(r, "view:agency"))).toEqual(["AGENCY"]);
  });
  it("DSPs cannot see staff files, audit or other pages above floor work", () => {
    expect(can("DSP", "view:staff")).toBe(false);
    expect(can("DSP", "view:audit")).toBe(false);
    expect(can("DSP", "view:medications")).toBe(true);
    expect(can("DSP", "upload:monthly")).toBe(true);
  });
  it("auditors can read everything client-side but never upload", () => {
    expect(can("AUDITOR", "view:audit")).toBe(true);
    expect(can("AUDITOR", "upload:monthly")).toBe(false);
  });
  it("house-scoped roles see only their home", () => {
    expect(allowedHomes("MANAGER", "A", HOMES)).toEqual(["A"]);
    expect(allowedHomes("DSP", "B", HOMES)).toEqual(["B"]);
  });
  it("scoped roles with no or unknown home see nothing", () => {
    expect(allowedHomes("MANAGER", null, HOMES)).toEqual([]);
    expect(allowedHomes("DSP", "Z", HOMES)).toEqual([]);
  });
  it("owners, auditors and agency see every home", () => {
    for (const r of ["OWNER", "AUDITOR", "AGENCY"] as Role[]) expect(allowedHomes(r, null, HOMES)).toEqual(HOMES);
  });
  it("lands each role somewhere they may view", () => {
    for (const r of ["AGENCY", "OWNER", "MANAGER", "DSP", "AUDITOR"] as Role[]) {
      const p = landingPage(r);
      const need = p === "/agency" ? "view:agency" : p === "/" ? "view:overview" : "view:today";
      expect(can(r, need)).toBe(true);
    }
  });
});
