import type { AuditRecord } from "@/lib/mock-data";

/** Deterministic short client id derived from the client name */
export function clientId(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const n = (Math.abs(h) % 9000) + 1000;
  return `CL-${n}`;
}

export type Quarter = { year: number; q: 1 | 2 | 3 | 4 };

export function quarterOf(date: Date | string): Quarter {
  const d = typeof date === "string" ? new Date(date) : date;
  return { year: d.getFullYear(), q: (Math.floor(d.getMonth() / 3) + 1) as Quarter["q"] };
}

export function currentQuarter(): Quarter {
  return quarterOf(new Date());
}

export function quarterLabel(q: Quarter): string {
  return `Q${q.q} ${q.year}`;
}

export function sameQuarter(a: Quarter, b: Quarter): boolean {
  return a.year === b.year && a.q === b.q;
}

export function quarterRange(q: Quarter): { start: string; end: string } {
  const startMonth = (q.q - 1) * 3;
  const start = new Date(q.year, startMonth, 1);
  const end = new Date(q.year, startMonth + 3, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export interface ClientSummary {
  client: string;
  clientId: string;
  imu: string;
  sgu: string;
  onboardedOn: string;             // earliest reviewDate / contractStartDate seen
  contractual: TypeSummary;
  lar: QuarterlyTypeSummary;
  endpoint: QuarterlyTypeSummary;
  overallCompliance: number;       // weighted average
  totalAnomalies: number;
  totalAudits: number;
  quarterAudits: AuditRecord[];
}

export interface TypeSummary {
  count: number;
  compliance: number;              // 0-100
  anomalies: number;
  /** for contractual: total controls / compliant / pending / overdue */
  controlsTotal?: number;
  controlsCompliant?: number;
  controlsPending?: number;
  controlsOverdue?: number;
}

export interface QuarterlyTypeSummary extends TypeSummary {
  /** quarterly review status for current quarter */
  quarterStatus: "Completed" | "In Review" | "Pending";
  latestAuditId?: string;
  latestReviewDate?: string;
}

export function summarizeClients(audits: AuditRecord[], q: Quarter = currentQuarter()): ClientSummary[] {
  const byClient = new Map<string, AuditRecord[]>();
  audits.forEach((a) => {
    const list = byClient.get(a.client) ?? [];
    list.push(a);
    byClient.set(a.client, list);
  });

  const out: ClientSummary[] = [];
  byClient.forEach((list, client) => {
    const first = list.slice().sort((a, b) => a.reviewDate.localeCompare(b.reviewDate))[0];
    const onboardedOn = list
      .map((a) => a.contractStartDate ?? a.reviewDate)
      .sort()[0];

    const contractualAudits = list.filter((a) => a.type === "Contractual");
    const larAudits = list.filter((a) => a.type === "LAR");
    const endpointAudits = list.filter((a) => a.type === "Endpoint");

    const contractual = summarizeContractual(contractualAudits);
    const lar = summarizeQuarterly(larAudits, q);
    const endpoint = summarizeQuarterly(endpointAudits, q);

    const weighted: number[] = [];
    if (contractual.count > 0) weighted.push(contractual.compliance);
    if (lar.count > 0) weighted.push(lar.compliance);
    if (endpoint.count > 0) weighted.push(endpoint.compliance);
    const overall = weighted.length
      ? Math.round(weighted.reduce((s, n) => s + n, 0) / weighted.length)
      : 0;

    const quarterAudits = list.filter((a) => sameQuarter(quarterOf(a.reviewDate), q));

    out.push({
      client,
      clientId: clientId(client),
      imu: first.imu,
      sgu: first.sgu,
      onboardedOn,
      contractual, lar, endpoint,
      overallCompliance: overall,
      totalAnomalies: list.reduce((s, a) => s + a.anomalies, 0),
      totalAudits: list.length,
      quarterAudits,
    });
  });

  return out.sort((a, b) => a.overallCompliance - b.overallCompliance);
}

function summarizeContractual(list: AuditRecord[]): TypeSummary {
  if (list.length === 0) return { count: 0, compliance: 0, anomalies: 0 };
  let total = 0, compliant = 0, pending = 0, overdue = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  list.forEach((a) => {
    (a.controls ?? []).forEach((c) => {
      total += 1;
      const due = new Date(c.nextDueDate); due.setHours(0, 0, 0, 0);
      const isOverdue = due.getTime() < today.getTime() && c.status !== "Compliant";
      if (c.status === "Compliant") compliant += 1;
      else if (isOverdue || c.status === "Overdue" || c.status === "Non-Compliant") overdue += 1;
      else pending += 1;
    });
  });
  const compliance = total > 0
    ? Math.round((compliant / total) * 100)
    : Math.round(list.reduce((s, a) => s + a.compliance, 0) / list.length);
  const anomalies = list.reduce((s, a) => s + a.anomalies, 0) + (total > 0 ? overdue : 0);
  return {
    count: list.length, compliance, anomalies,
    controlsTotal: total, controlsCompliant: compliant,
    controlsPending: pending, controlsOverdue: overdue,
  };
}

function summarizeQuarterly(list: AuditRecord[], q: Quarter): QuarterlyTypeSummary {
  const compliance = list.length
    ? Math.round(list.reduce((s, a) => s + a.compliance, 0) / list.length)
    : 0;
  const anomalies = list.reduce((s, a) => s + a.anomalies, 0);
  const inQuarter = list
    .filter((a) => sameQuarter(quarterOf(a.reviewDate), q))
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate));
  const latest = inQuarter[0];
  const quarterStatus: QuarterlyTypeSummary["quarterStatus"] = !latest
    ? "Pending"
    : latest.status === "Completed" ? "Completed"
    : latest.status === "In Review" ? "In Review"
    : "Pending";
  return {
    count: list.length, compliance, anomalies,
    quarterStatus,
    latestAuditId: latest?.id,
    latestReviewDate: latest?.reviewDate,
  };
}
