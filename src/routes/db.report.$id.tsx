import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileText, Download, Building2, Calendar, Shield, Upload, Clock, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAudits } from "@/lib/audit-store";
import { PageHeader, SectionCard, Badge } from "@/components/ui-bits";
import { Button } from "@/components/form-bits";
import { CONTRACTUAL_CONTROLS, LAR_ALLOWED_GROUPS, ENDPOINT_BASELINE, type AuditRecord, type ContractualControl } from "@/lib/mock-data";
import { exportExcelSections, exportPdfSections } from "@/lib/exporters";
import { clientId } from "@/lib/clients";
import { UploadArtifactModal } from "@/components/ContractualWorkflow";


export const Route = createFileRoute("/db/report/$id")({
  head: ({ params }) => ({ meta: [{ title: `Report ${params.id} — Compliance 360` }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    control: typeof s.control === "string" ? s.control : undefined,
  }),
  component: ReportPage,
  notFoundComponent: () => {
    const { id } = Route.useParams();
    return (
      <div className="space-y-4">
        <PageHeader title="Report not found" subtitle={`No audit with ID ${id} exists in the database.`} />
        <Link to="/db/overall" className="inline-flex items-center gap-2 text-sm text-secondary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Audit DB
        </Link>
      </div>
    );
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="space-y-3">
        <PageHeader title="Could not load report" subtitle={error.message} />
        <Button variant="outline" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
      </div>
    );
  },
});

