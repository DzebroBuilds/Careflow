import type { ReactNode } from "react";

type Tone = "good" | "warn" | "bad" | "neutral";
const TONE: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  neutral: "bg-surface-2 text-fg-2 ring-1 ring-inset ring-line",
};

/** Status is never colour alone: every tag carries a text label. */
export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-5 items-center gap-1.5 rounded px-1.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Meter({ value, tone, label, delay = 0 }: { value: number; tone: Exclude<Tone, "neutral">; label: string; delay?: number }) {
  const c = { good: "bg-good", warn: "bg-warn", bad: "bg-bad" }[tone];
  return (
    <div role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded bg-surface-2 ring-1 ring-inset ring-line">
      <div className={`meter-fill h-full rounded ${c}`} style={{ "--v": value / 100, "--d": `${delay}ms` } as React.CSSProperties} />
    </div>
  );
}

export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <header className="mb-5">
      <h1>{title}</h1>
      {sub && <p className="mt-1 text-fg-2">{sub}</p>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-line bg-surface ${className}`}>{children}</section>;
}
