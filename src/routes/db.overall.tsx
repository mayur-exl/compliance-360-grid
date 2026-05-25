import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Search, ChevronDown, ChevronRight, Download, FileSpreadsheet,
  Building2, ShieldCheck, FileText, Users, Eye, CalendarClock,
} from "lucide-react";
import { PageHeader, SectionCard, Badge } from "@/components/ui-bits";
import { Button, Select } from "@/components/form-bits";
import { useAudits } from "@/lib/audit-store";
import { IMU_OPTIONS } from "@/lib/mock-data";
import {
  summarizeClients, currentQuarter, quarterLabel, quarterRange,
  type ClientSummary, type QuarterlyTypeSummary, type TypeSummary,
} from "@/lib/clients";
import { exportExcelSections, exportPdfSections } from "@/lib/exporters";

export const Route = createFileRoute("/db/overall")({
  head: () => ({ meta: [{ title: "Overall Audits — Compliance 360" }] }),
  component: Page,
});

function Page() {
  const audits = useAudits();
  const q = currentQuarter();
  const range = quarterRange(q);

  const [search, setSearch] = useState("");
  const [imu, setImu] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [riskFilter, setRiskFilter] = useState<"all" | "low" | "medium" | "high">("all");

  const summaries = useMemo(() => summarizeClients(audits, q), [audits, q]);

  const filtered = useMemo(() => summaries.filter((s) => {
    if (search && !s.client.toLowerCase().includes(search.toLowerCase()) && !s.clientId.toLowerCase().includes(search.toLowerCase())) return false;
    if (imu && s.imu !== imu) return false;
    if (riskFilter === "high" && s.overallCompliance >= 70) return false;
    if (riskFilter === "medium" && (s.overallCompliance < 70 || s.overallCompliance >= 85)) return false;
    if (riskFilter === "low" && s.overallCompliance < 85) return false;
    return true;
  }), [summaries, search, imu, riskFilter]);

  const totals = useMemo(() => ({
    clients: summaries.length,
    avgCompliance: summaries.length
      ? Math.round(summaries.reduce((s, c) => s + c.overallCompliance, 0) / summaries.length)
      : 0,
    pendingQuarterly: summaries.reduce((s, c) =>
      s + (c.lar.quarterStatus !== "Completed" ? 1 : 0) + (c.endpoint.quarterStatus !== "Completed" ? 1 : 0), 0),
    overdueControls: summaries.reduce((s, c) => s + (c.contractual.controlsOverdue ?? 0), 0),
  }), [summaries]);

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function exportConsolidatedExcel() {
    exportExcelSections(`overall-${q.year}-Q${q.q}`, [
      { title: `Consolidated Compliance — ${quarterLabel(q)}`,
        headers: ["Client ID", "Client", "IMU", "Overall %", "Contractual %", "LAR %", "LAR Q-Status", "Endpoint %", "Endpoint Q-Status", "Total Audits", "Anomalies", "Overdue Controls"],
        rows: summaries.map((s) => [
          s.clientId, s.client, s.imu, s.overallCompliance,
          s.contractual.compliance, s.lar.compliance, s.lar.quarterStatus,
          s.endpoint.compliance, s.endpoint.quarterStatus,
          s.totalAudits, s.totalAnomalies, s.contractual.controlsOverdue ?? 0,
        ]),
      },
    ]);
  }

  function exportConsolidatedPdf() {
    exportPdfSections(`overall-${q.year}-Q${q.q}`,
      `Consolidated Compliance — ${quarterLabel(q)}`,
      `Quarter ${range.start} → ${range.end} · ${summaries.length} clients`,
      [{
        title: `Client Overview (${summaries.length})`,
        headers: ["Client ID", "Client", "Overall %", "Contract %", "LAR Q", "Endpoint Q", "Audits", "Anomalies"],
        rows: summaries.map((s) => [
          s.clientId, s.client, `${s.overallCompliance}%`,
          `${s.contractual.compliance}%`, s.lar.quarterStatus, s.endpoint.quarterStatus,
          s.totalAudits, s.totalAnomalies,
        ]),
      }],
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overall Compliance Database"
        subtitle={`Consolidated client view for ${quarterLabel(q)} (${range.start} → ${range.end})`}
        actions={
          <>
            <Button variant="outline" onClick={exportConsolidatedExcel}><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
            <Button variant="outline" onClick={exportConsolidatedPdf}><Download className="h-4 w-4" /> Export PDF</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Clients Tracked" value={totals.clients} icon={Users} tint="primary" />
        <KpiTile label="Avg Compliance" value={`${totals.avgCompliance}%`} icon={ShieldCheck}
          tint={totals.avgCompliance >= 85 ? "success" : totals.avgCompliance >= 70 ? "warning" : "danger"} />
        <KpiTile label={`Pending ${quarterLabel(q)} Reviews`} value={totals.pendingQuarterly} icon={CalendarClock}
          tint={totals.pendingQuarterly === 0 ? "success" : "warning"} />
        <KpiTile label="Overdue Contract Controls" value={totals.overdueControls} icon={FileText}
          tint={totals.overdueControls === 0 ? "success" : "danger"} />
      </div>

      <SectionCard title={`Clients (${filtered.length})`} subtitle="Click a client tile to expand audits performed this quarter">
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name or ID..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <Select value={imu} onChange={setImu} options={[...IMU_OPTIONS]} placeholder="All IMUs" />
          <Select value={riskFilter} onChange={(v) => setRiskFilter(v as typeof riskFilter)}
            options={["all", "low", "medium", "high"]} placeholder="Risk filter" />
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No clients match these filters
            </div>
          )}
          {filtered.map((s) => (
            <ClientTile key={s.clientId} summary={s} expanded={expanded.has(s.clientId)} onToggle={() => toggle(s.clientId)} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ClientTile({ summary, expanded, onToggle }: { summary: ClientSummary; expanded: boolean; onToggle: () => void }) {
  const tone = summary.overallCompliance >= 85 ? "success" : summary.overallCompliance >= 70 ? "warning" : "danger";
  const ringColor = tone === "success" ? "text-[color:var(--color-success)]" : tone === "warning" ? "text-[color:var(--color-warning)]" : "text-destructive";
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 text-primary shrink-0">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-base font-semibold truncate">{summary.client}</div>
            <span className="font-mono text-[11px] text-muted-foreground">{summary.clientId}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
            <span>{summary.imu} · {summary.sgu}</span>
            <span>· Onboarded {summary.onboardedOn}</span>
            <span>· {summary.totalAudits} audits all-time</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <QuarterPill label="Contractual" status={contractualQuarterStatus(summary)} />
          <QuarterPill label="LAR" status={summary.lar.quarterStatus} />
          <QuarterPill label="Endpoint" status={summary.endpoint.quarterStatus} />
        </div>
        <div className="text-right shrink-0 w-20">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall</div>
          <div className={`text-2xl font-bold ${ringColor}`}>{summary.overallCompliance}%</div>
        </div>
      </button>

      {expanded && <ExpandedContent summary={summary} />}
    </div>
  );
}

function ExpandedContent({ summary }: { summary: ClientSummary }) {
  return (
    <div className="border-t border-border bg-muted/20 p-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ComplianceCard title="Contractual" icon={FileText}
          compliance={summary.contractual.compliance}
          subtitle={summary.contractual.controlsTotal
            ? `${summary.contractual.controlsCompliant}/${summary.contractual.controlsTotal} controls compliant`
            : "No SOW recorded"}
          extras={summary.contractual.controlsTotal ? [
            { label: "Pending", value: summary.contractual.controlsPending ?? 0 },
            { label: "Overdue", value: summary.contractual.controlsOverdue ?? 0, danger: (summary.contractual.controlsOverdue ?? 0) > 0 },
          ] : []}
        />
        <QuarterlyCard title="Logical Access Review" icon={Users} summary={summary.lar} />
        <QuarterlyCard title="Endpoint Review" icon={ShieldCheck} summary={summary.endpoint} />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Audits performed this quarter ({summary.quarterAudits.length})
          </div>
        </div>
        {summary.quarterAudits.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
            No audits performed yet in this quarter
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Audit ID</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Compliance</th>
                  <th className="px-3 py-2 text-left">Anomalies</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Report</th>
                </tr>
              </thead>
              <tbody>
                {summary.quarterAudits
                  .slice()
                  .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))
                  .map((a) => (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
                      <td className="px-3 py-2">{a.type}</td>
                      <td className="px-3 py-2">
                        <Badge variant={a.status === "Completed" ? "success" : a.status === "Pending" ? "warning" : "info"}>{a.status}</Badge>
                      </td>
                      <td className="px-3 py-2 font-semibold">{a.compliance}%</td>
                      <td className="px-3 py-2">
                        <span className={a.anomalies > 5 ? "text-destructive font-semibold" : a.anomalies > 0 ? "text-[color:var(--color-warning)] font-semibold" : ""}>{a.anomalies}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{a.reviewDate}</td>
                      <td className="px-3 py-2 text-right">
                        <Link to="/db/report/$id" params={{ id: a.id }}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-secondary hover:bg-secondary/10">
                          <Eye className="h-3.5 w-3.5" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function contractualQuarterStatus(s: ClientSummary): QuarterlyTypeSummary["quarterStatus"] {
  if (s.contractual.count === 0) return "Pending";
  if ((s.contractual.controlsOverdue ?? 0) > 0) return "In Review";
  if ((s.contractual.controlsPending ?? 0) === 0) return "Completed";
  return "In Review";
}

function QuarterPill({ label, status }: { label: string; status: QuarterlyTypeSummary["quarterStatus"] }) {
  const tone = status === "Completed" ? "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]"
    : status === "In Review" ? "bg-secondary/15 text-secondary"
    : "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]";
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 leading-tight">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>{status}</div>
    </div>
  );
}

function ComplianceCard({
  title, icon: Icon, compliance, subtitle, extras = [],
}: {
  title: string; icon: React.ComponentType<{ className?: string }>;
  compliance: number; subtitle: string;
  extras?: Array<{ label: string; value: number; danger?: boolean }>;
}) {
  const tone = compliance >= 85 ? "text-[color:var(--color-success)]" : compliance >= 70 ? "text-[color:var(--color-warning)]" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className={`text-2xl font-bold ${tone}`}>{compliance}%</div>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
      {extras.length > 0 && (
        <div className="mt-3 flex gap-3 text-[11px]">
          {extras.map((e) => (
            <div key={e.label}>
              <div className="uppercase tracking-wider text-muted-foreground text-[9px]">{e.label}</div>
              <div className={`font-semibold ${e.danger ? "text-destructive" : ""}`}>{e.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuarterlyCard({ title, icon: Icon, summary }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary: QuarterlyTypeSummary;
}) {
  const tone = summary.compliance >= 85 ? "text-[color:var(--color-success)]" : summary.compliance >= 70 ? "text-[color:var(--color-warning)]" : "text-destructive";
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-secondary/10 text-secondary"><Icon className="h-4 w-4" /></div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      </div>
      <div className="mt-2 flex items-end gap-2">
        <div className={`text-2xl font-bold ${tone}`}>{summary.count ? `${summary.compliance}%` : "—"}</div>
        <div className="ml-auto">
          <Badge variant={summary.quarterStatus === "Completed" ? "success" : summary.quarterStatus === "In Review" ? "info" : "warning"}>
            {summary.quarterStatus}
          </Badge>
        </div>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {summary.count === 0
          ? "No audits performed yet"
          : `Latest: ${summary.latestReviewDate ?? "—"} · ${summary.count} all-time audits`}
      </div>
    </div>
  );
}

function KpiTile({ label, value, icon: Icon, tint }: {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tint: "primary" | "success" | "warning" | "danger";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    success: "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]",
    warning: "bg-[color:var(--color-warning)]/15 text-[color:var(--color-warning)]",
    danger: "bg-destructive/10 text-destructive",
  };
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${map[tint]}`}><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}
