"use client";
import { useEffect, useRef, useState } from "react";
import { Card, Tag } from "@/components/ui";
import type { ResidentRow } from "@/lib/data";

const DOC = {
  CURRENT: { tone: "good", label: "Current" }, REVIEW_DUE: { tone: "warn", label: "Review due" },
  CONFLICT: { tone: "bad", label: "Conflict" }, MISSING: { tone: "bad", label: "Missing" },
  PROCESSING: { tone: "neutral", label: "Processing" }, ARCHIVED: { tone: "neutral", label: "Archived" },
} as const;

export function ResidentsTable({ rows }: { rows: ResidentRow[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const [shown, setShown] = useState<ResidentRow | null>(null); // keeps content mounted during the exit slide
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const heads = ["RIT", "ISP", "PRMS", "Safety Plan", "PBSP"];

  const open = (r: ResidentRow, el: HTMLElement) => { lastTrigger.current = el; setShown(r); setSel(r.id); };
  const close = () => { setSel(null); lastTrigger.current?.focus(); };

  useEffect(() => { if (sel) closeRef.current?.focus(); }, [sel]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && sel) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel]);

  return (
    <>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Resident</th>
              <th scope="col" className="px-2 py-2.5">Home</th>
              {heads.map((h) => <th key={h} scope="col" className="px-2 py-2.5">{h}</th>)}
              <th scope="col" className="px-4 py-2.5 text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-b border-line last:border-0 hover:bg-surface-2 ${sel === r.id ? "bg-accent-soft" : ""}`}>
                <th scope="row" className="px-4 py-0 font-medium">
                  <button onClick={(e) => open(r, e.currentTarget)} className="press flex w-full items-center gap-2 py-2.5 text-left">
                    <span className="font-mono text-[13px]">{r.id}</span>
                    <span className="font-normal text-fg-3">{r.room}</span>
                  </button>
                </th>
                <td className="px-2 py-2.5 whitespace-nowrap text-fg-2">{r.homeName}</td>
                {r.docs.map((d) => (
                  <td key={d.label} className="px-2 py-2.5">
                    {d.status === "CURRENT"
                      ? <span className="text-fg-3"><span aria-hidden>✓</span><span className="sr-only">Current</span></span>
                      : <Tag tone={DOC[d.status].tone}>{DOC[d.status].label}</Tag>}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right font-mono text-[13px] tabular-nums">{r.openDiscrepancies || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="scrim fixed inset-0 z-40" data-open={!!sel} onClick={close} aria-hidden />
      <aside
        role="dialog" aria-label="Resident details" aria-hidden={!sel}
        data-open={!!sel}
        className="drawer glass fixed inset-y-0 right-0 z-50 flex w-[min(460px,100%)] flex-col rounded-none border-y-0 border-r-0"
      >
        {shown && (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <div className="flex items-center gap-2"><h2 className="font-mono text-[17px]">{shown.id}</h2><span className="text-fg-3">{shown.room}</span></div>
                <p className="text-fg-2">{shown.homeName}</p>
              </div>
              <button ref={closeRef} onClick={close} aria-label="Close" className="press hov grid size-8 place-items-center rounded-md text-fg-2 hover:bg-surface-2">
                <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] fill-none stroke-current stroke-[1.75]" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.07em] text-fg-3">Risk flags</h3>
              <div className="mb-5 flex flex-wrap gap-1.5">
                {shown.flags.length ? shown.flags.map((f) => <Tag key={f} tone="neutral">{f}</Tag>) : <span className="text-fg-3">None identified</span>}
              </div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.07em] text-fg-3">Care documents</h3>
              <ul className="overflow-hidden rounded-lg border border-line bg-surface">
                {shown.docs.map((d) => (
                  <li key={d.label} className="flex items-center justify-between border-b border-line px-3 py-2.5 last:border-0">
                    <span className="font-medium">{d.label}</span>
                    <Tag tone={DOC[d.status].tone}>{DOC[d.status].label}</Tag>
                  </li>
                ))}
              </ul>
              {shown.openDiscrepancies > 0 && (
                <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2.5 text-warn">
                  {shown.openDiscrepancies} risk {shown.openDiscrepancies === 1 ? "discrepancy" : "discrepancies"} open between documents.
                </p>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
