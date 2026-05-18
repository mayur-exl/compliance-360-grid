import { createFileRoute } from "@tanstack/react-router";
import { AuditsTable } from "@/components/AuditsTable";

type Search = { status?: "Completed" | "Pending" | "In Review" | ""; minAnomalies?: number };

export const Route = createFileRoute("/db/overall")({
  head: () => ({ meta: [{ title: "Overall Audits — Compliance 360" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: (s.status as Search["status"]) || "",
    minAnomalies: s.minAnomalies ? Number(s.minAnomalies) : 0,
  }),
  component: Page,
});

function Page() {
  const { status, minAnomalies } = Route.useSearch();
  const subtitle = status
    ? `Filtered by status: ${status}`
    : (minAnomalies ?? 0) > 0
      ? `Showing audits with anomalies ≥ ${minAnomalies}`
      : "Unified audit database across all review types";
  return <AuditsTable title="Overall Audits" subtitle={subtitle} initialStatus={status} initialMinAnomalies={minAnomalies} />;
}
