// Upload Gatekeeper rules. In production the OCR + LLM step produces `ExtractedDoc`; the pass/fail
// decision below is plain code, never the model's call.

export type MonthlyType = "MAR" | "ONA" | "SAFETY_PLAN";

export interface ExtractedDoc {
  fileName: string;
  mimeType: string;
  detectedType: MonthlyType | null;
  hasSignature: boolean;
  hasReviewDate: boolean;
  confidence: number;
}

export interface GateResult {
  status: "PASSED" | "REJECTED";
  failedFields: string[];
}

export const MIN_CONFIDENCE = 0.6;

const LABEL: Record<MonthlyType, string> = { MAR: "MAR", ONA: "ONA", SAFETY_PLAN: "Safety Plan" };

export function gate(expected: MonthlyType, doc: ExtractedDoc): GateResult {
  if (doc.mimeType !== "application/pdf") {
    return { status: "REJECTED", failedFields: ["File is not a PDF"] };
  }
  if (doc.detectedType && doc.detectedType !== expected) {
    return {
      status: "REJECTED",
      failedFields: [`Reads as ${LABEL[doc.detectedType]}, row expects ${LABEL[expected]}`],
    };
  }
  const failed: string[] = [];
  if (!doc.hasSignature) failed.push("Staff signature (p.2)");
  if (!doc.hasReviewDate) failed.push("Date of review");
  if (doc.confidence < MIN_CONFIDENCE) failed.push("Scan too unclear to read");
  return failed.length ? { status: "REJECTED", failedFields: failed } : { status: "PASSED", failedFields: [] };
}

/** Filename heuristic used by the demo simulator only. */
export function detectTypeFromName(name: string): MonthlyType | null {
  if (/safety/i.test(name)) return "SAFETY_PLAN";
  if (/\bona\b|ona[_\-. ]|[_\-. ]ona/i.test(name)) return "ONA";
  if (/\bmar\b|mar[_\-. ]|[_\-. ]mar/i.test(name)) return "MAR";
  return null;
}

export const looksIncomplete = (name: string) => /unsigned|incomplete|blank/i.test(name);

/** Builds the extraction the real pipeline would produce, from a demo file name. */
export function simulateExtraction(fileName: string, mimeType = "application/pdf"): ExtractedDoc {
  const bad = looksIncomplete(fileName);
  return {
    fileName,
    mimeType,
    detectedType: detectTypeFromName(fileName),
    hasSignature: !bad,
    hasReviewDate: !bad,
    confidence: 0.95,
  };
}
