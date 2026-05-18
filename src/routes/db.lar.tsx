import { createFileRoute } from "@tanstack/react-router";
import { AuditsTable } from "@/components/AuditsTable";

export const Route = createFileRoute("/db/lar")({
  head: () => ({ meta: [{ title: "LAR DB — Compliance 360" }] }),
  component: () => <AuditsTable title="LAR DB" subtitle="All Logical Access Review records" filterType="LAR" />,
});
