import { createFileRoute } from "@tanstack/react-router";
import { AuditsTable } from "@/components/AuditsTable";

export const Route = createFileRoute("/db/contractual")({
  head: () => ({ meta: [{ title: "Contractual DB — Compliance 360" }] }),
  component: () => <AuditsTable title="Contractual DB" subtitle="All contractual compliance audit records" filterType="Contractual" />,
});
