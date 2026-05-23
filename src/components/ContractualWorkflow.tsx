import { useMemo, useState } from "react";
import { Play, FileText, Upload, CheckCircle2, XCircle, ChevronDown, ChevronRight, Save, ClipboardList, Search, Calendar, Sparkles } from "lucide-react";
import { Modal, Spinner } from "@/components/Modal";
import { Button, Field, Select } from "@/components/form-bits";
import { Badge, PageHeader, SectionCard } from "@/components/ui-bits";
import {
  CONTRACTUAL_CONTROLS, IMU_OPTIONS, SGU_OPTIONS, FREQUENCY_MONTHS,
  type AuditRecord, type ContractualControl, type Frequency, type Submission,
} from "@/lib/mock-data";
import { auditStore, nextAuditId, useAudits } from "@/lib/audit-store";

type Mode = "picker" | "new-sow" | "artifact";

export function ContractualWorkflow() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("picker");

  const audits = useAudits();
  const contractualAudits = useMemo(
    () => audits.filter((a) => a.type === "Contractual" && a.controls && a.controls.length > 0),
    [audits],
  );

  function reset() { setMode("picker"); }
  function close() { setOpen(false); setTimeout(reset, 200); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractual Compliance Review"
        subtitle="Track adherence to SOW/MSA controls — submit artifacts on schedule, validate with AI"
        actions={
          <Button onClick={() => { setOpen(true); reset(); }} variant="primary">
            <Play className="h-4 w-4" /> Start New Review
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile label="SOWs Tracked" value={contractualAudits.length} icon={FileText} tint="primary" />
        <SummaryTile
          label="Controls Under Tracking"
          value={contractualAudits.reduce((s, a) => s + (a.controls?.length ?? 0), 0)}
          icon={ClipboardList} tint="secondary"
        />
        <SummaryTile
          label="Compliant Controls"
          value={contractualAudits.reduce((s, a) => s + (a.controls?.filter((c) => c.status === "Compliant").length ?? 0), 0)}
          icon={CheckCircle2} tint="success"
        />
      </div>

      <SectionCard title="How tracking works" subtitle="Two entry points keep your contracts adherent">
        <ol className="grid gap-3 sm:grid-cols-2 text-sm">
          <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" /> New SOW / MSA</div>
            <p className="mt-1.5 text-muted-foreground text-xs">
              Upload a fresh contract. AI extracts each control, captures its <em>language</em>, section number, and frequency,
              then schedules artifact submission dates.
            </p>
          </li>
          <li className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 font-semibold"><Upload className="h-4 w-4 text-secondary" /> Artifact Submission</div>
            <p className="mt-1.5 text-muted-foreground text-xs">
              Pick an existing SOW by Client + IMU + SGU. Expand controls, upload the periodic artifact, and AI validates
              it against the originally captured control language.
            </p>
          </li>
        </ol>
      </SectionCard>

      <Modal open={open} onClose={close}
        title={mode === "new-sow" ? "New SOW / MSA" : mode === "artifact" ? "Submit Artifact" : "Start New Review"}
        subtitle={mode === "picker" ? "Choose what you want to do" : undefined}
        size="xl">
        {mode === "picker" && <ModePicker onPick={setMode} hasExisting={contractualAudits.length > 0} />}
        {mode === "new-sow" && <NewSOWFlow onDone={close} />}
        {mode === "artifact" && <ArtifactSubmissionFlow audits={contractualAudits} onDone={close} />}
      </Modal>
    </div>
  );
}

/* ---------------- Mode picker ---------------- */

function ModePicker({ onPick, hasExisting }: { onPick: (m: Mode) => void; hasExisting: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button onClick={() => onPick("artifact")} disabled={!hasExisting}
        className="group rounded-2xl border border-border bg-gradient-to-br from-secondary/10 to-secondary/0 p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Upload className="h-5 w-5" /></div>
        <div className="mt-4 text-base font-semibold">Artifact Submission</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Submit periodic evidence for an existing SOW. AI validates it against the recorded control language.
        </p>
        {!hasExisting && <p className="mt-3 text-[11px] text-destructive">No SOWs available — register one first.</p>}
      </button>
      <button onClick={() => onPick("new-sow")}
        className="group rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-primary/0 p-5 text-left transition hover:shadow-md hover:-translate-y-0.5">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground"><FileText className="h-5 w-5" /></div>
        <div className="mt-4 text-base font-semibold">New SOW / MSA</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a freshly executed contract. AI extracts controls, frequencies, and section numbers and schedules submission dates.
        </p>
      </button>
    </div>
  );
}

