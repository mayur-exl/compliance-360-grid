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
import { clientId } from "@/lib/clients";

type Mode = "new-sow" | "artifact";

export function ContractualWorkflow() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("new-sow");

  const audits = useAudits();
  const contractualAudits = useMemo(
    () => audits.filter((a) => a.type === "Contractual" && a.controls && a.controls.length > 0),
    [audits],
  );

  function close() { setOpen(false); }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contractual Compliance Review"
        subtitle="Track adherence to SOW/MSA controls — submit artifacts on schedule, validate with AI"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => { setMode("new-sow"); setOpen(true); }} variant="primary">
              <Play className="h-4 w-4" /> Start New Review
            </Button>
            <Button onClick={() => { setMode("artifact"); setOpen(true); }} variant="secondary" disabled={contractualAudits.length === 0}>
              <Upload className="h-4 w-4" /> Artifacts Submission
            </Button>
          </div>
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
        title={mode === "new-sow" ? "New SOW / MSA" : "Submit Artifact"}
        size="xl">
        {mode === "new-sow" && <NewSOWFlow onDone={close} />}
        {mode === "artifact" && <ArtifactSubmissionFlow audits={contractualAudits} onDone={close} />}
      </Modal>
    </div>
  );
}

/* ---------------- New SOW flow ---------------- */

type SOWState = {
  client: string; imu: string; sgu: string;
  documentTitle: string; contractStartDate: string;
  file: File | null;
  notApplicableControls: string[];
};

