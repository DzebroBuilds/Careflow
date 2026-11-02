// Readiness scoring. Pure functions: no database, no clock, so every number is reproducible.
// Weights are placeholders until calibrated with someone who knows Oregon licensing.

export type CareDocStatus = "CURRENT" | "REVIEW_DUE" | "MISSING" | "CONFLICT" | "PROCESSING" | "ARCHIVED";
export type MonthlyStatus = "MISSING" | "PROCESSING" | "VERIFIED" | "REJECTED" | "ARCHIVED";

export const WEIGHTS = { docs: 0.3, tracking: 0.3, risk: 0.25, staff: 0.15 } as const;

// How much each care-document status counts toward the documents score.
const DOC_CREDIT: Record<CareDocStatus, number> = {
  CURRENT: 1,
  REVIEW_DUE: 0.6,
  CONFLICT: 0.5,
  PROCESSING: 0.6,
  MISSING: 0,
  ARCHIVED: 0,
};

export const RISK_PENALTY_PER_OPEN_DISCREPANCY = 3;
export const CREDENTIAL_WARNING_DAYS = 30;

export interface TrackingItem {
  status: MonthlyStatus;
  /** Status before the current upload began processing. A re-upload shouldn't dip the score. */
  previousStatus?: MonthlyStatus;
}

export interface HomeScoreInput {
  careDocStatuses: CareDocStatus[];
  tracking: TrackingItem[];
  openDiscrepancies: number;
  /** Days until each staff credential expires (negative = lapsed). */
  credentialDaysLeft: number[];
}

export interface HomeScore {
  docs: number;
  tracking: number;
  risk: number;
  staff: number;
  total: number;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function scoreHome(input: HomeScoreInput): HomeScore {
  const docs = mean(input.careDocStatuses.map((s) => DOC_CREDIT[s])) * 100;

  const live = input.tracking.filter((t) => t.status !== "ARCHIVED");
  const ok = (t: TrackingItem) =>
    t.status === "VERIFIED" || (t.status === "PROCESSING" && t.previousStatus === "VERIFIED");
  const tracking = live.length ? (live.filter(ok).length / live.length) * 100 : 100;

  const risk = Math.max(0, 100 - RISK_PENALTY_PER_OPEN_DISCREPANCY * input.openDiscrepancies);

  const days = input.credentialDaysLeft;
  const staff = days.length ? (days.filter((d) => d > CREDENTIAL_WARNING_DAYS).length / days.length) * 100 : 100;

  const r = {
    docs: Math.round(docs),
    tracking: Math.round(tracking),
    risk: Math.round(risk),
    staff: Math.round(staff),
  };
  const total = Math.round(
    WEIGHTS.docs * docs + WEIGHTS.tracking * tracking + WEIGHTS.risk * risk + WEIGHTS.staff * staff,
  );
  return { ...r, total };
}

export type Tier = "audit_ready" | "watch" | "at_risk";
export const tierOf = (score: number): Tier => (score >= 85 ? "audit_ready" : score >= 70 ? "watch" : "at_risk");

export type Severity = "critical" | "high" | "watch" | "clear";
export const severityOf = (score: number): Severity =>
  score < 60 ? "critical" : score < 70 ? "high" : score < 85 ? "watch" : "clear";

export type CredentialState = "lapsed" | "due_7" | "due_15" | "due_30" | "ok";
export const credentialState = (daysLeft: number): CredentialState =>
  daysLeft < 0 ? "lapsed" : daysLeft <= 7 ? "due_7" : daysLeft <= 15 ? "due_15" : daysLeft <= 30 ? "due_30" : "ok";

/** Scheduling is blocked once a credential has lapsed. */
export const blocksScheduling = (daysLeft: number) => daysLeft < 0;

/** Whole days from `from` to `to`, calendar-based so DST can't shift the result. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}
