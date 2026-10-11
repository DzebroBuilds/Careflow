import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { StaffPanel } from "@/components/panels";

export const metadata: Metadata = { title: "Staff" };

export default function Staff() {
  return (
    <>
      <PageHeader title="Staff" sub="Credentials and training. Scheduling is blocked once a credential lapses." />
      <StaffPanel />
    </>
  );
}
