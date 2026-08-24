'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { fmtDate, ageOf, todayLocal } from '@/lib/format';
import { setKidStatus } from '../actions';

interface Row { id: string; first_name: string; last_name: string | null; dob: string; gender: string | null; status: string; member_id: string | null; reject_reason: string | null; created_at: string; parent: { id: string; firstname: string | null; lastname: string | null; mobile: string | null; email: string | null } | null }
const VIEWS = [['pending', 'Σε αναμονή'], ['approved', 'Εγκεκριμένα'], ['rejected', 'Απορριφθέντα'], ['expired', 'Ληγμένα'], ['expiring', 'Λήγουν σύντομα'], ['birthdays', 'Γενέθλια (30 ημ.)']] as const;

export function KidsQueue({ view, rows }: { view: string; rows: Row[] }) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const data = useMemo(() => {
    if (view !== 'birthdays') return rows;
    const startOfToday = new Date(todayLocal() + 'T00:00:00'); const end = new Date(startOfToday.getTime() + 30 * 86400e3);
    const withNext = rows.map((r) => { const d = new Date(r.dob); const b = new Date(startOfToday.getFullYear(), d.getMonth(), d.getDate()); if (b < startOfToday) b.setFullYear(b.getFullYear() + 1); return { r, next: b }; });
    return withNext.filter((x) => x.next <= end).sort((a, b) => a.next.getTime() - b.next.getTime()).map((x) => x.r);
  }, [rows, view]);

  const exportCsv = () => {
    const head = ['Παιδί', 'Ημ. γέννησης', 'Ηλικία', 'Φύλο', 'Κατάσταση', 'Αρ. μέλους', 'Γονέας', 'Κινητό', 'Email'];
    const lines = data.map((r) => [`${r.first_name} ${r.last_name ?? ''}`.trim(), r.dob, ageOf(r.dob), r.gender ?? '', r.status, r.member_id ?? '', `${r.parent?.firstname ?? ''} ${r.parent?.lastname ?? ''}`.trim(), r.parent?.mobile ?? '', r.parent?.email ?? '']
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })), download: `kids-${view}.csv` }); a.click();
  };

  const act = (id: string, s: 'approved' | 'rejected' | 'expired' | 'pending') => async () => { const r = await setKidStatus(id, s, reasons[id]); if (r.ok) router.refresh(); else toast.error(r.error); return r; };

  const columns: ColumnDef<Row, unknown>[] = [
    { id: 'kid', header: 'Παιδί', accessorFn: (r) => `${r.first_name} ${r.last_name ?? ''}`, cell: ({ row }) => <div><p className="font-medium">{row.original.gender === 'girl' ? '👧' : '👦'} {row.original.first_name} {row.original.last_name}</p><p className="text-xs text-muted-foreground">{fmtDate(row.original.dob)} · {ageOf(row.original.dob)} ετών {row.original.member_id && `· ${row.original.member_id}`}</p></div> },
    { id: 'parent', header: 'Γονέας', accessorFn: (r) => `${r.parent?.firstname ?? ''} ${r.parent?.lastname ?? ''} ${r.parent?.mobile ?? ''}`, cell: ({ row }) => row.original.parent ? <Link href={`/members/${row.original.parent.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}><p>{row.original.parent.firstname} {row.original.parent.lastname}</p><p className="text-xs text-muted-foreground">{row.original.parent.mobile} · {row.original.parent.email}</p></Link> : '—' },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ row }) => <div><StatusBadge value={row.original.status} />{row.original.reject_reason && <p className="text-xs text-muted-foreground mt-1">{row.original.reject_reason}</p>}</div> },
    { accessorKey: 'created_at', header: 'Αίτηση', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }) => { const k = row.original; return (
      <div className="flex gap-1 items-center justify-end" onClick={(e) => e.stopPropagation()}>
        {k.status === 'pending' && <>
          <ConfirmButton size="sm" title="Έγκριση;" onConfirm={act(k.id, 'approved')} successMessage="Εγκρίθηκε">Έγκριση</ConfirmButton>
          <Input placeholder="Λόγος" className="h-8 w-32 text-xs" value={reasons[k.id] ?? ''} onChange={(e) => setReasons({ ...reasons, [k.id]: e.target.value })} />
          <ConfirmButton size="sm" variant="outline" title="Απόρριψη;" onConfirm={act(k.id, 'rejected')}>Απόρριψη</ConfirmButton></>}
        {k.status === 'approved' && view !== 'birthdays' && <ConfirmButton size="sm" variant="outline" title="Λήξη μέλους;" onConfirm={act(k.id, 'expired')}>Λήξη</ConfirmButton>}
        {(k.status === 'rejected' || k.status === 'expired') && <ConfirmButton size="sm" variant="outline" title="Επαναφορά σε αναμονή;" onConfirm={act(k.id, 'pending')}>Επαναφορά</ConfirmButton>}
      </div>); } },
  ];

  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Αναζήτηση παιδιού ή γονέα…" emptyText="Τίποτα εδώ."
      toolbar={<>
        <div className="flex gap-1 flex-wrap">{VIEWS.map(([k, l]) => <Button key={k} size="sm" variant={view === k ? 'default' : 'outline'} onClick={() => router.push(`/members/kids?view=${k}`)}>{l}</Button>)}</div>
        <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
      </>} />
  );
}
