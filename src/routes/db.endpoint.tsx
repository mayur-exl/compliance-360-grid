import { createFileRoute } from "@tanstack/react-router";
import { AuditsTable } from "@/components/AuditsTable";

export const Route = createFileRoute("/db/endpoint")({
  head: () => ({ meta: [{ title: "Endpoint DB — Compliance 360" }] }),
  component: () => <AuditsTable title="Endpoint DB" subtitle="All Endpoint Review records" filterType="Endpoint" />,
});
