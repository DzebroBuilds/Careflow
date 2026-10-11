import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { PageHeader } from "@/components/ui";
import { StaffPanel } from "@/components/panels";

export const metadata: Metadata = { title: "Staff" };

export default async function Staff() {
  await requirePermission("view:staff");
  return (
    <>
      <PageHeader title="Staff" sub="Credentials and training. Scheduling is blocked once a credential lapses." />
      <StaffPanel />
    </>
  );
}
