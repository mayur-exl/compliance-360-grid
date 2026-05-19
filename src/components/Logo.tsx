export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative h-12 w-12 shrink-0">
        <svg viewBox="0 0 40 40" className="h-full w-full">
          <defs>
            <linearGradient id="cl360" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="17" fill="none" stroke="url(#cl360)" strokeWidth="3" strokeLinecap="round" strokeDasharray="78 30" transform="rotate(-90 20 20)" />
          <circle cx="20" cy="20" r="9" fill="#2B2B2B" />
          <text x="20" y="23.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">360</text>
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[19px] font-bold tracking-tight">
            Compliance<span className="text-primary"> 360</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Audit Platform</div>
        </div>
      )}
    </div>
  );
}
