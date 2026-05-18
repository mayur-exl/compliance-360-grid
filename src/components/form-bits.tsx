import { useState } from "react";
import { Upload, FileText } from "lucide-react";
import { IMU_OPTIONS, SGU_OPTIONS } from "@/lib/mock-data";

export function ReviewFormFields({
  state, setState, accept, extra,
}: {
  state: { client: string; imu: string; sgu: string; file: File | null };
  setState: (s: typeof state) => void;
  accept: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Client Name">
          <input value={state.client} onChange={(e) => setState({ ...state, client: e.target.value })}
            placeholder="e.g. Northwind Insurance"
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="IMU">
            <Select value={state.imu} onChange={(v) => setState({ ...state, imu: v })} options={[...IMU_OPTIONS]} />
          </Field>
          <Field label="SGU">
            <Select value={state.sgu} onChange={(v) => setState({ ...state, sgu: v })} options={[...SGU_OPTIONS]} />
          </Field>
        </div>
      </div>
      <Field label="Upload File">
        <FileDrop file={state.file} onChange={(f) => setState({ ...state, file: f })} accept={accept} />
      </Field>
      {extra}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Select({ value, onChange, options, placeholder = "Select..." }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30">
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function FileDrop({ file, onChange, accept }: { file: File | null; onChange: (f: File | null) => void; accept: string }) {
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onChange(f); }}
      className={`rounded-lg border-2 border-dashed p-6 text-center transition ${drag ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
      {file ? (
        <div className="flex items-center justify-center gap-3 text-sm">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-medium">{file.name}</span>
          <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-destructive hover:underline">Remove</button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Upload className="h-5 w-5" /></div>
          <div className="text-sm font-medium">Drop file or click to browse</div>
          <div className="text-xs text-muted-foreground">Accepted: {accept}</div>
          <input type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}

export function Button({ children, variant = "primary", onClick, disabled, type = "button" }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "outline";
  onClick?: () => void; disabled?: boolean; type?: "button" | "submit";
}) {
  const map = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm",
    ghost: "hover:bg-muted",
    outline: "border border-border bg-card hover:bg-muted",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${map[variant]}`}>
      {children}
    </button>
  );
}