function NewSOWFlow({ onDone }: { onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [state, setState] = useState<SOWState>({
    client: "", imu: "", sgu: "", documentTitle: "", contractStartDate: today, file: null,
    notApplicableControls: [],
  });
  const [phase, setPhase] = useState<"form" | "analyzing" | "results" | "saved">("form");
  const [extracted, setExtracted] = useState<ContractualControl[]>([]);
  const canAnalyze = state.imu && state.sgu && state.file;
  const audits = useAudits();

  function inferDocumentTitle(fileName: string) {
    return fileName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  }

  function inferClientName(fileName: string) {
    const title = inferDocumentTitle(fileName);
    const customerMatch = title.match(/\b(?:customer|client)[\s:_-]+([^\s_-]+(?:[\s_-][^\s_-]+)*?)(?=\s+(?:msa|sow|agreement|contract|deal|report|invoice)\b|$)/i);
    if (customerMatch?.[1]) return customerMatch[1].trim();

    const genericMatch = title.match(/^(.*?)(?:\s+(?:MSA|SOW|Agreement|Contract|Agreement)\b|[-–—]|_)/i);
    if (genericMatch?.[1]) return genericMatch[1].trim();

    const words = title.split(/\s+/).filter(Boolean);
    return words.length >= 2 ? `${words[0]} ${words[1]}` : title;
  }

  function inferContractStartDate(fileName: string) {
    const text = inferDocumentTitle(fileName);
    const isoMatch = text.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const mdYMatch = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
    if (mdYMatch) {
      let [, m, d, y] = mdYMatch;
      if (y.length === 2) y = `20${y}`;
      m = m.padStart(2, "0");
      d = d.padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    const monthMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[\s.-]*(\d{1,2})(?:st|nd|rd|th)?,?[\s,-]*(\d{4})\b/i);
    if (monthMatch) {
      const monthNames: Record<string, string> = {
        January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
        July: "07", August: "08", September: "09", October: "10", November: "11", December: "12",
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", Jun: "06", Jul: "07", Aug: "08",
        Sep: "09", Oct: "10", Nov: "11", Dec: "12",
      };
      const month = monthNames[monthMatch[1]];
      const day = monthMatch[2].padStart(2, "0");
      return `${monthMatch[3]}-${month}-${day}`;
    }

    return today;
  }

  function normalizeDate(value: string) {
    const normalized = value.trim().replace(/\s+/g, " ");
    const isoMatch = normalized.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    const mdYMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/);
    if (mdYMatch) {
      let [, m, d, y] = mdYMatch;
      if (y.length === 2) y = `20${y}`;
      m = m.padStart(2, "0");
      d = d.padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    return today;
  }

  function parseNotApplicableControls(text: string) {
    const normalized = text
      .toLowerCase()
      .replace(/\r/g, " ")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const patterns = [
      "not applicable",
      "n/a",
      "does not apply",
      "doesn't apply",
      "is not applicable",
      "is n/a",
      "not required",
      "excluded",
      "without requirement",
      "no requirement",
      "not within scope",
      "not subject to",
      "not in scope",
    ];

    const results: string[] = [];
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const marker = patterns.map(escapeRegExp).join("|");

    for (const name of CONTRACTUAL_CONTROLS) {
      const controlPattern = escapeRegExp(name.toLowerCase()).replace(/\s+/g, "\\s+");
      const regex1 = new RegExp(`\\b${controlPattern}\\b[\\s\\S]{0,240}?(?:${marker})`, "i");
      const regex2 = new RegExp(`(?:${marker})[\\s\\S]{0,240}?\\b${controlPattern}\\b`, "i");
      if (regex1.test(normalized) || regex2.test(normalized)) {
        results.push(name);
      }
    }

    return Array.from(new Set(results));
  }

  async function extractContractMetadata(file: File) {
    const fallback = {
      client: inferClientName(file.name),
      documentTitle: inferDocumentTitle(file.name),
      contractStartDate: inferContractStartDate(file.name),
      notApplicableControls: [] as string[],
    };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);
      const text = decoded
        .replace(/[\x00-\x1F\x7F-\x9F]+/g, " ")
        .replace(/\r/g, " ")
        .replace(/\n+/g, " ")
        .trim();

      const clientMatch = text.match(/\b(?:Customer|Client)\s*(?:Name)?\s*[:\-–]\s*([A-Z][A-Za-z0-9&\.,'’\-\s]{2,}?)\b/i)
        || text.match(/\bCustomer\s*[:\-–]\s*([A-Z][A-Za-z0-9&\.,'’\-\s]{2,}?)\b/i)
        || text.match(/\bClient\s*[:\-–]\s*([A-Z][A-Za-z0-9&\.,'’\-\s]{2,}?)\b/i);

      const effectiveDateMatch = text.match(/\bEffective\s*(?:Date)?\s*[:\-–]\s*([A-Za-z0-9\s\./,-]{6,40})\b/i)
        || text.match(/\bEffective\s*[:\-–]\s*([A-Za-z0-9\s\./,-]{6,40})\b/i);

      const client = clientMatch?.[1]?.trim() || fallback.client;
      const contractStartDate = effectiveDateMatch?.[1]
        ? normalizeDate(effectiveDateMatch[1])
        : fallback.contractStartDate;
      const notApplicableControls = parseNotApplicableControls(text);

      return {
        client,
        documentTitle: fallback.documentTitle,
        contractStartDate,
        notApplicableControls,
      };
    } catch {
      return fallback;
    }
  }

  function setFile(file: File | null) {
    setState((prev) => ({
      ...prev,
      file,
    }));
  }

  async function analyze() {
    if (!state.file) return;
    setPhase("analyzing");

    const parsed = await extractContractMetadata(state.file);
    setState((prev) => ({
      ...prev,
      client: prev.client || parsed.client,
      documentTitle: prev.documentTitle || parsed.documentTitle,
      contractStartDate: parsed.contractStartDate || prev.contractStartDate,
      notApplicableControls: parsed.notApplicableControls || [],
    }));

    setTimeout(() => {
      setExtracted(mockExtractControls(parsed.contractStartDate || state.contractStartDate, parsed.notApplicableControls || []));
      setPhase("results");
    }, 1400);
  }

  function save() {
    const compliantCount = 0;
    const compliance = extracted.length ? Math.round((compliantCount / extracted.length) * 100) : 0;

    // If a contractual audit already exists for this client+IMU+SGU, merge the new SOW into it
    const existing = audits.find((a) =>
      a.type === "Contractual" && clientId(a.client, a.imu, a.sgu) === clientId(state.client, state.imu, state.sgu)
    );

    if (existing) {
      const existingControls = existing.controls ?? [];
      const existingByName = new Map(existingControls.map((c) => [c.name, c]));
      const extractedNames = new Set(extracted.map((c) => c.name));

      const mergedControls = extracted.map((c) => {
        const existingControl = existingByName.get(c.name);
        return {
          ...c,
          status: existingControl?.status === "Compliant" ? "Compliant" : c.status,
          submissions: existingControl?.submissions.length ? existingControl.submissions : c.submissions,
        };
      });

      const retainedOldControls = existingControls.filter((c) =>
        !extractedNames.has(c.name) && !state.notApplicableControls.includes(c.name),
      );

      const finalControls = [...mergedControls, ...retainedOldControls];

      const mergedDocuments = existing.documents && existing.documents.length > 0
        ? existing.documents.slice()
        : (existing.documentUrl ? [{ title: existing.documentTitle || "SOW", url: existing.documentUrl, uploadedAt: existing.contractStartDate || existing.reviewDate || new Date().toISOString().slice(0, 10) }] : []);
      if (state.file) {
        const docEntry = {
          title: state.documentTitle || state.file.name,
          url: `/documents/${existing.id}-${encodeURIComponent(state.file.name)}`,
          uploadedAt: new Date().toISOString().slice(0, 10),
        };
        mergedDocuments.push(docEntry);
      }

      const newDocumentTitle = existing.documentTitle || state.documentTitle || (mergedDocuments[0]?.title ?? "");

      auditStore.update(existing.id, {
        controls: finalControls,
        documents: mergedDocuments,
        documentTitle: newDocumentTitle,
        documentUrl: mergedDocuments[0]?.url ?? existing.documentUrl,
        contractStartDate: existing.contractStartDate || state.contractStartDate,
      });

      setPhase("saved");
      return;
    }

    const id = nextAuditId();
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
      documentUrl: state.file ? `/documents/${id}-${encodeURIComponent(state.file.name)}` : undefined,
      documents: state.file ? [{ title: state.documentTitle || (state.file && state.file.name) || "SOW", url: `/documents/${id}-${encodeURIComponent(state.file.name)}`, uploadedAt: new Date().toISOString().slice(0, 10) }] : [],
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
          <Field label="IMU *">
            <Select value={state.imu} onChange={(v) => setState({ ...state, imu: v })} options={[...IMU_OPTIONS]} />
          </Field>
          <Field label="SGU *">
            <Select value={state.sgu} onChange={(v) => setState({ ...state, sgu: v })} options={[...SGU_OPTIONS]} />
          </Field>
          <Field label="Contract Start Date">
            <input type="date" value={state.contractStartDate}
              onChange={(e) => setState({ ...state, contractStartDate: e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </Field>
        </div>
        <Field label="Upload Contract">
          <FileSlot accept=".pdf,.docx" file={state.file} onChange={setFile} />
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
          <Sparkles className="h-4 w-4" /> AI extracted {extracted.length} controls from {state.documentTitle || "the uploaded file"}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Each control now has a section number, frequency, and captured contract language. Submission timelines are scheduled from {state.contractStartDate}.
        </p>
      </div>

      {state.notApplicableControls.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <div className="font-semibold">Detected as N/A from uploaded document:</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {state.notApplicableControls.map((name) => (
              <Badge key={name} variant="default">{name}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Client Name">
          <input value={state.client} onChange={(e) => setState({ ...state, client: e.target.value })}
            placeholder="Optional client name"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </Field>
        <Field label="SOW / MSA Title">
          <input value={state.documentTitle} onChange={(e) => setState({ ...state, documentTitle: e.target.value })}
            placeholder="Optional title, auto-filled from file"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </Field>
        <Field label="Contract Start Date">
          <input type="date" value={state.contractStartDate} onChange={(e) => setState({ ...state, contractStartDate: e.target.value })}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </Field>
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
  const dueDate = control.nextDueDate ? new Date(control.nextDueDate) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = dueDate ? Math.round((dueDate.getTime() - today.getTime()) / 86400000) : NaN;
  const overdue = dueDate ? days < 0 && control.status !== "Compliant" && control.status !== "Not Applicable" : false;
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
            <Badge variant={control.frequency === "N/A" ? "default" : "info"}>{control.frequency}</Badge>
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Due {control.nextDueDate || "N/A"}</span>
            {dueDate && (
              <span className={overdue ? "text-destructive font-semibold" : days <= 10 ? "text-[color:var(--color-warning)] font-semibold" : ""}>
                {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d remaining`}
              </span>
            )}
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

export function UploadArtifactModal({ open, auditId, controlName, language, onClose }: {
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
      const months = c.frequency === "N/A" ? 0 : FREQUENCY_MONTHS[c.frequency];
      const next = new Date(today);
      if (c.frequency !== "N/A") {
        next.setMonth(next.getMonth() + months);
      }
      return {
        ...c,
        status: verdict.ok ? "Compliant" : "Non-Compliant",
        lastSubmissionDate: today,
        nextDueDate: verdict.ok ? (c.frequency === "N/A" ? c.nextDueDate : next.toISOString().slice(0, 10)) : c.nextDueDate,
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
    "Not Applicable": { label: "Not Applicable", cls: "bg-muted/15 text-muted-foreground" },
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

function mockExtractControls(contractStart: string, notApplicableControls: string[] = []): ContractualControl[] {
  const start = new Date(contractStart);
  return CONTRACTUAL_CONTROLS.map((name, originalIndex) => {
    const isNotApplicable = notApplicableControls.includes(name);
    const freq: Frequency = isNotApplicable ? "N/A" : FREQUENCY_ROTATION[originalIndex % FREQUENCY_ROTATION.length];
    const due = new Date(start);
    if (freq !== "N/A") {
      due.setMonth(due.getMonth() + FREQUENCY_MONTHS[freq]);
    }
    return {
      name,
      sectionNumber: `§${4 + Math.floor(originalIndex / 2)}.${(originalIndex % 4) + 1}`,
      frequency: freq,
      language: CONTROL_LANGUAGE[name] ?? `${name} shall be performed per agreed cadence with evidence retained for audit.`,
      status: isNotApplicable ? "Not Applicable" : "Pending",
      nextDueDate: isNotApplicable ? "" : due.toISOString().slice(0, 10),
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
