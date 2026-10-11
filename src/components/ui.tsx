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

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: Exclude<Tone, "neutral"> }) {
  const c = tone ? { good: "text-good", warn: "text-warn", bad: "text-bad" }[tone] : "";
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.07em] text-fg-3">{label}</div>
      <div className={`mt-1 text-[30px] leading-tight font-semibold tracking-tight tabular-nums ${c}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[13px] text-fg-2">{sub}</div>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="rise mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

export function BarList({ items, max }: { items: { label: string; n: number }[]; max?: number }) {
  const m = max ?? Math.max(1, ...items.map((i) => i.n));
  return (
    <ul className="space-y-2.5">
      {items.map((i, k) => (
        <li key={i.label} className="grid grid-cols-[130px_1fr_28px] items-center gap-3 text-[13px]">
          <span className="truncate text-fg-2">{i.label}</span>
          <div className="h-2 overflow-hidden rounded bg-surface-2 ring-1 ring-inset ring-line">
            <div className="meter-fill h-full rounded bg-accent" style={{ "--v": i.n / m, "--d": `${k * 50}ms` } as React.CSSProperties} />
          </div>
          <span className="text-right font-mono text-xs tabular-nums text-fg-2">{i.n}</span>
        </li>
      ))}
    </ul>
  );
}

export function CardHead({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-4 py-3">
      <h2>{title}</h2>
      {aside}
    </div>
  );
}
