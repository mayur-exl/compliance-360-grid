import { Bell, Moon, Search, Sun, User, LogOut, Settings, UserCircle, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAudits } from "@/lib/audit-store";
import { Link } from "@tanstack/react-router";

export function Header() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const audits = useAudits();
  const notifications = useMemo(() => {
    const recent = [...audits].sort((a, b) => b.reviewDate.localeCompare(a.reviewDate)).slice(0, 5);
    return recent.map((a) => ({
      id: a.id,
      kind: a.anomalies > 0 ? "alert" as const : "ok" as const,
      title: a.anomalies > 0 ? `${a.anomalies} anomal${a.anomalies === 1 ? "y" : "ies"} in ${a.type}` : `${a.type} audit completed`,
      subtitle: `${a.client} · ${a.reviewDate}`,
    }));
  }, [audits]);
  const unread = notifications.filter((n) => n.kind === "alert").length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search audits, clients, controls..."
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => setDark((d) => !d)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card hover:bg-muted transition"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Popover>
          <PopoverTrigger asChild>
            <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-card hover:bg-muted transition" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border px-4 py-3">
              <div className="text-sm font-semibold">Notifications</div>
              <div className="text-xs text-muted-foreground">{unread} alerts · {notifications.length} recent</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-muted-foreground">No notifications</div>
              )}
              {notifications.map((n) => (
                <Link key={n.id} to="/db/report/$id" params={{ id: n.id }} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/50 transition">
                  <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${n.kind === "alert" ? "bg-destructive/10 text-destructive" : "bg-[color:var(--color-success)]/10 text-[color:var(--color-success)]"}`}>
                    {n.kind === "alert" ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{n.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground truncate">{n.subtitle}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-border px-4 py-2">
              <Link to="/db/overall" className="text-xs font-medium text-primary hover:underline">View all activity →</Link>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-3 rounded-lg border border-border bg-card pl-2 pr-3 py-1.5 hover:bg-muted transition">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="hidden md:block leading-tight text-left">
                <div className="text-xs font-semibold">Alex Carter</div>
                <div className="text-[10px] text-muted-foreground">Audit Lead</div>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            <div className="flex items-center gap-3 border-b border-border px-4 py-4">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Alex Carter</div>
                <div className="text-xs text-muted-foreground truncate">alex.carter@compliance360.io</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  <ShieldCheck className="h-3 w-3" /> Audit Lead
                </div>
              </div>
            </div>
            <div className="p-1">
              <MenuItem icon={UserCircle} label="My Profile" />
              <MenuItem icon={Settings} label="Account Settings" />
              <MenuItem icon={ShieldCheck} label="Security & Access" />
              <div className="my-1 h-px bg-border" />
              <MenuItem icon={LogOut} label="Sign out" tone="destructive" />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}

function MenuItem({ icon: Icon, label, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; tone?: "destructive" }) {
  return (
    <button className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-muted ${tone === "destructive" ? "text-destructive" : ""}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
