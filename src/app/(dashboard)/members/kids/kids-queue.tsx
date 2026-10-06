'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { fmtDate, fmtNum, ageOf } from '@/lib/format';
import { downloadXlsx, type Cell } from '@/lib/xlsx';
import { setKidStatus } from '../actions';
import { fetchKidsForExport } from './export-action';

interface Parent {
  id: string; firstname: string | null; lastname: string | null; mobile: string | null; email: string | null;
  street_address: string | null; household_number: string | null; building_name: string | null;
  zipcode: string | null; district: string | null; city: string | null; area: string | null;
}
interface Row { id: string; first_name: string; last_name: string | null; dob: string; gender: string | null; status: string; member_id: string | null; reject_reason: string | null; created_at: string; parent: Parent | null }
interface Birthday { from: string; to: string; y1: string; y2: string }

const VIEWS = [['pending', 'Σε αναμονή'], ['approved', 'Εγκεκριμένα'], ['rejected', 'Απορριφθέντα'], ['expired', 'Ληγμένα'], ['expiring', 'Λήγουν σύντομα'], ['birthdays', 'Γενέθλια']] as const;

/** 'Λεωφ. Μακαρίου 25, Μέγαρο Β' — the street line a printed label needs. */
function streetLine(p: Parent | null): string {
  if (!p) return '';
  const street = [p.street_address ?? '', p.household_number ?? ''].map((s) => s.trim()).filter(Boolean).join(' ');
  return [street, (p.building_name ?? '').trim()].filter(Boolean).join(', ');
}

/** '09-30' -> '30/9' */
const fmtMD = (md: string) => { const [m, d] = md.split('-'); return `${Number(d)}/${Number(m)}`; };

