import { useState } from "react";
import { Plus, Trash2, Search, Save, Edit3, Check, X } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/form-bits";

export function ConfigList({ title, subtitle, initial }: { title: string; subtitle: string; initial: string[] }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = items.filter((i) => i.toLowerCase().includes(q.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const view = filtered.slice((page - 1) * perPage, page * perPage);

  function add() {
    if (draft.trim()) { setItems([draft.trim(), ...items]); setDraft(""); }
  }
  function remove(i: number) {
    setItems(items.filter((_, k) => k !== i));
  }
  function saveEdit() {
    if (editIdx === null) return;
    const real = items.indexOf(view[editIdx]);
    if (real >= 0) {
      const copy = [...items]; copy[real] = editVal; setItems(copy);
    }
    setEditIdx(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle}
        actions={<Button variant="primary"><Save className="h-4 w-4" /> Save Changes</Button>} />

      <SectionCard title="Manage entries">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search..." className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New entry..."
            className="h-10 flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <Button onClick={add}><Plus className="h-4 w-4" /> Add</Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="w-12 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Entry</th>
                <th className="w-32 px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No entries</td></tr>
              )}
              {view.map((item, i) => (
                <tr key={item + i} className="border-t border-border">
                  <td className="px-4 py-2.5 text-muted-foreground">{(page - 1) * perPage + i + 1}</td>
                  <td className="px-4 py-2.5">
                    {editIdx === i ? (
                      <input value={editVal} onChange={(e) => setEditVal(e.target.value)} autoFocus
                        className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm" />
                    ) : <span className="font-medium">{item}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      {editIdx === i ? (
                        <>
                          <button onClick={saveEdit} className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-success)] hover:bg-[color:var(--color-success)]/10"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditIdx(null)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditIdx(i); setEditVal(item); }} className="grid h-8 w-8 place-items-center rounded-md text-secondary hover:bg-secondary/10"><Edit3 className="h-4 w-4" /></button>
                          <button onClick={() => remove((page - 1) * perPage + i)} className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>{filtered.length} total · page {page} of {pageCount}</div>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted">Prev</button>
            <button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-border px-2 py-1 disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
