import { Bell, Moon, Search, Sun, User } from "lucide-react";
import { useEffect, useState } from "react";

export function Header() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
        <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-card hover:bg-muted transition">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </button>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card pl-2 pr-3 py-1.5">
          <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-white">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-semibold">Alex Carter</div>
            <div className="text-[10px] text-muted-foreground">Audit Lead</div>
          </div>
        </div>
      </div>
    </header>
  );
}