/* ---------------- New SOW flow ---------------- */

type SOWState = {
  client: string; imu: string; sgu: string;
  documentTitle: string; contractStartDate: string;
  file: File | null;
};

function NewSOWFlow({ onDone }: { onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [state, setState] = useState<SOWState>({
    client: "", imu: "", sgu: "", documentTitle: "", contractStartDate: today, file: null,
  });
  const [phase, setPhase] = useState<"form" | "analyzing" | "results" | "saved">("form");
  const [extracted, setExtracted] = useState<ContractualControl[]>([]);
  const canAnalyze = state.client && state.imu && state.sgu && state.documentTitle && state.contractStartDate && state.file;

  function analyze() {
    setPhase("analyzing");
    setTimeout(() => {
      setExtracted(mockExtractControls(state.contractStartDate));
      setPhase("results");
    }, 1400);
  }

  function save() {
    const id = nextAuditId();
    const compliantCount = 0;
    const compliance = extracted.length ? Math.round((compliantCount / extracted.length) * 100) : 0;
    const rec: AuditRecord = {
      id,
      title: `Contractual – ${state.client}`,
      client: state.client,
      imu: state.imu, sgu: state.sgu,
      type: "Contractual",
      status: "In Review",
      anomalies: 0,
      compliance,
      reviewDate: new Date().toISOString().slice(0, 10),
      reportUrl: `/reports/${id}.pdf`,
      contractStartDate: state.contractStartDate,
      documentTitle: state.documentTitle,
      controls: extracted,
    };
    auditStore.add(rec);
    setPhase("saved");
  }

  if (phase === "form") {
    return (
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Client Name">
            <input value={state.client} onChange={(e) => setState({ ...state, client: e.target.value })}
              placeholder="e.g. Northwind Insurance"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
          <Field label="SOW / MSA Title">
            <input value={state.documentTitle} onChange={(e) => setState({ ...state, documentTitle: e.target.value })}
              placeholder="e.g. MSA 2026 – Domain Ops"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="IMU">
            <Select value={state.imu} onChange={(v) => setState({ ...state, imu: v })} options={[...IMU_OPTIONS]} />
          </Field>
          <Field label="SGU">
            <Select value={state.sgu} onChange={(v) => setState({ ...state, sgu: v })} options={[...SGU_OPTIONS]} />
          </Field>
          <Field label="Contract Start Date">
            <input type="date" value={state.contractStartDate}
              onChange={(e) => setState({ ...state, contractStartDate: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
        </div>
        <Field label="Upload Contract">
          <FileSlot accept=".pdf,.docx" file={state.file} onChange={(f) => setState({ ...state, file: f })} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onDone}>Cancel</Button>
          <Button onClick={analyze} disabled={!canAnalyze}><Play className="h-4 w-4" /> Analyze & Extract</Button>
        </div>
      </div>
    );
  }

  if (phase === "analyzing") return <AnalyzingState label="Extracting controls, sections, and frequencies from contract..." />;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--color-success)]">
          <Sparkles className="h-4 w-4" /> AI extracted {extracted.length} controls from {state.documentTitle}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Each control now has a section number, frequency, and captured contract language. Submission timelines are scheduled from {state.contractStartDate}.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-muted/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Control</th>
              <th className="px-3 py-2 text-left">Section</th>
              <th className="px-3 py-2 text-left">Frequency</th>
              <th className="px-3 py-2 text-left">First Submission Due</th>
            </tr>
          </thead>
          <tbody>
            {extracted.map((c) => (
              <tr key={c.name} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.sectionNumber}</td>
                <td className="px-3 py-2"><Badge variant="info">{c.frequency}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground">{c.nextDueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {phase === "saved" && (
        <div className="rounded-lg border border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10 px-4 py-3 text-sm text-[color:var(--color-success)] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Saved. Reminders will trigger 10 days before each submission date.
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Close</Button>
        {phase !== "saved"
          ? <Button variant="secondary" onClick={save}><Save className="h-4 w-4" /> Save SOW & Schedule</Button>
          : <Button onClick={onDone}>Done</Button>}
      </div>
    </div>
  );
}

/* ---------------- Artifact Submission flow ---------------- */

function ArtifactSubmissionFlow({ audits, onDone }: { audits: AuditRecord[]; onDone: () => void }) {
  const [client, setClient] = useState("");
  const [imu, setImu] = useState("");
  const [sgu, setSgu] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploadFor, setUploadFor] = useState<{ controlName: string; language: string } | null>(null);

  const clientOptions = useMemo(() => Array.from(new Set(audits.map((a) => a.client))), [audits]);

  const matchingSows = useMemo(() => {
    return audits.filter((a) =>
      (!client || a.client === client) &&
      (!imu || a.imu === imu) &&
      (!sgu || a.sgu === sgu)
    );
  }, [audits, client, imu, sgu]);

  const selected = audits.find((a) => a.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Client">
          <Select value={client} onChange={(v) => { setClient(v); setSelectedId(null); }} options={clientOptions} placeholder="All clients" />
        </Field>
        <Field label="IMU">
          <Select value={imu} onChange={(v) => { setImu(v); setSelectedId(null); }} options={[...IMU_OPTIONS]} placeholder="All IMUs" />
        </Field>
        <Field label="SGU">
          <Select value={sgu} onChange={(v) => { setSgu(v); setSelectedId(null); }} options={[...SGU_OPTIONS]} placeholder="All SGUs" />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Matching SOWs / MSAs ({matchingSows.length})</div>
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        {matchingSows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-xs text-muted-foreground">
            No SOWs match these filters
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {matchingSows.map((a) => (
              <button key={a.id} onClick={() => setSelectedId(a.id)}
                className={`w-full text-left rounded-lg border p-3 transition ${selectedId === a.id ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{a.documentTitle ?? a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.client} · {a.imu} · {a.sgu} · started {a.contractStartDate ?? a.reviewDate}</div>
                  </div>
                  <Badge variant="info">{a.controls?.length ?? 0} controls</Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && selected.controls && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Controls in {selected.documentTitle ?? selected.title}</div>
          <div className="overflow-hidden rounded-xl border border-border">
            {selected.controls.map((c) => (
              <ControlRow
                key={c.name}
                control={c}
                expanded={expanded === c.name}
                onToggle={() => setExpanded(expanded === c.name ? null : c.name)}
                onUpload={() => setUploadFor({ controlName: c.name, language: c.language })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onDone}>Close</Button>
      </div>

      {selected && uploadFor && (
        <UploadArtifactModal
          open={!!uploadFor}
          auditId={selected.id}
          controlName={uploadFor.controlName}
          language={uploadFor.language}
          onClose={() => setUploadFor(null)}
        />
      )}
    </div>
  );
}

function ControlRow({ control, expanded, onToggle, onUpload }: {
  control: ContractualControl; expanded: boolean; onToggle: () => void; onUpload: () => void;
}) {
  const dueDate = new Date(control.nextDueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
  const overdue = days < 0 && control.status !== "Compliant";
  return (
    <div className="border-t border-border first:border-0">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={onToggle} className="grid h-6 w-6 place-items-center rounded hover:bg-muted">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            {control.name}
            <span className="font-mono text-[11px] text-muted-foreground">{control.sectionNumber}</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <Badge variant="info">{control.frequency}</Badge>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {control.nextDueDate}</span>
            <span className={overdue ? "text-destructive font-semibold" : days <= 10 ? "text-[color:var(--color-warning)] font-semibold" : ""}>
              {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d remaining`}
            </span>
          </div>
        </div>
        <StatusPill status={overdue ? "Overdue" : control.status} />
        <Button variant="primary" onClick={onUpload}><Upload className="h-4 w-4" /> Upload</Button>
      </div>
      {expanded && (
        <div className="border-t border-border bg-muted/30 px-3 py-3 text-xs">
          <div className="mb-2">
            <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Captured Control Language</div>
            <p className="mt-1 italic">"{control.language}"</p>
          </div>
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Submission History ({control.submissions.length})
            </div>
            {control.submissions.length === 0 ? (
              <div className="mt-1 text-muted-foreground">No submissions yet</div>
            ) : (
              <ul className="mt-1 space-y-1">
                {control.submissions.slice().reverse().map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    {s.verdict === "Compliant"
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--color-success)]" />
                      : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                    <span className="font-mono text-[11px]">{s.date}</span>
                    <span className="truncate">{s.fileName}</span>
                    <span className="ml-auto text-muted-foreground">{s.notes}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UploadArtifactModal({ open, auditId, controlName, language, onClose }: {
  open: boolean; auditId: string; controlName: string; language: string; onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<"form" | "analyzing" | "result">("form");
  const [verdict, setVerdict] = useState<{ ok: boolean; notes: string } | null>(null);

  function analyze() {
    if (!file) return;
    setPhase("analyzing");
    setTimeout(() => {
      const result = mockArtifactValidation(file.name, language);
      setVerdict(result);
      setPhase("result");
    }, 1300);
  }

  function commit() {
    if (!verdict || !file) return;
    const today = new Date().toISOString().slice(0, 10);
    auditStore.updateControl(auditId, controlName, (c) => {
      const sub: Submission = {
        id: `S-${Date.now()}`,
        date: today,
        fileName: file.name,
        verdict: verdict.ok ? "Compliant" : "Non-Compliant",
        notes: verdict.notes,
      };
      const months = FREQUENCY_MONTHS[c.frequency];
      const next = new Date(today);
      next.setMonth(next.getMonth() + months);
      return {
        ...c,
        status: verdict.ok ? "Compliant" : "Non-Compliant",
        lastSubmissionDate: today,
        nextDueDate: verdict.ok ? next.toISOString().slice(0, 10) : c.nextDueDate,
        submissions: [...c.submissions, sub],
      };
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Submit Artifact — ${controlName}`}
      subtitle="AI validates the artifact against the captured contract language" size="lg">
      {phase === "form" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div className="font-semibold uppercase tracking-wider text-[10px] text-muted-foreground">Control Language</div>
            <p className="mt-1 italic">"{language}"</p>
          </div>
          <Field label="Upload Artifact">
            <FileSlot accept=".pdf,.docx,.xlsx,.csv,.png,.jpg" file={file} onChange={setFile} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={analyze} disabled={!file}><Play className="h-4 w-4" /> Validate with AI</Button>
          </div>
        </div>
      )}
      {phase === "analyzing" && <AnalyzingState label="Comparing artifact contents against control language..." />}
      {phase === "result" && verdict && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 ${verdict.ok ? "border-[color:var(--color-success)]/30 bg-[color:var(--color-success)]/10" : "border-destructive/30 bg-destructive/10"}`}>
            <div className={`flex items-center gap-2 text-sm font-semibold ${verdict.ok ? "text-[color:var(--color-success)]" : "text-destructive"}`}>
              {verdict.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {verdict.ok ? "Compliant" : "Non-Compliant"}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{verdict.notes}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setPhase("form"); setVerdict(null); }}>Re-upload</Button>
            <Button variant="secondary" onClick={commit}><Save className="h-4 w-4" /> Record Submission</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- shared bits ---------------- */

function AnalyzingState({ label }: { label: string }) {
  return (
    <div className="py-16 grid place-items-center text-center">
      <Spinner label={label} />
      <div className="mt-6 w-72 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/2 bg-primary animate-pulse" />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ContractualControl["status"] }) {
  const map: Record<ContractualControl["status"], { label: string; cls: string }> = {
    Compliant: { label: "Compliant", cls: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]" },
    Pending: { label: "Pending", cls: "bg-muted text-muted-foreground" },
    "Non-Compliant": { label: "Non-Compliant", cls: "bg-destructive/15 text-destructive" },
    Overdue: { label: "Overdue", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>{m.label}</span>;
}

function FileSlot({ accept, file, onChange }: { accept: string; file: File | null; onChange: (f: File | null) => void }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 p-5 text-center">
      {file ? (
        <div className="flex items-center justify-center gap-3 text-sm">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
          <button onClick={() => onChange(null)} className="text-xs text-destructive hover:underline">Remove</button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Upload className="h-5 w-5" /></div>
          <div className="text-sm font-medium">Drop file or click to browse</div>
          <div className="text-xs text-muted-foreground">Accepted: {accept}</div>
          <input type="file" accept={accept} className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, tint }: {
  label: string; value: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: "primary" | "secondary" | "success";
}) {
  const map = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]",
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
      <div className={`grid h-10 w-10 place-items-center rounded-lg ${map[tint]}`}><Icon className="h-5 w-5" /></div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

/* ---------------- mock AI / extraction ---------------- */

const FREQUENCY_ROTATION: Frequency[] = ["Quarterly", "Yearly", "Yearly", "Yearly", "Yearly", "Monthly", "Monthly", "Quarterly"];

const CONTROL_LANGUAGE: Record<string, string> = {
  "Disaster Recovery": "Vendor shall maintain a documented DR plan with RTO ≤ 4 hours and RPO ≤ 1 hour, tested quarterly with results delivered to Client.",
  "VAPT": "Vendor shall conduct an annual third-party Vulnerability Assessment & Penetration Test and remediate all critical/high findings within 30 days.",
  "PCIDSS": "Vendor shall maintain PCI-DSS Level 1 compliance and provide an annual Attestation of Compliance (AOC).",
  "HIPPA": "Vendor shall handle all PHI in accordance with HIPAA Privacy & Security Rules and provide an annual compliance attestation.",
  "SOC Type2": "Vendor shall furnish a SOC 2 Type II report covering Security, Availability, and Confidentiality on an annual basis.",
  "VPN": "Vendor personnel shall connect to Client networks only over an approved IPSec VPN with MFA; access logs retained 12 months.",
  "MPLS": "Vendor shall maintain redundant MPLS circuits with ≥ 99.9% uptime; monthly availability reports delivered to Client.",
  "Monthly Reviews": "Vendor shall participate in a monthly governance review with operational KPIs and incident summaries.",
};

function mockExtractControls(contractStart: string): ContractualControl[] {
  const start = new Date(contractStart);
  return CONTRACTUAL_CONTROLS.map((name, i) => {
    const freq = FREQUENCY_ROTATION[i % FREQUENCY_ROTATION.length];
    const months = FREQUENCY_MONTHS[freq];
    const due = new Date(start);
    due.setMonth(due.getMonth() + months);
    return {
      name,
      sectionNumber: `§${4 + Math.floor(i / 2)}.${(i % 4) + 1}`,
      frequency: freq,
      language: CONTROL_LANGUAGE[name] ?? `${name} shall be performed per agreed cadence with evidence retained for audit.`,
      status: "Pending",
      nextDueDate: due.toISOString().slice(0, 10),
      submissions: [],
    };
  });
}

function mockArtifactValidation(fileName: string, language: string) {
  // Mock: extract a couple of "keywords" from language and check the artifact "addresses" them
  const keywords = language
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 5 && !["vendor", "client", "shall", "annual", "provide"].includes(w))
    .slice(0, 4);
  const fn = fileName.toLowerCase();
  const matched = keywords.filter((k) => fn.includes(k.slice(0, 4))).length;
  const ok = matched >= 1 || /report|attestation|aoc|soc|audit|review|test|plan/.test(fn);
  return {
    ok,
    notes: ok
      ? `AI matched the artifact to ${matched || 1}+ key obligation(s) in the captured control language (e.g. ${keywords.slice(0, 2).join(", ") || "evidence keywords"}).`
      : `AI could not find evidence that the artifact addresses the captured control language. Expected keywords: ${keywords.slice(0, 3).join(", ")}.`,
  };
}
