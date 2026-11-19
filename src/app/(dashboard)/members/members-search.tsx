'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { fmtDate, fmtNum } from '@/lib/format';

interface KidChip { first_name: string; status: string }
export interface ParentRow { id: string; firstname: string | null; lastname: string | null; email: string | null; mobile: string | null; is_active: boolean; created_at: string | null; kids: KidChip[] }

const KID_DOT: Record<string, string> = { approved: 'bg-green-500', pending: 'bg-amber-500', rejected: 'bg-red-500', expired: 'bg-gray-400' };

export function MembersSearch({ q, page, pageSize, total, rows }: {
  q: string; page: number; pageSize: number; total: number; rows: ParentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(q);

  /** Search and page live in the URL, so a refresh or a shared link shows the same page. */
  const go = (next: { q?: string; page?: number }) => {
    const p = new URLSearchParams();
    const search = (next.q ?? q).trim();
    if (search) p.set('q', search);
    const pg = next.page ?? 1;
    if (pg > 1) p.set('page', String(pg));
    const qs = p.toString();
    startTransition(() => router.push(qs ? `/members?${qs}` : '/members'));
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  const columns: ColumnDef<ParentRow, unknown>[] = [
    { id: 'name', header: 'Γονέας', accessorFn: (r) => `${r.firstname ?? ''} ${r.lastname ?? ''} ${r.email ?? ''}`,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium">{row.original.firstname} {row.original.lastname}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
          {!row.original.is_active && <Badge variant="destructive">Ανενεργό</Badge>}
        </div>
      ) },
    { accessorKey: 'mobile', header: 'Κινητό', cell: ({ getValue }) => <span className="tabular-nums">{(getValue() as string) || '—'}</span> },
    { id: 'kids', header: 'Παιδιά', accessorFn: (r) => r.kids.length, cell: ({ row }) => row.original.kids.length ? (
        <div className="flex flex-wrap gap-1 max-w-72">
          {row.original.kids.slice(0, 3).map((k, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${KID_DOT[k.status] ?? 'bg-gray-400'}`} />{k.first_name}
            </span>
          ))}
          {row.original.kids.length > 3 && <span className="text-xs text-muted-foreground self-center">+{row.original.kids.length - 3}</span>}
        </div>
      ) : <span className="text-xs text-muted-foreground">—</span> },
    { accessorKey: 'created_at', header: 'Εγγραφή', cell: ({ getValue }) => fmtDate(getValue() as string) },
  ];

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); go({ q: term, page: 1 }); }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Αναζήτηση σε όλους τους γονείς (όνομα, email, κινητό)…" className="pl-8 pr-8" />
          {q && <button type="button" className="absolute right-2.5 top-2.5" onClick={() => { setTerm(''); go({ q: '', page: 1 }); }}><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <Button type="submit" variant="outline">Αναζήτηση</Button>
      </form>
      <p className="text-xs text-muted-foreground">Πιο πρόσφατες εγγραφές πρώτα. Κουκκίδα παιδιού: πράσινη = εγκεκριμένο, πορτοκαλί = σε αναμονή, κόκκινη = απορρίφθηκε, γκρι = ληγμένο.</p>
      <DataTable columns={columns} data={rows} hideSearch pageSize={pageSize} onRowClick={(r) => router.push(`/members/${r.id}`)}
        emptyText={q ? `Κανένα αποτέλεσμα για «${q}».` : 'Δεν βρέθηκαν εγγραφές.'} />

      {/* Server-side paging: one page is fetched at a time, never the whole list. */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground text-xs">
          {total === 0 ? 'Καμία εγγραφή' : `${fmtNum(firstRow)}–${fmtNum(lastRow)} από ${fmtNum(total)}`}
          {pending && ' · φόρτωση…'}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Σελίδα {page} / {fmtNum(pages)}</span>
            <Button variant="outline" size="icon" disabled={page <= 1 || pending} onClick={() => go({ page: page - 1 })}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" disabled={page >= pages || pending} onClick={() => go({ page: page + 1 })}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
