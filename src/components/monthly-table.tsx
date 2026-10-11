"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardHead, Tag } from "@/components/ui";
import { detectTypeFromName, gate, simulateExtraction, type MonthlyType } from "@/lib/compliance/gatekeeper";
import type { TrackingRow } from "@/lib/data";

type Status = "VERIFIED" | "REJECTED" | "MISSING" | "PROCESSING";
interface Cell { type: string; status: Status; stage?: string; failed?: string[]; file?: string; version: number }
interface Toast { id: number; tone: "good" | "bad"; text: string }

const TYPE_KEY: Record<string, MonthlyType> = { MAR: "MAR", ONA: "ONA", "Safety Plan": "SAFETY_PLAN" };
const FILE = {
  VERIFIED: { tone: "good", label: "Verified" }, REJECTED: { tone: "bad", label: "Rejected" },
  MISSING: { tone: "bad", label: "Missing" }, PROCESSING: { tone: "neutral", label: "Processing" },
} as const;
const STAGES = ["Reading text (OCR)", "Checking signature blocks", "Matching document type"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function MonthlyTable({ rows, showHome, canUpload }: { rows: TrackingRow[]; showHome: boolean; canUpload: boolean }) {
  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const m: Record<string, Cell> = {};
    for (const r of rows) for (const c of r.cells) m[`${r.resident}:${c.type}`] = { type: c.type, status: c.status as Status, version: c.status === "MISSING" ? 0 : 1 };
    return m;
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [over, setOver] = useState(false);
  const pick = useRef<{ resident: string; type: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  const toast = useCallback((tone: Toast["tone"], text: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);
  useEffect(() => () => { seq.current = 0; }, []);

  const patch = (k: string, p: Partial<Cell>) => setCells((c) => ({ ...c, [k]: { ...c[k], ...p } }));

  const run = useCallback(async (resident: string, type: string, file: File) => {
    const k = `${resident}:${type}`;
    const prev = cells[k];
    patch(k, { status: "PROCESSING", stage: STAGES[0], failed: undefined });
    for (const s of STAGES.slice(1)) { await sleep(650); patch(k, { stage: s }); }
    await sleep(650);
    const result = gate(TYPE_KEY[type], simulateExtraction(file.name, file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "")));
    if (result.status === "PASSED") {
      patch(k, { status: "VERIFIED", stage: undefined, failed: undefined, file: file.name, version: prev.version + 1 });
      toast("good", `Verified ${type} for ${resident}`);
    } else {
      patch(k, { status: "REJECTED", stage: undefined, failed: result.failedFields, file: file.name });
      toast("bad", `Rejected ${type} for ${resident}: ${result.failedFields[0]}`);
    }
  }, [cells, toast]);

  const onFiles = (files: FileList | File[], target?: { resident: string; type: string }) => {
    if (!canUpload) return;
    for (const f of Array.from(files)) {
      if (target) { run(target.resident, target.type, f); continue; }
      const t = detectTypeFromName(f.name);
      const res = rows.find((r) => new RegExp(`(^|[^A-Za-z])${r.resident}([^A-Za-z]|$)`).test(f.name));
      const type = t === "SAFETY_PLAN" ? "Safety Plan" : t;
      if (!res || !type) { toast("bad", `Couldn't tell which resident or form ${f.name} is. Upload it from the row instead.`); continue; }
      run(res.resident, type, f);
    }
  };

  const n = (s: Status) => Object.values(cells).filter((c) => c.status === s).length;
  const total = Object.keys(cells).length;
  const types = ["MAR", "ONA", "Safety Plan"];

  return (
    <>
      {canUpload && <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        className={`mb-4 flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-7 text-center transition-colors duration-150 ${over ? "border-accent bg-accent-soft" : "border-line-strong bg-surface"}`}
      >
        <p className="font-medium">Drop signed PDFs here</p>
        <p className="text-[13px] text-fg-2">Name them like <span className="font-mono text-xs">MAR_ZB_2026-09.pdf</span> and they file themselves. Files with &ldquo;unsigned&rdquo; in the name will be rejected, to demo the checks.</p>
      </div>}

      <div className="rise mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([["Verified", n("VERIFIED"), "text-good"], ["Rejected", n("REJECTED"), n("REJECTED") ? "text-bad" : ""], ["Missing", n("MISSING"), n("MISSING") ? "text-bad" : ""], ["Processing", n("PROCESSING"), ""]] as const).map(([l, v, c]) => (
          <div key={l} className="rounded-lg border border-line bg-surface p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.07em] text-fg-3">{l}</div>
            <div className={`mt-1 text-[30px] leading-tight font-semibold tabular-nums ${c}`}>{v}<span className="text-[15px] font-normal text-fg-3"> / {total}</span></div>
          </div>
        ))}
      </div>

      <input ref={input} type="file" accept="application/pdf,.pdf,image/*" hidden
        onChange={(e) => { if (e.target.files && pick.current) onFiles(e.target.files, pick.current); e.target.value = ""; }} />

      <Card className="overflow-x-auto">
        <CardHead title="September monthly files" aside={<span className="text-[13px] text-fg-3">Due Oct 5</span>} />
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-[0.06em] text-fg-3">
              <th scope="col" className="px-4 py-2.5">Resident</th>
              {showHome && <th scope="col" className="px-2 py-2.5">Home</th>}
              {types.map((t) => <th key={t} scope="col" className="px-2 py-2.5">{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.resident} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-2.5 font-mono text-[13px] font-medium">{r.resident}</th>
                {showHome && <td className="px-2 py-2.5 whitespace-nowrap text-fg-2">{r.homeName}</td>}
                {types.map((t) => {
                  const c = cells[`${r.resident}:${t}`];
                  const act = c.status === "MISSING" ? "Upload" : "Replace";
                  return (
                    <td key={t} className="px-2 py-2 align-top">
                      <div className="flex items-center gap-1.5">
                        {c.status === "PROCESSING"
                          ? <span className="text-[13px] text-fg-2" role="status">{c.stage}…</span>
                          : c.status === "VERIFIED"
                            ? <span className="text-fg-3"><span aria-hidden>✓</span><span className="sr-only">Verified</span></span>
                            : <Tag tone={FILE[c.status].tone}>{FILE[c.status].label}</Tag>}
                        {canUpload && c.status !== "PROCESSING" && (
                          <button
                            onClick={() => { pick.current = { resident: r.resident, type: t }; input.current?.click(); }}
                            aria-label={`${act} ${t} for ${r.resident}`}
                            className="press hov rounded px-1.5 py-0.5 text-xs font-medium text-accent hover:bg-accent-soft"
                          >{act}</button>
                        )}
                      </div>
                      {c.failed && <ul className="mt-1 text-xs text-bad">{c.failed.map((f) => <li key={f}>{f}</li>)}</ul>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-[min(380px,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="glass rise pointer-events-auto flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px]">
            <span aria-hidden className={`size-2 shrink-0 rounded-full ${t.tone === "good" ? "bg-good" : "bg-bad"}`} />
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
