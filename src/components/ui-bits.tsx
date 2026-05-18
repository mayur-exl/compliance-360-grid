import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

export function KpiCard({
  label, value, delta, icon: Icon, accent = "primary", progress,
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  accent?: "primary" | "secondary" | "success" | "warning";
  progress?: number;
}) {
  const accentMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]",
    warning: "bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)]",
  };
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/60 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${accentMap[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full ${accent === "primary" ? "bg-primary" : accent === "secondary" ? "bg-secondary" : "bg-[color:var(--color-success)]"}`} style={{ width: `${progress}%` }} />
        </div>
      )}
      {delta !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {delta >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-[color:var(--color-success)]" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className={delta >= 0 ? "text-[color:var(--color-success)] font-medium" : "text-destructive font-medium"}>
            {delta >= 0 ? "+" : ""}{delta}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm border border-border/60">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" }) {
  const map = {
    default: "bg-muted text-foreground",
    success: "bg-[color:var(--color-success)]/15 text-[color:var(--color-success)]",
    warning: "bg-[color:var(--color-warning)]/20 text-[color:var(--color-warning)]",
    danger: "bg-destructive/15 text-destructive",
    info: "bg-secondary/15 text-secondary",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${map[variant]}`}>{children}</span>;
}
