import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guard";
import { PageHeader } from "@/components/ui";
import { TrackingPanel } from "@/components/panels";

export const metadata: Metadata = { title: "Monthly files" };

export default async function Monthly() {
  await requirePermission("view:monthly");
  return (
    <>
      <PageHeader title="Monthly files" sub="MAR, ONA and Safety Plan per resident. Uploads are checked for signatures and dates." />
      <TrackingPanel />
    </>
  );
}
