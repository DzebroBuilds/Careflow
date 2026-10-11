import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ResidentsTable } from "@/components/residents-table";
import { getResidents } from "@/lib/data";

export const metadata: Metadata = { title: "Residents" };

export default async function Residents() {
  const rows = await getResidents();
  return (
    <>
      <PageHeader title="Residents" sub="Select a resident to open details. A check means current; only exceptions are called out." />
      <ResidentsTable rows={rows} />
    </>
  );
}
