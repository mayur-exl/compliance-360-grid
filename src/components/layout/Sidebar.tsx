import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileSearch, FileText, Users, Shield,
  Settings, ListChecks, ShieldCheck, Database, FolderArchive,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/Logo";

type Item = { label: string; to: string; icon: React.ComponentType<{ className?: string }> };
type Group = { label: string; icon: React.ComponentType<{ className?: string }>; items: Item[] };

const SINGLES: Item[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
];

const GROUPS: Group[] = [
  {
    label: "Reviews",
    icon: FileSearch,
    items: [
      { label: "Contractual Compliance", to: "/reviews/contractual", icon: FileText },
      { label: "Logical Access Review", to: "/reviews/lar", icon: Users },
      { label: "Endpoint Review", to: "/reviews/endpoint", icon: Shield },
    ],
  },
  {
    label: "Configuration",
    icon: Settings,
    items: [
      { label: "Contractual Comp. List", to: "/config/contractual", icon: ListChecks },
      { label: "LAR Allowed List", to: "/config/lar", icon: ListChecks },
      { label: "Endpoint Baseline", to: "/config/endpoint", icon: ShieldCheck },
    ],
  },
  {
    label: "Database",
    icon: Database,
    items: [
      { label: "Overall Audits", to: "/db/overall", icon: FolderArchive },
      { label: "Contractual DB", to: "/db/contractual", icon: FolderArchive },
      { label: "LAR DB", to: "/db/lar", icon: FolderArchive },
      { label: "Endpoint DB", to: "/db/endpoint", icon: FolderArchive },
    ],
  },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const [open, setOpen] = useState<Record<string, boolean>>({
    Reviews: true, Configuration: true, Database: true,
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
        <div className="text-white">
          <Logo />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
        {SINGLES.map((it) => {
          const active = pathname === it.to;
          return (
            <Link key={it.to} to={it.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-sidebar-accent"
              }`}>
              <it.icon className="h-4 w-4" />
              {it.label}
            </Link>
          );
        })}
        {GROUPS.map((g) => {
          const isOpen = open[g.label];
          const hasActive = g.items.some((i) => pathname === i.to);
          return (
            <div key={g.label} className="pt-2">
              <button
                onClick={() => setOpen((s) => ({ ...s, [g.label]: !s[g.label] }))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <span className="flex items-center gap-2">
                  <g.icon className="h-3.5 w-3.5" />
                  {g.label}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && (
                <div className="mt-1 space-y-0.5">
                  {g.items.map((it) => {
                    const active = pathname === it.to;
                    return (
                      <Link key={it.to} to={it.to}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 pl-8 text-sm transition-colors ${
                          active
                            ? "bg-primary/15 text-primary font-medium border-l-2 border-primary"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        }`}>
                        <it.icon className="h-4 w-4" />
                        {it.label}
                      </Link>
                    );
                  })}
                </div>
              )}
              {hasActive && !isOpen && <div className="h-0.5 mx-3 bg-primary/40 rounded" />}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/60">
        v2.4.1 · Enterprise
      </div>
    </aside>
  );
}
