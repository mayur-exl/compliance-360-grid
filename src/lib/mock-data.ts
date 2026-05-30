export const IMU_OPTIONS = ["Insurance", "DIG", "Healthcare", "BCM"] as const;
export const SGU_OPTIONS = ["Domain Ops", "Analytics", "F&A Ops", "Data Platforms"] as const;

export const CONTRACTUAL_CONTROLS = [
  "Disaster Recovery",
  "VAPT",
  "PCIDSS",
  "HIPPA",
  "SOC Type2",
  "VPN",
  "MPLS",
  "Monthly Reviews",
];

export const LAR_ALLOWED_GROUPS = [
  "printer_access",
  "wfh_internet",
  "vpn_users",
  "shared_drive_users",
];

export const ENDPOINT_BASELINE = [
  "Antivirus Enabled",
  "Disk Encryption Enabled",
  "Firewall Active",
  "OS Updated",
  "VPN Installed",
];

export type AuditType = "Contractual" | "LAR" | "Endpoint";

export type Frequency = "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly";
export const FREQUENCY_MONTHS: Record<Frequency, number> = {
  Monthly: 1, Quarterly: 3, "Half-Yearly": 6, Yearly: 12,
};

export interface Submission {
  id: string;
  date: string;            // ISO date
  fileName: string;
  verdict: "Compliant" | "Non-Compliant";
  notes: string;
}

export type ControlStatus = "Pending" | "Compliant" | "Non-Compliant" | "Overdue";

export interface ContractualControl {
  name: string;
  sectionNumber: string;          // e.g. "§4.2"
  frequency: Frequency;
  language: string;               // captured from SOW
  status: ControlStatus;
  lastSubmissionDate?: string;
  nextDueDate: string;            // ISO date
  submissions: Submission[];
}

export interface AuditRecord {
  id: string;
  title: string;
  client: string;
  imu: string;
  sgu: string;
  type: AuditType;
  status: "Completed" | "Pending" | "In Review";
  anomalies: number;
  compliance: number;
  reviewDate: string;
  reportUrl: string;
  contractStartDate?: string;     // ISO date — contractual only
  documentTitle?: string;         // SOW/MSA title — contractual only
  controls?: ContractualControl[]; // contractual only
}

const clients = [
  "Northwind Insurance",
  "Acme Health Systems",
  "Globex Financial",
  "Initech BCM",
  "Umbrella DIG",
  "Soylent Analytics",
  "Stark Healthcare",
  "Wayne Domain Ops",
  "Hooli Data",
  "Pied Piper F&A",
];

const types: AuditType[] = ["Contractual", "LAR", "Endpoint"];
const statuses: AuditRecord["status"][] = ["Completed", "Pending", "In Review"];

function seeded(i: number) {
  return Math.abs(Math.sin(i * 9301 + 49297) * 233280) % 1;
}

const FREQS: Frequency[] = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

function isoUTC(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

function buildContractualControls(seedIdx: number, startDateISO: string): ContractualControl[] {
  const start = new Date(startDateISO);
  return CONTRACTUAL_CONTROLS.map((name, ci) => {
    const freq = FREQS[(seedIdx + ci) % FREQS.length];
    const months = FREQUENCY_MONTHS[freq];
    const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate()));
    return {
      name,
      sectionNumber: `§${2 + (ci % 8)}.${1 + (ci % 5)}`,
      frequency: freq,
      language: `Provider shall maintain ${name} controls and provide evidence at the agreed ${freq.toLowerCase()} cadence.`,
      status: "Pending" as ControlStatus,
      nextDueDate: next.toISOString().slice(0, 10),
      submissions: [],
    };
  });
}

export const MOCK_AUDITS: AuditRecord[] = Array.from({ length: 42 }, (_, i) => {
  const type = types[i % 3];
  const client = clients[i % clients.length];
  const reviewDate = isoUTC(2025, i % 12, 1 + (i % 27));
  const base: AuditRecord = {
    id: `AUD-${1000 + i}`,
    title: `${type} Review – ${client.split(" ")[0]}`,
    client,
    imu: IMU_OPTIONS[i % IMU_OPTIONS.length],
    sgu: SGU_OPTIONS[i % SGU_OPTIONS.length],
    type,
    status: statuses[Math.floor(seeded(i) * 3)],
    anomalies: Math.floor(seeded(i + 1) * 12),
    compliance: 70 + Math.floor(seeded(i + 2) * 30),
    reviewDate,
    reportUrl: `/reports/AUD-${1000 + i}.pdf`,
  };
  if (type === "Contractual") {
    base.documentTitle = `MSA / SOW – ${client.split(" ")[0]}`;
    base.contractStartDate = reviewDate;
    base.controls = buildContractualControls(i, reviewDate);
    // status reflects artifact lifecycle: all pending initially
    base.status = "In Review";
    base.anomalies = 0;
    base.compliance = 0;
  }
  return base;
});

export const MONTHLY_VOLUME = [
  { month: "Jan", Contractual: 12, LAR: 9, Endpoint: 14 },
  { month: "Feb", Contractual: 15, LAR: 11, Endpoint: 13 },
  { month: "Mar", Contractual: 18, LAR: 14, Endpoint: 17 },
  { month: "Apr", Contractual: 14, LAR: 16, Endpoint: 19 },
  { month: "May", Contractual: 20, LAR: 18, Endpoint: 22 },
  { month: "Jun", Contractual: 23, LAR: 17, Endpoint: 25 },
  { month: "Jul", Contractual: 21, LAR: 20, Endpoint: 24 },
  { month: "Aug", Contractual: 26, LAR: 22, Endpoint: 28 },
];

export const COMPLETION_TREND = [
  { month: "Jan", completion: 72 },
  { month: "Feb", completion: 76 },
  { month: "Mar", completion: 78 },
  { month: "Apr", completion: 81 },
  { month: "May", completion: 84 },
  { month: "Jun", completion: 86 },
  { month: "Jul", completion: 88 },
  { month: "Aug", completion: 91 },
];

export const ANOMALIES_BY_TYPE = [
  { name: "Contractual", value: 34, color: "var(--brand-orange)" },
  { name: "LAR", value: 28, color: "var(--brand-blue)" },
  { name: "Endpoint", value: 19, color: "var(--color-success)" },
];

export const CLIENT_STATS = clients.slice(0, 6).map((c, i) => ({
  client: c.split(" ")[0],
  audits: 6 + Math.floor(seeded(i + 10) * 18),
  anomalies: Math.floor(seeded(i + 20) * 8),
}));

export const HIGH_RISK_CLIENTS = [
  { client: "Umbrella DIG", risk: 92, reason: "Multiple LAR anomalies" },
  { client: "Hooli Data", risk: 87, reason: "Endpoint baseline gaps" },
  { client: "Globex Financial", risk: 81, reason: "Contract control missing" },
  { client: "Pied Piper F&A", risk: 74, reason: "Pending VAPT review" },
];

export const RECENT_ANOMALIES = [
  { id: "A-2210", client: "Umbrella DIG", type: "LAR", desc: "Unauthorized group: admin_global" },
  { id: "A-2209", client: "Hooli Data", type: "Endpoint", desc: "Disk encryption disabled on 4 hosts" },
  { id: "A-2208", client: "Globex Financial", type: "Contractual", desc: "HIPPA clause missing in MSA" },
  { id: "A-2207", client: "Stark Healthcare", type: "Endpoint", desc: "OS patches > 90 days behind" },
];
