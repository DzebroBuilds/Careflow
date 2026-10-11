import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { MedsPanel } from "@/components/panels";

export const metadata: Metadata = { title: "Medications" };

export default function Medications() {
  return (
    <>
      <PageHeader title="Medications" sub="Active orders by resident, and who is cleared to administer them." />
      <MedsPanel />
    </>
  );
}
