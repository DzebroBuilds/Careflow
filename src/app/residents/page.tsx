import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { PageHeader } from "@/components/ui";
import { ResidentsPanel } from "@/components/panels";

export const metadata: Metadata = { title: "Residents" };

export default async function Residents() {
  await requirePermission("view:residents");
  return (
    <>
      <PageHeader title="Residents" sub="Care-file health and risk profile. Select a resident to open details." />
      <ResidentsPanel />
    </>
  );
}
