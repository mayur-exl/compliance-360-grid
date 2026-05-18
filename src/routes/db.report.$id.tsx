import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, AlertTriangle, FileText, Download, Building2, Calendar, Shield } from "lucide-react";
import { useAudits } from "@/lib/audit-store";
import { PageHeader, SectionCard, Badge } from "@/components/ui-bits";
import { Button } from "@/components/form-bits";
import { CONTRACTUAL_CONTROLS, LAR_ALLOWED_GROUPS, ENDPOINT_BASELINE, type AuditRecord } from "@/lib/mock-data";

export const Route = createFileRoute("/db/report/$id")({
  head: ({ params }) => ({ meta: [{ title: `Report ${params.id} — Compliance 360` }] }),
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
  const audits = useAudits();
  const audit = audits.find((a) => a.id === id);
  if (!audit) throw notFound();

  const controls = controlsFor(audit);
  const compliantCount = controls.filter((c) => c.status === "Compliant").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/db/overall" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Audit DB
        </Link>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="h-4 w-4" /> Export PDF</Button>
          <Button variant="outline"><FileText className="h-4 w-4" /> Export Excel</Button>
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
            <div className="text-xs uppercase tracking-wider text-white/60">Compliance Score</div>
            <div className={`mt-1 text-4xl font-bold ${audit.compliance >= 80 ? "text-[color:var(--color-success)]" : audit.compliance >= 60 ? "text-[color:var(--color-warning)]" : "text-destructive"}`}>
              {audit.compliance}%
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

      <SectionCard title="Control Validation" subtitle={`${compliantCount} of ${controls.length} controls compliant`}>
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
              {controls.map((c, i) => (
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

      <SectionCard title="Executive Summary">
        <p className="text-sm leading-relaxed">
          The {audit.type} review for <strong>{audit.client}</strong> ({audit.imu} · {audit.sgu}) completed on{" "}
          {audit.reviewDate} with an overall compliance score of <strong>{audit.compliance}%</strong>.
          {" "}{audit.anomalies > 0
            ? `${audit.anomalies} anomalies require remediation. Owner action expected within 14 days.`
            : `No anomalies detected — all baseline controls validated successfully.`}
        </p>
      </SectionCard>
    </div>
  );
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

type Ctl = { control: string; status: "Compliant" | "Non-Compliant"; detail: string };
function controlsFor(a: AuditRecord): Ctl[] {
  const baseline = a.type === "Contractual" ? CONTRACTUAL_CONTROLS : a.type === "LAR" ? LAR_ALLOWED_GROUPS : ENDPOINT_BASELINE;
  // Deterministic per audit id
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
