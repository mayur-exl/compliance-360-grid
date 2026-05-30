import { useSyncExternalStore } from "react";
import { MOCK_AUDITS, type AuditRecord, type ContractualControl, type ControlsValidationStatus } from "@/lib/mock-data";

const KEY = "c360.audits.v3";

function load(): AuditRecord[] {
  if (typeof window === "undefined") return MOCK_AUDITS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return MOCK_AUDITS;
    const parsed = JSON.parse(raw) as AuditRecord[];
    return Array.isArray(parsed) && parsed.length ? parsed : MOCK_AUDITS;
  } catch {
    return MOCK_AUDITS;
  }
}

let audits: AuditRecord[] = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(KEY, JSON.stringify(audits)); } catch { /* ignore */ }
  }
  listeners.forEach((l) => l());
}

// NEW: Helper to compute controls validation status
export function getControlsValidationStatus(audit: AuditRecord): ControlsValidationStatus {
  if (audit.type !== "Contractual" || !audit.controls || audit.controls.length === 0) {
    return "Compliant"; // fallback for non-contractual
  }

  const controls = audit.controls;
  const pending = controls.filter((c) => c.status === "Pending").length;
  const compliant = controls.filter((c) => c.status === "Compliant").length;
  const nonCompliant = controls.filter((c) => c.status === "Non-Compliant").length;

  // If all controls are pending (no artifacts uploaded yet)
  if (pending === controls.length) {
    return "Artifacts Pending";
  }

  // If no submissions yet, but some have been analyzed
  if (pending > 0 && compliant === 0 && nonCompliant === 0) {
    return "Artifacts Pending";
  }

  // If we have a mix of compliant and non-compliant
  if (compliant > 0 && nonCompliant > 0) {
    return "Mixed";
  }

  // If all are compliant
  if (compliant === controls.length) {
    return "Compliant";
  }

  // If all are non-compliant
  if (nonCompliant === controls.length) {
    return "Non-Compliant";
  }

  // Default to mixed if we have both compliant and pending
  if (compliant > 0 && pending > 0) {
    return "Mixed";
  }

  // Default fallback
  return "Artifacts Pending";
}

export const auditStore = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  getSnapshot() { return audits; },
  getServerSnapshot() { return MOCK_AUDITS; },
  add(rec: AuditRecord) {
    audits = [rec, ...audits];
    persist();
  },
  update(id: string, patch: Partial<AuditRecord>) {
    audits = audits.map((a) => (a.id === id ? { ...a, ...patch } : a));
    persist();
  },
  updateControl(auditId: string, controlName: string, updater: (c: ContractualControl) => ContractualControl) {
    audits = audits.map((a) => {
      if (a.id !== auditId || !a.controls) return a;
      const controls = a.controls.map((c) => (c.name === controlName ? updater(c) : c));
      const nonCompliant = controls.filter((c) => c.status === "Non-Compliant" || c.status === "Overdue").length;
      const compliant = controls.filter((c) => c.status === "Compliant").length;
      const compliance = controls.length ? Math.round((compliant / controls.length) * 100) : a.compliance;
      
      // NEW: Compute validation status
      const controlsValidationStatus = getControlsValidationStatus({ ...a, controls });
      
      return { ...a, controls, anomalies: nonCompliant, compliance, controlsValidationStatus };
    });
    persist();
  },
  reset() {
    audits = MOCK_AUDITS;
    persist();
  },
};

export function useAudits(): AuditRecord[] {
  return useSyncExternalStore(auditStore.subscribe, auditStore.getSnapshot, auditStore.getServerSnapshot);
}

export function nextAuditId(): string {
  const nums = audits
    .map((a) => Number(a.id.replace(/[^\d]/g, "")))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `AUD-${max + 1}`;
}

export interface Reminder {
  auditId: string;
  client: string;
  documentTitle?: string;
  control: string;
  sectionNumber: string;
  frequency: string;
  dueDate: string;
  daysUntilDue: number; // negative = overdue
  kind: "upcoming" | "overdue";
}

export function getReminders(list: AuditRecord[], windowDays = 10): Reminder[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: Reminder[] = [];
  list.forEach((a) => {
    if (a.type !== "Contractual" || !a.controls) return;
    a.controls.forEach((c) => {
      if (c.status === "Compliant" && !c.nextDueDate) return;
      const due = new Date(c.nextDueDate);
      due.setHours(0, 0, 0, 0);
      const days = Math.round((due.getTime() - today.getTime()) / 86400000);
      if (days < 0 && c.status !== "Compliant") {
        out.push({
          auditId: a.id, client: a.client, documentTitle: a.documentTitle,
          control: c.name, sectionNumber: c.sectionNumber, frequency: c.frequency,
          dueDate: c.nextDueDate, daysUntilDue: days, kind: "overdue",
        });
      } else if (days >= 0 && days <= windowDays) {
        out.push({
          auditId: a.id, client: a.client, documentTitle: a.documentTitle,
          control: c.name, sectionNumber: c.sectionNumber, frequency: c.frequency,
          dueDate: c.nextDueDate, daysUntilDue: days, kind: "upcoming",
        });
      }
    });
  });
  return out.sort((x, y) => x.daysUntilDue - y.daysUntilDue);
}
