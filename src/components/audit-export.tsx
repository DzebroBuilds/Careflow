"use client";
import type { ActionItem } from "@/lib/data";

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function ExportFindings({ items, name }: { items: ActionItem[]; name: string }) {
  const download = () => {
    const rows = [["Severity", "Category", "Home", "Finding", "Fix", "Owner", "Due"], ...items.map((a) => [a.severity, a.category, a.homeName, a.title, a.detail, a.owner, a.due])];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${name}-findings.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={download} className="press hov h-8 rounded-md border border-line-strong bg-surface px-3 text-[13px] font-medium hover:bg-surface-2">
      Download findings (CSV)
    </button>
  );
}
