// Risk Harmonizer. Compares the six fixed risk categories across the five care documents and
// reports gaps. It only ever proposes a fix; applying one creates a draft that goes through approval.

export const DOC_TYPES = ["RIT", "ISP", "PRMS", "SAFETY_PLAN", "PBSP"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const RISKS = ["ELOPEMENT", "ASPIRATION", "FALLS", "SEIZURE", "MEDICATION_REFUSAL", "SELF_INJURY"] as const;
export type Risk = (typeof RISKS)[number];

/** Per document, what it says about a risk. Absent = the document does not mention it. */
export type RiskStatement = { rating?: string; protocol?: string };
export type ExtractedRisks = Partial<Record<DocType, Partial<Record<Risk, RiskStatement>>>>;

export interface Discrepancy {
  risk: Risk;
  kind: "MISSING_SECTION" | "CONFLICT";
  sourceDoc: DocType;
  targetDoc: DocType;
  summary: string;
}

const label = (d: DocType) => (d === "SAFETY_PLAN" ? "Safety Plan" : d);
const norm = (s?: string) => s?.trim().toLowerCase().replace(/\s+/g, " ");

export function harmonize(extracted: ExtractedRisks, present: readonly DocType[] = DOC_TYPES): Discrepancy[] {
  const out: Discrepancy[] = [];
  for (const risk of RISKS) {
    const holders = present.filter((d) => extracted[d]?.[risk]);
    if (holders.length === 0) continue; // risk not identified anywhere: nothing to harmonize
    const source = holders[0];

    for (const target of present) {
      if (target === source || holders.includes(target)) continue;
      out.push({
        risk,
        kind: "MISSING_SECTION",
        sourceDoc: source,
        targetDoc: target,
        summary: `${risk} is covered in the ${label(source)} but absent from the ${label(target)}.`,
      });
    }
    for (let i = 1; i < holders.length; i++) {
      const a = extracted[source]![risk]!;
      const b = extracted[holders[i]]![risk]!;
      if ((norm(a.rating) !== norm(b.rating) && (a.rating || b.rating)) || (norm(a.protocol) !== norm(b.protocol) && (a.protocol || b.protocol))) {
        out.push({
          risk,
          kind: "CONFLICT",
          sourceDoc: source,
          targetDoc: holders[i],
          summary: `${risk} differs between the ${label(source)} and the ${label(holders[i])}.`,
        });
      }
    }
  }
  return out;
}
