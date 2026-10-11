import Link from "next/link";
import { Card, CardHead, Tag } from "@/components/ui";
import type { ActionItem, ActionSeverity } from "@/lib/data";

export const SEV = {
  critical: { tone: "bad", label: "Critical" }, high: { tone: "bad", label: "High" },
  medium: { tone: "warn", label: "Medium" }, low: { tone: "neutral", label: "Low" },
} as const;

export function ActionList({ items, title, showHome = true, limit }: { items: ActionItem[]; title: string; showHome?: boolean; limit?: number }) {
  const list = limit ? items.slice(0, limit) : items;
  return (
    <Card>
      <CardHead title={title} aside={<span className="text-[13px] text-fg-3">{items.length} open</span>} />
      {list.length === 0 && <p className="p-6 text-center text-fg-3">Nothing needs action.</p>}
      <ul>
        {list.map((a) => (
          <li key={a.id} className="border-b border-line last:border-0">
            <Link href={a.href} className="hov flex items-start gap-3 px-4 py-3 hover:bg-surface-2">
              <div className="mt-0.5 w-[72px] shrink-0"><Tag tone={SEV[a.severity].tone}>{SEV[a.severity].label}</Tag></div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.title}</div>
                <div className="text-[13px] text-fg-2">{a.detail}</div>
              </div>
              <div className="hidden shrink-0 text-right text-[13px] sm:block">
                <div className="font-medium">{a.due}</div>
                <div className="text-fg-3">{a.owner}{showHome && ` · ${a.homeName}`}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export const countBy = (items: ActionItem[], s: ActionSeverity) => items.filter((i) => i.severity === s).length;
