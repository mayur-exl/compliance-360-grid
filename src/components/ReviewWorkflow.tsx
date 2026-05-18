import { useState } from "react";
import { Download, Play, CheckCircle2, XCircle, FileText, Save } from "lucide-react";
import { Modal, Spinner } from "@/components/Modal";
import { ReviewFormFields, Button } from "@/components/form-bits";
import { Badge, PageHeader, SectionCard } from "@/components/ui-bits";
import { CONTRACTUAL_CONTROLS, LAR_ALLOWED_GROUPS, ENDPOINT_BASELINE, type AuditType } from "@/lib/mock-data";
import { auditStore, nextAuditId } from "@/lib/audit-store";

type Result = { control: string; status: "Compliant" | "Missing" | "Non-Compliant" | "Anomaly"; detail?: string };

interface Cfg {
  type: AuditType;
  title: string;
  accept: string;
  baseline: string[];
  generate: (state: State) => Result[];
  extraField?: (state: State, setState: (s: State) => void) => React.ReactNode;
}

type State = {
  client: string; imu: string; sgu: string; file: File | null;
  allowed?: string;
};

export function ReviewWorkflow({ cfg }: { cfg: Cfg }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ client: "", imu: "", sgu: "", file: null, allowed: cfg.type === "LAR" ? LAR_ALLOWED_GROUPS.join(", ") : "" });
  const [phase, setPhase] = useState<"form" | "analyzing" | "results" | "saved">("form");
  const [results, setResults] = useState<Result[]>([]);

  function reset() {
    setState({ client: "", imu: "", sgu: "", file: null, allowed: cfg.type === "LAR" ? LAR_ALLOWED_GROUPS.join(", ") : "" });
    setPhase("form");
    setResults([]);
  }

  function analyze() {
    setPhase("analyzing");
    setTimeout(() => {
      setResults(cfg.generate(state));
      setPhase("results");
    }, 1400);
  }

  const compliant = results.filter((r) => r.status === "Compliant").length;
  const issues = results.length - compliant;
  const score = results.length ? Math.round((compliant / results.length) * 100) : 0;
  const canAnalyze = state.client && state.imu && state.sgu && state.file;

  return (
    <div className="space-y-6">
      <PageHeader
        title={cfg.title}
        subtitle={subtitleFor(cfg.type)}
        actions={
          <Button onClick={() => setOpen(true)} variant="primary">
            <Play className="h-4 w-4" /> Start New Review
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatBox label="Baseline Controls" value={cfg.baseline.length} tint="primary" />
        <StatBox label="Avg Compliance" value="88%" tint="success" />
        <StatBox label="Reviews this month" value="14" tint="secondary" />
      </div>

      <SectionCard title="Baseline / Allowed List" subtitle="Controls validated during this review">
        <div className="flex flex-wrap gap-2">
          {cfg.baseline.map((c) => (
            <Badge key={c} variant="info">{c}</Badge>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="How it works">
        <ol className="grid gap-3 sm:grid-cols-4 text-sm">
          {["Upload file", "Auto-extract", "Validate vs baseline", "Save to DB"].map((s, i) => (
            <li key={s} className="flex items-start gap-3">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</div>
              <div>{s}</div>
            </li>
          ))}
        </ol>
      </SectionCard>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }}
        title={cfg.title}
        subtitle="Upload artefact and validate against baseline"
        size="xl">
        {phase === "form" && (
          <>
            <ReviewFormFields state={state} setState={setState} accept={cfg.accept} extra={cfg.extraField?.(state, setState)} />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button onClick={analyze} disabled={!canAnalyze}>
                <Play className="h-4 w-4" /> Analyze
              </Button>
            </div>
          </>
        )}

        {phase === "analyzing" && (
          <div className="py-16 grid place-items-center text-center">
            <Spinner label="Extracting controls and validating against baseline..." />
            <div className="mt-6 w-72 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/2 bg-primary animate-pulse" />
            </div>
          </div>
        )}

        {(phase === "results" || phase === "saved") && (
          <ResultsView
            state={state} results={results} score={score} issues={issues}
            cfg={cfg} saved={phase === "saved"}
            onSave={() => setPhase("saved")}
            onClose={() => { setOpen(false); reset(); }}
          />
        )}
      </Modal>
    </div>
  );
}

function ResultsView({
  state, results, score, issues, cfg, saved, onSave, onClose,
}: {
  state: State; results: Result[]; score: number; issues: number;
  cfg: Cfg; saved: boolean; onSave: () => void; onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <ResultStat label="Client" value={state.client} />
        <ResultStat label="Compliance" value={`${score}%`} accent={score >= 80 ? "success" : "warning"} />
        <ResultStat label="Issues" value={String(issues)} accent={issues ? "danger" : "success"} />
        <ResultStat label="Controls" value={String(results.length)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Control</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider text-muted-foreground">Detail</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{r.control}</td>
                <td className="px-4 py-2.5">
                  {r.status === "Compliant"
                    ? <span className="inline-flex items-center gap-1.5 text-[color:var(--color-success)]"><CheckCircle2 className="h-4 w-4" /> {r.status}</span>
                    : <span className="inline-flex items-center gap-1.5 text-destructive"><XCircle className="h-4 w-4" /> {r.status}</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.detail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saved && (
        <div className="rounded-lg border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 px-4 py-3 text-sm text-[color:var(--color-success)] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Saved to {cfg.type} DB. Audit record created.
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline"><Download className="h-4 w-4" /> Export PDF</Button>
        <Button variant="outline"><FileText className="h-4 w-4" /> Export Excel</Button>
        {!saved ? (
          <Button variant="secondary" onClick={onSave}><Save className="h-4 w-4" /> Approve & Save</Button>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </div>
    </div>
  );
}

function ResultStat({ label, value, accent }: { label: string; value: string; accent?: "success" | "warning" | "danger" }) {
  const cl = accent === "success" ? "text-[color:var(--color-success)]" : accent === "warning" ? "text-[color:var(--color-warning)]" : accent === "danger" ? "text-destructive" : "";
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold mt-0.5 truncate ${cl}`}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, tint }: { label: string; value: string | number; tint: "primary" | "secondary" | "success" }) {
  const map = { primary: "from-primary/10 to-primary/0", secondary: "from-secondary/10 to-secondary/0", success: "from-[color:var(--color-success)]/10 to-transparent" };
  return (
    <div className={`rounded-xl border border-border/60 bg-gradient-to-br ${map[tint]} bg-card p-4`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function subtitleFor(t: AuditType) {
  return t === "Contractual"
    ? "Extract and track contractual compliance from MSA/SOW"
    : t === "LAR" ? "Review user access & privileges against allowed groups"
    : "Validate endpoint security against baseline configuration";
}

// ---------------- exported configs ----------------

export const CONTRACTUAL_CFG: Cfg = {
  type: "Contractual",
  title: "Contractual Compliance Review",
  accept: ".pdf,.docx",
  baseline: CONTRACTUAL_CONTROLS,
  generate: () =>
    CONTRACTUAL_CONTROLS.map((c, i) => ({
      control: c,
      status: i % 4 === 3 ? "Missing" : "Compliant",
      detail: i % 4 === 3 ? "Clause not found in document" : `Section §${4 + i}.${i + 1} validated`,
    })),
};

export const LAR_CFG: Cfg = {
  type: "LAR",
  title: "Logical Access Review",
  accept: ".csv,.xlsx",
  baseline: LAR_ALLOWED_GROUPS,
  extraField: (state, setState) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Allowed Groups (comma-separated)</span>
      <textarea
        value={state.allowed ?? ""}
        onChange={(e) => setState({ ...state, allowed: e.target.value })}
        rows={2}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  ),
  generate: (state) => {
    const allowed = (state.allowed ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const found = [...allowed, "admin_global", "contractor_temp"];
    return found.map((g) => ({
      control: g,
      status: allowed.includes(g) ? "Compliant" : "Anomaly",
      detail: allowed.includes(g) ? "Within allowed list" : "Group not in allowed list — outlier",
    }));
  },
};

export const ENDPOINT_CFG: Cfg = {
  type: "Endpoint",
  title: "Endpoint Review",
  accept: ".csv,.xlsx",
  baseline: ENDPOINT_BASELINE,
  generate: () =>
    ENDPOINT_BASELINE.map((c, i) => ({
      control: c,
      status: i === 1 || i === 3 ? "Non-Compliant" : "Compliant",
      detail: i === 1 ? "4 endpoints unencrypted" : i === 3 ? "12 endpoints > 90 days behind" : "All endpoints passing",
    })),
};
