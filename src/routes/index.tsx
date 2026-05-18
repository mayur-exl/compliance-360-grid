import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  FileText, Users, Shield, ClipboardCheck, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, TrendingUp, TrendingDown, Sparkles, ExternalLink,
} from "lucide-react";
import { KpiCard, PageHeader, SectionCard, Badge } from "@/components/ui-bits";
import type { AuditRecord, AuditType } from "@/lib/mock-data";
import { useAudits } from "@/lib/audit-store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Compliance 360" }] }),
  component: Dashboard,
});

const TYPES: AuditType[] = ["Contractual", "LAR", "Endpoint"];
const TYPE_COLORS: Record<AuditType, string> = {
  Contractual: "var(--brand-orange)",
  LAR: "var(--brand-blue)",
  Endpoint: "var(--color-success)",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function Dashboard() {
  const audits = useAudits();
  const m = useMemo(() => deriveMetrics(audits), [audits]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Real-time compliance, audit and risk posture across the enterprise"
        actions={
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 text-xs">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)] animate-pulse" />
            Live · {audits.length} records
          </span>
        }
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/db/overall" className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40">
          <KpiCard label="Total Audits" value={String(m.total)} delta={m.deltaTotal} icon={ClipboardCheck} accent="primary" progress={Math.min(100, m.total)} />
        </Link>
        <Link to="/db/overall" search={{ status: "Completed", minAnomalies: 0 }} className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40">
          <KpiCard label="Completion %" value={`${m.completionPct}%`} delta={m.deltaCompletion} icon={CheckCircle2} accent="success" progress={m.completionPct} />
        </Link>
        <Link to="/db/overall" className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40">
          <KpiCard label="Avg Compliance" value={`${m.avgCompliance}%`} delta={m.deltaCompliance} icon={TrendingUp} accent="warning" progress={m.avgCompliance} />
        </Link>
        <Link to="/db/overall" search={{ status: "", minAnomalies: 1 }} className="block rounded-2xl transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40">
          <KpiCard label="Open Findings" value={String(m.openFindings)} delta={m.deltaFindings} icon={AlertTriangle} accent="secondary" progress={Math.min(100, m.openFindings)} />
        </Link>
      </div>

      {/* Reviews section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewTile to="/reviews/contractual" title="Contractual Compliance"
          desc="Extract and track contractual compliance from MSA/SOW"
          icon={FileText} gradient="from-primary/15 to-primary/5" iconBg="bg-primary text-primary-foreground" />
        <ReviewTile to="/reviews/lar" title="Logical Access Review"
          desc="Review user access & privileges"
          icon={Users} gradient="from-secondary/15 to-secondary/5" iconBg="bg-secondary text-secondary-foreground" />
        <ReviewTile to="/reviews/endpoint" title="Endpoint Review"
          desc="Endpoint security validation"
          icon={Shield} gradient="from-[color:var(--color-success)]/15 to-[color:var(--color-success)]/5" iconBg="bg-[color:var(--color-success)] text-white" />
      </div>

      {/* Main grid: 70% / 30% */}
      <div className="grid gap-6 lg:grid-cols-10">
        <div className="space-y-6 lg:col-span-7">
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Compliance Trend" subtitle="Average compliance % by month (from audit records)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={m.complianceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" domain={[40, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="compliance" stroke="var(--brand-orange)" strokeWidth={3} dot={{ r: 4, fill: "var(--brand-orange)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Anomalies by Audit Type" subtitle="Live distribution of detected anomalies">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={m.anomaliesByType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {m.anomaliesByType.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Monthly Audit Volume" subtitle="Breakdown across Contractual, LAR, and Endpoint">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.monthlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Contractual" stackId="a" fill="var(--brand-orange)" />
                  <Bar dataKey="LAR" stackId="a" fill="var(--brand-blue)" />
                  <Bar dataKey="Endpoint" stackId="a" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Client-wise Audit Statistics" subtitle="Top clients by audit volume — live data">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.clientStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="client" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="audits" fill="var(--brand-blue)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="anomalies" fill="var(--brand-orange)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Latest Audit Activity" subtitle="Most recent records published to the audit DB"
            action={<Link to="/db/overall" className="text-xs text-secondary inline-flex items-center gap-1">View all <ExternalLink className="h-3 w-3" /></Link>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-muted/50">
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Compliance</th>
                    <th className="px-3 py-2">Anomalies</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {m.latest.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
                      <td className="px-3 py-2 font-medium truncate max-w-[180px]">{a.client}</td>
                      <td className="px-3 py-2"><Badge variant="info">{a.type}</Badge></td>
                      <td className="px-3 py-2">
                        <span className={a.compliance >= 80 ? "text-[color:var(--color-success)] font-semibold" : a.compliance >= 60 ? "text-[color:var(--color-warning)] font-semibold" : "text-destructive font-semibold"}>
                          {a.compliance}%
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={a.anomalies > 0 ? "text-destructive font-semibold" : "text-muted-foreground"}>{a.anomalies}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{a.reviewDate}</td>
                      <td className="px-3 py-2">
                        <Link to="/db/report/$id" params={{ id: a.id }} className="inline-flex items-center gap-1 text-xs text-secondary hover:underline">
                          View report <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Executive Insights — 30% */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-sidebar to-[#1a1a1a] p-5 text-white shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Leadership Summary</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              Compliance posture{" "}
              <span className={m.deltaCompliance >= 0 ? "text-[color:var(--color-success)] font-semibold" : "text-destructive font-semibold"}>
                {m.deltaCompliance >= 0 ? "improved" : "declined"} {Math.abs(m.deltaCompliance)}%
              </span>{" "}
              month-over-month.{" "}
              <span className="font-semibold">{m.highRisk.length} client{m.highRisk.length === 1 ? "" : "s"}</span>{" "}
              require executive attention.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Tile label="Avg Compliance" value={`${m.avgCompliance}%`} />
              <Tile label="Open Findings" value={String(m.openFindings)} />
              <Tile label="Audits MTD" value={String(m.mtdAudits)} />
              <Tile label="Pending" value={String(m.pending)} />
            </div>
          </div>

          <SectionCard title="High-Risk Clients" subtitle="Ranked by anomalies & low compliance">
            {m.highRisk.length === 0 ? (
              <EmptyMini text="No high-risk clients" />
            ) : (
              <ul className="space-y-3">
                {m.highRisk.map((c) => (
                  <li key={c.client} className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive text-xs font-bold">{c.risk}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{c.client}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.reason}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent Anomalies" subtitle="From latest reviews">
            {m.recentAnomalies.length === 0 ? (
              <EmptyMini text="No anomalies detected" />
            ) : (
              <ul className="space-y-3">
                {m.recentAnomalies.map((a) => (
                  <li key={a.id} className="border-l-2 border-primary pl-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">{a.type}</Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">{a.id}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium truncate">{a.client}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.anomalies} issue{a.anomalies === 1 ? "" : "s"} · {a.compliance}% compliant · {a.reviewDate}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Compliance by Review Type" subtitle="Average score per stream">
            <div className="space-y-3">
              {m.byType.map((t) => (
                <InsightRow key={t.label} label={t.label} value={t.value} count={t.count} color={TYPE_COLORS[t.label as AuditType]} />
              ))}
            </div>
            <div className={`mt-4 flex items-center gap-2 text-xs ${m.deltaCompliance >= 0 ? "text-[color:var(--color-success)]" : "text-destructive"}`}>
              {m.deltaCompliance >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {m.deltaCompliance >= 0 ? "+" : ""}{m.deltaCompliance}% vs previous month
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

/* ---------------- derivations ---------------- */

function deriveMetrics(audits: AuditRecord[]) {
  const total = audits.length;
  const completed = audits.filter((a) => a.status === "Completed").length;
  const pending = total - completed;
  const completionPct = total ? Math.round((completed / total) * 100) : 0;
  const avgCompliance = total ? Math.round(audits.reduce((s, a) => s + a.compliance, 0) / total) : 0;
  const openFindings = audits.reduce((s, a) => s + a.anomalies, 0);

  // Month buckets
  const now = new Date();
  const ym = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const currentYm = ym(now);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYm = ym(prev);

  const mtd = audits.filter((a) => ym(new Date(a.reviewDate)) === currentYm);
  const prevMonth = audits.filter((a) => ym(new Date(a.reviewDate)) === prevYm);
  const avgOf = (xs: AuditRecord[]) => xs.length ? Math.round(xs.reduce((s, a) => s + a.compliance, 0) / xs.length) : 0;
  const deltaCompliance = avgOf(mtd) - avgOf(prevMonth);
  const deltaTotal = mtd.length - prevMonth.length;
  const completePct = (xs: AuditRecord[]) => xs.length ? Math.round((xs.filter((a) => a.status === "Completed").length / xs.length) * 100) : 0;
  const deltaCompletion = completePct(mtd) - completePct(prevMonth);
  const deltaFindings = mtd.reduce((s, a) => s + a.anomalies, 0) - prevMonth.reduce((s, a) => s + a.anomalies, 0);

  // Trend over last 8 months
  const trendBuckets: { month: string; vals: number[] }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    trendBuckets.push({ month: MONTHS[d.getMonth()], vals: [] });
  }
  audits.forEach((a) => {
    const d = new Date(a.reviewDate);
    const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (diff >= 0 && diff <= 7) {
      trendBuckets[7 - diff].vals.push(a.compliance);
    }
  });
  const complianceTrend = trendBuckets.map((b) => ({
    month: b.month,
    compliance: b.vals.length ? Math.round(b.vals.reduce((s, v) => s + v, 0) / b.vals.length) : 0,
  }));

  // Anomalies by type
  const anomaliesByType = TYPES.map((t) => ({
    name: t,
    value: audits.filter((a) => a.type === t).reduce((s, a) => s + a.anomalies, 0),
    color: TYPE_COLORS[t],
  })).filter((x) => x.value > 0);

  // Monthly volume by type (last 8 months)
  const volumeBuckets: Record<string, { month: string; Contractual: number; LAR: number; Endpoint: number }> = {};
  const monthlyVolume: typeof volumeBuckets[string][] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    volumeBuckets[key] = { month: MONTHS[d.getMonth()], Contractual: 0, LAR: 0, Endpoint: 0 };
    monthlyVolume.push(volumeBuckets[key]);
  }
  audits.forEach((a) => {
    const d = new Date(a.reviewDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = volumeBuckets[key];
    if (bucket) bucket[a.type] += 1;
  });

  // Client stats — top 6 by audits
  const byClient = new Map<string, { client: string; audits: number; anomalies: number; compliance: number[] }>();
  audits.forEach((a) => {
    const k = a.client;
    const cur = byClient.get(k) ?? { client: k, audits: 0, anomalies: 0, compliance: [] };
    cur.audits += 1;
    cur.anomalies += a.anomalies;
    cur.compliance.push(a.compliance);
    byClient.set(k, cur);
  });
  const clientStats = Array.from(byClient.values())
    .sort((a, b) => b.audits - a.audits)
    .slice(0, 6)
    .map((c) => ({ client: c.client.split(" ")[0], audits: c.audits, anomalies: c.anomalies }));

  // High-risk clients
  const highRisk = Array.from(byClient.values())
    .map((c) => {
      const avg = Math.round(c.compliance.reduce((s, v) => s + v, 0) / c.compliance.length);
      const risk = Math.min(99, Math.max(0, Math.round(c.anomalies * 6 + (100 - avg) * 0.6)));
      const reason = avg < 70
        ? `Low compliance (${avg}%)`
        : c.anomalies > 8
          ? `${c.anomalies} open anomalies`
          : `${c.anomalies} findings · ${avg}% compliant`;
      return { client: c.client, risk, reason, anomalies: c.anomalies, avg };
    })
    .filter((c) => c.anomalies > 0 || c.avg < 80)
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 4);

  // Recent anomalies — latest audits with anomalies > 0
  const recentAnomalies = [...audits]
    .filter((a) => a.anomalies > 0)
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))
    .slice(0, 4);

  // Latest activity
  const latest = [...audits]
    .sort((a, b) => b.reviewDate.localeCompare(a.reviewDate))
    .slice(0, 6);

  // By type compliance
  const byType = TYPES.map((t) => {
    const xs = audits.filter((a) => a.type === t);
    return {
      label: t,
      value: xs.length ? Math.round(xs.reduce((s, a) => s + a.compliance, 0) / xs.length) : 0,
      count: xs.length,
    };
  });

  return {
    total, completed, pending, completionPct, avgCompliance, openFindings,
    mtdAudits: mtd.length,
    deltaTotal, deltaCompliance, deltaCompletion, deltaFindings,
    complianceTrend, anomaliesByType, monthlyVolume, clientStats,
    highRisk, recentAnomalies, latest, byType,
  };
}

/* ---------------- bits ---------------- */

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <div className="text-white/60">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="rounded-lg bg-muted/40 px-3 py-6 text-center text-xs text-muted-foreground">{text}</div>;
}

function InsightRow({ label, value, color, count }: { label: string; value: number; color: string; count?: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium">{label}{count !== undefined && <span className="text-muted-foreground font-normal"> · {count}</span>}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function ReviewTile({ to, title, desc, icon: Icon, gradient, iconBg }: {
  to: string; title: string; desc: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string; iconBg: string;
}) {
  return (
    <Link to={to} className={`group rounded-2xl border border-border/60 bg-gradient-to-br ${gradient} p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5`}>
      <div className="flex items-start justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${iconBg} shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition" />
      </div>
      <div className="mt-4">
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