export function KidsQueue({ view, q, page, pageSize, total, birthday, rows }: {
  view: string; q: string; page: number; pageSize: number; total: number; birthday: Birthday; rows: Row[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [term, setTerm] = useState(q);
  const [bd, setBd] = useState<Birthday>(birthday);
  const [exporting, setExporting] = useState(false);
  const isBirthdays = view === 'birthdays';

  /** All filter state lives in the URL, so paging and the export agree on it. */
  const go = (next: Partial<{ view: string; q: string; page: number } & Birthday>) => {
    const p = new URLSearchParams();
    const v = next.view ?? view;
    p.set('view', v);
    const search = (next.q ?? term).trim();
    if (search) p.set('q', search);
    if (v === 'birthdays') {
      const b = { ...bd, ...next };
      if (b.from) p.set('from', b.from);
      if (b.to) p.set('to', b.to);
      if (b.y1) p.set('y1', b.y1);
      if (b.y2) p.set('y2', b.y2);
    }
    const pg = next.page ?? 1;
    if (pg > 1) p.set('page', String(pg));
    startTransition(() => router.push(`/members/kids?${p}`));
  };

  const clearBirthday = () => { setBd({ from: '', to: '', y1: '', y2: '' }); go({ from: '', to: '', y1: '', y2: '', page: 1 }); };

  const exportXlsx = async () => {
    setExporting(true);
    try {
      const res = await fetchKidsForExport({ view, q, from: bd.from, to: bd.to, y1: bd.y1, y2: bd.y2 });
      if (!res.ok) { toast.error(res.error); return; }
      const head = ['Παιδί', 'Ημ. γέννησης', 'Ηλικία', 'Φύλο', 'Κατάσταση', 'Αρ. μέλους',
        'Γονέας', 'Κινητό', 'Email', 'Οδός & αριθμός', 'Περιοχή', 'Πόλη', 'Επαρχία', 'Ταχ. κώδικας'];
      const body: Cell[][] = res.rows.map((r) => [
        `${r.first_name} ${r.last_name ?? ''}`.trim(), r.dob, ageOf(r.dob), r.gender ?? '', r.status, r.member_id ?? '',
        `${r.parent?.firstname ?? ''} ${r.parent?.lastname ?? ''}`.trim(), r.parent?.mobile ?? '', r.parent?.email ?? '',
        streetLine(r.parent as Parent | null), r.parent?.area ?? '', r.parent?.city ?? '', r.parent?.district ?? '', r.parent?.zipcode ?? '',
      ]);
      downloadXlsx(`μέλη-${view}`, [head, ...body], 'Μέλη');
      toast.success(`${fmtNum(res.rows.length)} εγγραφές σε Excel`);
      if (res.truncated) toast.warning('Η εξαγωγή περιορίστηκε στις 25.000 εγγραφές.');
    } finally {
      setExporting(false);
    }
  };

  const act = (id: string, s: 'approved' | 'rejected' | 'expired' | 'pending') => async () => { const r = await setKidStatus(id, s, reasons[id]); if (r.ok) router.refresh(); else toast.error(r.error); return r; };

  const columns: ColumnDef<Row, unknown>[] = [
    { id: 'kid', header: 'Παιδί', accessorFn: (r) => `${r.first_name} ${r.last_name ?? ''}`, cell: ({ row }) => <div><p className="font-medium">{row.original.gender === 'girl' ? '👧' : '👦'} {row.original.first_name} {row.original.last_name}</p><p className="text-xs text-muted-foreground">{fmtDate(row.original.dob)} · {ageOf(row.original.dob)} ετών</p></div> },
    { accessorKey: 'member_id', header: 'Αρ. μέλους', cell: ({ getValue }) => { const m = getValue() as string | null; return m ? <span className="font-mono text-xs">{m}</span> : <span className="text-muted-foreground">—</span>; } },
    { id: 'parent', header: 'Γονέας', accessorFn: (r) => `${r.parent?.firstname ?? ''} ${r.parent?.lastname ?? ''} ${r.parent?.mobile ?? ''}`, cell: ({ row }) => row.original.parent ? <Link href={`/members/${row.original.parent.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}><p>{row.original.parent.firstname} {row.original.parent.lastname}</p><p className="text-xs text-muted-foreground">{row.original.parent.mobile} · {row.original.parent.email}</p></Link> : '—' },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ row }) => <div><StatusBadge value={row.original.status} />{row.original.reject_reason && <p className="text-xs text-muted-foreground mt-1">{row.original.reject_reason}</p>}</div> },
    { accessorKey: 'created_at', header: 'Αίτηση', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }) => { const k = row.original; return (
      <div className="flex gap-1 items-center justify-end" onClick={(e) => e.stopPropagation()}>
        {k.status === 'pending' && <>
          <ConfirmButton size="sm" title="Έγκριση;" onConfirm={act(k.id, 'approved')} successMessage="Εγκρίθηκε">Έγκριση</ConfirmButton>
          <Input placeholder="Λόγος" className="h-8 w-32 text-xs" value={reasons[k.id] ?? ''} onChange={(e) => setReasons({ ...reasons, [k.id]: e.target.value })} />
          <ConfirmButton size="sm" variant="outline" title="Απόρριψη;" onConfirm={act(k.id, 'rejected')}>Απόρριψη</ConfirmButton></>}
        {k.status === 'approved' && !isBirthdays && <ConfirmButton size="sm" variant="outline" title="Λήξη μέλους;" onConfirm={act(k.id, 'expired')}>Λήξη</ConfirmButton>}
        {(k.status === 'rejected' || k.status === 'expired') && <ConfirmButton size="sm" variant="outline" title="Επαναφορά σε αναμονή;" onConfirm={act(k.id, 'pending')}>Επαναφορά</ConfirmButton>}
      </div>); } },
  ];

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);
  const hasWindow = /^\d{2}-\d{2}$/.test(bd.from) && /^\d{2}-\d{2}$/.test(bd.to);

  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); go({ q: term, page: 1 }); }}>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Αναζήτηση παιδιού, αρ. μέλους ή γονέα…" className="pl-8 pr-8" />
          {q && <button type="button" className="absolute right-2.5 top-2.5" onClick={() => { setTerm(''); go({ q: '', page: 1 }); }}><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
        <Button type="submit" variant="outline">Αναζήτηση</Button>
      </form>

      {isBirthdays && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Γενέθλια από (η χρονιά αγνοείται)</label>
            <Input type="date" className="h-8 w-40 text-xs" value={bd.from ? `2000-${bd.from}` : ''}
              onChange={(e) => setBd({ ...bd, from: e.target.value.slice(5) })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">μέχρι</label>
            <Input type="date" className="h-8 w-40 text-xs" value={bd.to ? `2000-${bd.to}` : ''}
              onChange={(e) => setBd({ ...bd, to: e.target.value.slice(5) })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Έτος γέννησης από</label>
            <Input type="number" placeholder="2014" className="h-8 w-24 text-xs" value={bd.y1} onChange={(e) => setBd({ ...bd, y1: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">μέχρι</label>
            <Input type="number" placeholder="2022" className="h-8 w-24 text-xs" value={bd.y2} onChange={(e) => setBd({ ...bd, y2: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => go({ ...bd, page: 1 })} disabled={pending}>Εφαρμογή</Button>
          {(bd.from || bd.to || bd.y1 || bd.y2) && (
            <Button size="sm" variant="ghost" onClick={clearBirthday}><X className="h-4 w-4 mr-1" />Καθαρισμός</Button>
          )}
          <p className="text-xs text-muted-foreground basis-full">
            {hasWindow
              ? `Γενέθλια ${fmtMD(bd.from)} έως ${fmtMD(bd.to)}${bd.y1 || bd.y2 ? `, γεννημένοι ${bd.y1 || '…'}–${bd.y2 || '…'}` : ''} · ${fmtNum(total)} παιδιά`
              : 'Χωρίς εύρος ημερομηνιών εμφανίζονται τα γενέθλια των επόμενων 30 ημερών.'}
          </p>
        </div>
      )}

      <DataTable columns={columns} data={rows} hideSearch pageSize={pageSize}
        emptyText={q ? `Κανένα αποτέλεσμα για «${q}».` : 'Τίποτα εδώ.'}
        toolbar={<>
          <div className="flex gap-1 flex-wrap">{VIEWS.map(([k, l]) => <Button key={k} size="sm" variant={view === k ? 'default' : 'outline'} onClick={() => go({ view: k, page: 1 })}>{l}</Button>)}</div>
          <Button size="sm" variant="outline" onClick={exportXlsx} disabled={exporting || total === 0}>
            <Download className="h-4 w-4 mr-1" />{exporting ? 'Εξαγωγή…' : 'Excel'}
          </Button>
        </>} />

      {/* Server-side paging: one page is fetched at a time, never the whole view. */}
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
