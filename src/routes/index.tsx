import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  FileText, Users, Shield, ClipboardCheck, AlertTriangle, CheckCircle2,
  Clock, ArrowUpRight, TrendingUp, Sparkles,
} from "lucide-react";
import { KpiCard, PageHeader, SectionCard, Badge } from "@/components/ui-bits";
import {
  ANOMALIES_BY_TYPE, CLIENT_STATS, COMPLETION_TREND, HIGH_RISK_CLIENTS,
  MONTHLY_VOLUME, RECENT_ANOMALIES,
} from "@/lib/mock-data";
import { useAudits } from "@/lib/audit-store";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — Compliance 360" }] }),
  component: Dashboard,
});

function Dashboard() {
  const MOCK_AUDITS = useAudits();
  const total = MOCK_AUDITS.length;
  const completed = MOCK_AUDITS.filter((a) => a.status === "Completed").length;
  const pending = MOCK_AUDITS.filter((a) => a.status !== "Completed").length;
  const anomalyRate = Math.round(
    MOCK_AUDITS.reduce((s, a) => s + a.anomalies, 0) / total
  );
  const completionPct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Real-time compliance, audit and risk posture across the enterprise"
        actions={
          <>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-[color:var(--color-success)] animate-pulse" />
              Live · synced 2m ago
            </span>
          </>
        }
      />

      {/* KPI tiles */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Audits" value={String(total)} delta={12} icon={ClipboardCheck} accent="primary" progress={88} />
        <KpiCard label="Completion %" value={`${completionPct}%`} delta={4} icon={CheckCircle2} accent="success" progress={completionPct} />
        <KpiCard label="Anomalies %" value={`${anomalyRate * 2}%`} delta={-3} icon={AlertTriangle} accent="warning" progress={anomalyRate * 2} />
        <KpiCard label="Pending Reviews" value={String(pending)} delta={-6} icon={Clock} accent="secondary" progress={(pending / total) * 100} />
      </div>

      {/* Reviews section */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewTile
          to="/reviews/contractual"
          title="Contractual Compliance"
          desc="Extract and track contractual compliance from MSA/SOW"
          icon={FileText}
          gradient="from-primary/15 to-primary/5"
          iconBg="bg-primary text-primary-foreground"
        />
        <ReviewTile
          to="/reviews/lar"
          title="Logical Access Review"
          desc="Review user access & privileges"
          icon={Users}
          gradient="from-secondary/15 to-secondary/5"
          iconBg="bg-secondary text-secondary-foreground"
        />
        <ReviewTile
          to="/reviews/endpoint"
          title="Endpoint Review"
          desc="Endpoint security validation"
          icon={Shield}
          gradient="from-[color:var(--color-success)]/15 to-[color:var(--color-success)]/5"
          iconBg="bg-[color:var(--color-success)] text-white"
        />
      </div>

      {/* Main grid: 70% / 30% */}
      <div className="grid gap-6 lg:grid-cols-10">
        <div className="space-y-6 lg:col-span-7">
          <div className="grid gap-6 md:grid-cols-2">
            <SectionCard title="Audit Completion Trend" subtitle="Monthly completion percentage">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={COMPLETION_TREND}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" domain={[60, 100]} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="completion" stroke="var(--brand-orange)" strokeWidth={3} dot={{ r: 4, fill: "var(--brand-orange)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Anomalies by Audit Type" subtitle="Distribution of detected anomalies">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ANOMALIES_BY_TYPE} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {ANOMALIES_BY_TYPE.map((e, i) => <Cell key={i} fill={e.color} />)}
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
                <BarChart data={MONTHLY_VOLUME}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Contractual" stackId="a" fill="var(--brand-orange)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="LAR" stackId="a" fill="var(--brand-blue)" />
                  <Bar dataKey="Endpoint" stackId="a" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Client-wise Audit Statistics" subtitle="Audits and anomalies by client">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CLIENT_STATS}>
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
        </div>

        {/* Executive Insights — 30% */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-sidebar to-[#1a1a1a] p-5 text-white shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/70">Leadership Summary</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              Compliance posture <span className="text-primary font-semibold">improved 4%</span> month-over-month.
              <span className="font-semibold"> 3 high-risk clients</span> require executive attention.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/60">Avg Compliance</div>
                <div className="mt-1 text-lg font-bold">88%</div>
              </div>
              <div className="rounded-lg bg-white/5 p-3">
                <div className="text-white/60">Open Findings</div>
                <div className="mt-1 text-lg font-bold">142</div>
              </div>
            </div>
          </div>

          <SectionCard title="High-Risk Clients" subtitle="Top exposure">
            <ul className="space-y-3">
              {HIGH_RISK_CLIENTS.map((c) => (
                <li key={c.client} className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-destructive/10 text-destructive text-xs font-bold">{c.risk}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{c.client}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.reason}</div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Recent Anomalies">
            <ul className="space-y-3">
              {RECENT_ANOMALIES.map((a) => (
                <li key={a.id} className="border-l-2 border-primary pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{a.type}</Badge>
                    <span className="text-[11px] text-muted-foreground">{a.id}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium">{a.client}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Audit Completion Insights">
            <div className="space-y-3">
              <InsightRow label="Contractual" value={92} color="var(--brand-orange)" />
              <InsightRow label="LAR" value={84} color="var(--brand-blue)" />
              <InsightRow label="Endpoint" value={78} color="var(--color-success)" />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--color-success)]">
              <TrendingUp className="h-3.5 w-3.5" /> +6% improvement in Q3
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
};

function InsightRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium">{label}</span>
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
