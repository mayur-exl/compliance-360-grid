import { createFileRoute } from "@tanstack/react-router";
import { AuditsTable } from "@/components/AuditsTable";

export const Route = createFileRoute("/db/overall")({
  head: () => ({ meta: [{ title: "Overall Audits — Compliance 360" }] }),
  component: () => <AuditsTable title="Overall Audits" subtitle="Unified audit database across all review types" />,
});
