import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { PageHeader } from "@/components/ui";
import { MedsPanel } from "@/components/panels";

export const metadata: Metadata = { title: "Medications" };

export default async function Medications() {
  await requirePermission("view:medications");
  return (
    <>
      <PageHeader title="Medications" sub="Active orders by resident, and who is cleared to administer them." />
      <MedsPanel />
    </>
  );
}
