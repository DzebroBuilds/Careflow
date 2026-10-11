import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { ActionList, countBy } from "@/components/actions";
import { PageHeader, Stat, StatGrid } from "@/components/ui";
import { getActions } from "@/lib/data";

export const metadata: Metadata = { title: "Today" };

export default async function Today() {
  await requirePermission("view:today");
  const items = await getActions();
  const crit = countBy(items, "critical");
  return (
    <>
      <PageHeader title="Today" sub="Everything that needs a person, ranked by risk. Fix the top and the readiness scores move." />
      <StatGrid>
        <Stat label="Critical" value={crit} sub="Act today" tone={crit ? "bad" : "good"} />
        <Stat label="High" value={countBy(items, "high")} sub="Overdue or due this week" tone="bad" />
        <Stat label="Medium" value={countBy(items, "medium")} sub="This week or month" tone="warn" />
        <Stat label="Low" value={countBy(items, "low")} sub="Scheduled reviews" />
      </StatGrid>
      <ActionList items={items} title="Action queue, all homes" />
    </>
  );
}
