import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Download, FileSpreadsheet, Eye, ArrowUpDown, FileText } from "lucide-react";
import { PageHeader, SectionCard, Badge } from "@/components/ui-bits";
import { Button, Select } from "@/components/form-bits";
import { Modal } from "@/components/Modal";
import { IMU_OPTIONS, type AuditRecord, type AuditType } from "@/lib/mock-data";
import { useAudits } from "@/lib/audit-store";
import { exportExcelSections, exportPdfSections } from "@/lib/exporters";
import { clientId } from "@/lib/clients";


export function AuditsTable({ title, subtitle, filterType, initialStatus = "", initialMinAnomalies = 0 }: { title: string; subtitle: string; filterType?: AuditType; initialStatus?: string; initialMinAnomalies?: number }) {
  const [q, setQ] = useState("");
  const [imu, setImu] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [minAnom, setMinAnom] = useState(initialMinAnomalies);
  const [sort, setSort] = useState<{ key: keyof AuditRecord; dir: "asc" | "desc" }>({ key: "reviewDate", dir: "desc" });
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditRecord | null>(null);
  const perPage = 10;

  const all = useAudits();
  const filtered = useMemo(() => {
    const base = filterType ? all.filter((a) => a.type === filterType) : all;
    return base
      .filter((a) =>
        (!q || a.client.toLowerCase().includes(q.toLowerCase()) || a.title.toLowerCase().includes(q.toLowerCase()) || a.id.toLowerCase().includes(q.toLowerCase())) &&
        (!imu || a.imu === imu) &&
        (!status || a.status === status) &&
        (a.anomalies >= minAnom)
      )
      .sort((a, b) => {
        const av = a[sort.key] ?? ""; const bv = b[sort.key] ?? "";
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
  }, [q, imu, status, minAnom, sort, filterType, all]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const view = filtered.slice((page - 1) * perPage, page * perPage);

  function toggleSort(k: keyof AuditRecord) {
    setSort((s) => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "asc" });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle}
        actions={
          <>
            <Button variant="outline"><FileSpreadsheet className="h-4 w-4" /> Export Excel</Button>
            <Button variant="outline"><Download className="h-4 w-4" /> Export PDF</Button>
          </>
        }
      />

      <SectionCard title={`Audit Records (${filtered.length})`}>
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search by client, title, or ID..."
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <Select value={imu} onChange={(v) => { setImu(v); setPage(1); }} options={[...IMU_OPTIONS]} placeholder="All IMUs" />
          <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={["Completed", "Pending", "In Review"]} placeholder="All Statuses" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-muted/60">
              <tr>
                <Th onClick={() => toggleSort("id")}>ID</Th>
                <Th onClick={() => toggleSort("title")}>Audit Title</Th>
                <Th onClick={() => toggleSort("client")}>Client</Th>
                <Th onClick={() => toggleSort("imu")}>IMU</Th>
                <Th onClick={() => toggleSort("sgu")}>SGU</Th>
                <Th onClick={() => toggleSort("status")}>Status</Th>
                <Th onClick={() => toggleSort("anomalies")}>Anomalies</Th>
                <Th onClick={() => toggleSort("reviewDate")}>Review Date</Th>
                <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No matching audits</td></tr>
              )}
              {view.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition">
                  <td className="px-4 py-2.5 font-mono text-xs">{a.id}</td>
                  <td className="px-4 py-2.5 font-medium">{a.title}</td>
                  <td className="px-4 py-2.5">{a.client}</td>
                  <td className="px-4 py-2.5"><Badge variant="info">{a.imu}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.sgu}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={a.status === "Completed" ? "success" : a.status === "Pending" ? "warning" : "info"}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={a.anomalies > 5 ? "text-destructive font-semibold" : ""}>{a.anomalies}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{a.reviewDate}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setDetail(a)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-secondary hover:bg-secondary/10">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}</div>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-muted">Prev</button>
            <span className="px-2 py-1">{page} / {pageCount}</span>
            <button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      </SectionCard>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.title ?? ""} subtitle={detail?.id} size="md">
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Client" value={detail.client} />
              <Info label="Type" value={detail.type} />
              <Info label="IMU" value={detail.imu} />
              <Info label="SGU" value={detail.sgu} />
              <Info label="Status" value={detail.status} />
              <Info label="Review Date" value={detail.reviewDate} />
              <Info label="Anomalies" value={String(detail.anomalies)} />
              <Info label="Compliance" value={`${detail.compliance}%`} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link to="/db/report/$id" params={{ id: detail.id }} onClick={() => setDetail(null)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">
                <FileText className="h-4 w-4" /> Open Full Report
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th onClick={onClick} className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground">
      <span className="inline-flex items-center gap-1">{children}<ArrowUpDown className="h-3 w-3 opacity-50" /></span>
    </th>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}
