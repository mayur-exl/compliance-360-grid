import { useSyncExternalStore } from "react";
import { MOCK_AUDITS, type AuditRecord } from "@/lib/mock-data";

const KEY = "c360.audits.v1";

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

export const auditStore = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  getSnapshot() { return audits; },
  getServerSnapshot() { return MOCK_AUDITS; },
  add(rec: AuditRecord) {
    audits = [rec, ...audits];
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