function ReportPage() {
  const { id } = Route.useParams();
  const { control: focusControl } = Route.useSearch();
  const audits = useAudits();
  const audit = audits.find((a) => a.id === id);
  if (!audit) throw notFound();

  const isContractual = !!(audit.type === "Contractual" && audit.controls && audit.controls.length > 0);
  const realControls = isContractual ? audit.controls! : [];
  const legacyControls = isContractual ? [] : controlsFor(audit);

  const compliantCount = isContractual
    ? realControls.filter((c) => c.status === "Compliant").length
    : legacyControls.filter((c) => c.status === "Compliant").length;
  const totalCount = isContractual ? realControls.length : legacyControls.length;

  // NEW: Get validation status for contractual controls
  const validationStatus = isContractual ? (audit.controlsValidationStatus ?? "Artifacts Pending") : undefined;

  const [uploadFor, setUploadFor] = useState<{ name: string; language: string } | null>(null);

  // Deep-link from notifications: auto-open upload modal
  useEffect(() => {
    if (!focusControl || !isContractual) return;
    const c = realControls.find((x) => x.name === focusControl);
    if (c) setUploadFor({ name: c.name, language: c.language });
    // scroll to controls section
    const el = document.getElementById("controls-section");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusControl, isContractual]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6" id="report-printable">
      <div className="flex items-center justify-between print:hidden">
        <Link to="/db/overall" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Audit DB
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportPdf(audit, isContractual ? realControls : legacyControls, isContractual)}><Download className="h-4 w-4" /> Export PDF</Button>
          <Button variant="outline" onClick={() => exportExcel(audit, isContractual ? realControls : legacyControls, isContractual)}><FileText className="h-4 w-4" /> Export Excel</Button>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-sidebar to-[#1a1a1a] text-white p-6 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/60">Audit Report</div>
            <h1 className="mt-1 text-2xl font-bold">{audit.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
              <span className="font-mono">{audit.id}</span>
              <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {audit.client}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {audit.reviewDate}</span>
              <span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {audit.type}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-white/60">{isContractual ? "Controls Validation Status" : "Compliance Score"}</div>
            <div className={`mt-1 text-4xl font-bold ${isContractual ? getStatusColor(validationStatus) : audit.compliance >= 80 ? "text-[color:var(--color-success)]" : audit.compliance >= 60 ? "text-[color:var(--color-warning)]" : "text-destructive"}`}>
              {isContractual ? validationStatus : `${audit.compliance}%`}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Status" value={audit.status} />
        <Stat label="IMU" value={audit.imu} />
        <Stat label="SGU" value={audit.sgu} />
        <Stat label="Anomalies" value={String(audit.anomalies)} accent={audit.anomalies > 0 ? "danger" : "success"} />
      </div>

      <div id="controls-section">
      {isContractual ? (
        <SectionCard
          title="Contractual Controls — Artifact Tracking"
          subtitle={`${compliantCount} of ${totalCount} controls compliant · upload artifacts to validate`}
        >
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Control</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Section</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Frequency</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Next Due</th>
                  <th className="text-right px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {realControls.map((c) => {
                  const due = new Date(c.nextDueDate);
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
                  const overdue = days < 0 && c.status !== "Compliant";
                  const effective: ContractualControl["status"] = overdue ? "Overdue" : c.status;
                  return (
                    <tr key={c.name} className={`border-t border-border ${focusControl === c.name ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-2.5 font-medium">{c.name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{c.sectionNumber}</td>
                      <td className="px-4 py-2.5"><Badge variant="info">{c.frequency}</Badge></td>
                      <td className="px-4 py-2.5"><ControlStatusBadge status={effective} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {c.nextDueDate}
                        <span className={`ml-2 text-[11px] ${overdue ? "text-destructive font-semibold" : days <= 10 ? "text-[color:var(--color-warning)] font-semibold" : "text-muted-foreground"}`}>
                          {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "due today" : `${days}d left`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="primary" onClick={() => setUploadFor({ name: c.name, language: c.language })}>
                          <Upload className="h-3.5 w-3.5" /> Upload Artifact
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Submission history */}
          <div className="mt-4 space-y-3">
            {realControls.filter((c) => c.submissions.length > 0).map((c) => (
              <div key={c.name} className="rounded-lg border border-border bg-muted/20 p-3 text-xs">
                <div className="font-semibold mb-1.5">{c.name} — Submission History ({c.submissions.length})</div>
                <ul className="space-y-1">
                  {c.submissions.slice().reverse().map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      {s.verdict === "Compliant"
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-success)]" />
                        : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      <span className="font-mono text-[11px]">{s.date}</span>
                      <span className="truncate">{s.fileName}</span>
                      <span className="ml-auto text-muted-foreground truncate">{s.notes}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Control Validation" subtitle={`${compliantCount} of ${totalCount} controls compliant`}>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Control</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">Detail</th>
                </tr>
              </thead>
              <tbody>
                {legacyControls.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2.5 font-medium">{c.control}</td>
                    <td className="px-4 py-2.5">
                      {c.status === "Compliant" ? (
                        <Badge variant="success"><CheckCircle2 className="mr-1 inline h-3 w-3" />{c.status}</Badge>
                      ) : (
                        <Badge variant="danger"><AlertTriangle className="mr-1 inline h-3 w-3" />{c.status}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
      </div>

      <SectionCard title="Executive Summary">
        <p className="text-sm leading-relaxed">
          The {audit.type} review for <strong>{audit.client}</strong> ({audit.imu} · {audit.sgu}) was recorded on{" "}
          {audit.reviewDate}{isContractual ? "" : ` with an overall compliance score of ${audit.compliance}%`}.
          {isContractual ? (
            <>
              {" "}{realControls.filter((c) => c.status === "Pending").length > 0
                ? `${realControls.filter((c) => c.status === "Pending").length} control(s) are awaiting artifact submission. `
                : ""}
              {realControls.filter((c) => c.status === "Non-Compliant" || (c.status !== "Compliant" && new Date(c.nextDueDate) < new Date())).length > 0
                ? `${realControls.filter((c) => c.status === "Non-Compliant").length} non-compliant, action required.`
                : `Tracking on schedule.`}
            </>
          ) : (
            <>
              {" "}{audit.anomalies > 0
                ? `${audit.anomalies} anomalies require remediation. Owner action expected within 14 days.`
                : `No anomalies detected — all baseline controls validated successfully.`}
            </>
          )}
        </p>
      </SectionCard>

      {uploadFor && (
        <UploadArtifactModal
          open={!!uploadFor}
          auditId={audit.id}
          controlName={uploadFor.name}
          language={uploadFor.language}
          onClose={() => setUploadFor(null)}
        />
      )}
    </div>
  );
}

function ControlStatusBadge({ status }: { status: ContractualControl["status"] }) {
  if (status === "Compliant")
    return <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--color-success)]/15 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-success)]"><CheckCircle2 className="h-3 w-3" />Compliant</span>;
  if (status === "Non-Compliant")
    return <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive"><XCircle className="h-3 w-3" />Non-Compliant</span>;
  if (status === "Overdue")
    return <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive"><AlertTriangle className="h-3 w-3" />Overdue</span>;
  return <span className="inline-flex items-center gap-1 rounded-md bg-[color:var(--color-warning)]/15 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--color-warning)]"><Clock className="h-3 w-3" />Pending</span>;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "success" | "danger" }) {
  const cl = accent === "success" ? "text-[color:var(--color-success)]" : accent === "danger" ? "text-destructive" : "";
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${cl}`}>{value}</div>
    </div>
  );
}

// NEW: Helper to get color for validation status
function getStatusColor(status?: string): string {
  switch (status) {
    case "Artifacts Pending":
      return "text-[color:var(--color-warning)]";
    case "Analyzing...":
      return "text-[color:var(--color-warning)]";
    case "Compliant":
      return "text-[color:var(--color-success)]";
    case "Non-Compliant":
      return "text-destructive";
    case "Mixed":
      return "text-[color:var(--color-warning)]";
    default:
      return "text-muted-foreground";
  }
}

type Ctl = { control: string; status: "Compliant" | "Non-Compliant"; detail: string };
function controlsFor(a: AuditRecord): Ctl[] {
  const baseline = a.type === "Contractual" ? CONTRACTUAL_CONTROLS : a.type === "LAR" ? LAR_ALLOWED_GROUPS : ENDPOINT_BASELINE;
  const seed = Array.from(a.id).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const failTarget = a.anomalies;
  return baseline.map((b, i) => {
    const failed = ((seed + i * 7) % baseline.length) < failTarget;
    return {
      control: b,
      status: failed ? "Non-Compliant" : "Compliant",
      detail: failed ? "Requires remediation — see attached evidence." : `Validated against ${a.type} baseline.`,
    };
  });
}

function metaRows(a: AuditRecord): Array<[string, string]> {
  return [
    ["Audit ID", a.id], ["Client ID", clientId(a.client)], ["Title", a.title],
    ["Client", a.client], ["Type", a.type], ["IMU", a.imu], ["SGU", a.sgu],
    ["Status", a.status], ["Review Date", a.reviewDate],
    ["Compliance %", String(a.compliance)], ["Anomalies", String(a.anomalies)],
  ];
}

function exportPdf(a: AuditRecord, controls: Ctl[] | ContractualControl[], isContractual: boolean) {
  const rows = isContractual
    ? (controls as ContractualControl[]).map((c) => [c.name, c.sectionNumber, c.frequency, c.status, c.nextDueDate])
    : (controls as Ctl[]).map((c) => [c.control, c.status, c.detail]);
  const headers = isContractual
    ? ["Control", "Section", "Frequency", "Status", "Next Due"]
    : ["Control", "Status", "Detail"];
  exportPdfSections(
    `${a.id}-report`,
    `Audit Report — ${a.id}`,
    `${a.client} · ${a.type} · ${a.reviewDate}`,
    [
      { title: "Audit Metadata", headers: ["Field", "Value"], rows: metaRows(a) },
      { title: isContractual ? "Contractual Controls" : "Control Validation", headers, rows },
    ],
  );
}

function exportExcel(a: AuditRecord, controls: Ctl[] | ContractualControl[], isContractual: boolean) {
  const rows = isContractual
    ? (controls as ContractualControl[]).map((c) => [c.name, c.sectionNumber, c.frequency, c.status, c.nextDueDate])
    : (controls as Ctl[]).map((c) => [c.control, c.status, c.detail]);
  const headers = isContractual
    ? ["Control", "Section", "Frequency", "Status", "Next Due"]
    : ["Control", "Status", "Detail"];
  exportExcelSections(`${a.id}-report`, [
    { title: `Audit Report — ${a.id}`, rows: metaRows(a) },
    { title: isContractual ? "Contractual Controls" : "Control Validation", headers, rows },
  ]);
}
