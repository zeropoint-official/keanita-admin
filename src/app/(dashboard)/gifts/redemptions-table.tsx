'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { fmtDateTime, fmtNum } from '@/lib/format';
import { setRedemptionStatus } from './actions';

export interface RedemptionRow {
  id: string; status: string; cost: number; note: string | null; created_at: string; handled_at: string | null;
  gift: { name: string; category: string; emoji: string | null } | null;
  profile: { firstname: string | null; lastname: string | null; mobile: string | null; email: string | null } | null;
  kid: { first_name: string } | null;
}

const FILTERS = [['requested', 'Αιτήματα'], ['approved', 'Εγκεκριμένα'], ['shipped', 'Απεσταλμένα'], ['delivered', 'Παραδομένα'], ['rejected', 'Απορριφθέντα'], ['all', 'Όλα']] as const;
type Filter = (typeof FILTERS)[number][0];

function RejectDialog({ id, onDone }: { id: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  const submit = () => start(async () => {
    const r = await setRedemptionStatus(id, 'rejected', note);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Απορρίφθηκε και επιστράφηκαν οι πόντοι'); setOpen(false); onDone();
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>Απόρριψη</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Απόρριψη εξαργύρωσης;</DialogTitle><DialogDescription>Οι πόντοι θα επιστραφούν στο μέλος και το απόθεμα θα αυξηθεί κατά 1 (αν παρακολουθείται).</DialogDescription></DialogHeader>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Σημείωση (λόγος απόρριψης)" />
        <DialogFooter><Button variant="destructive" disabled={pending} onClick={submit}>{pending ? '…' : 'Απόρριψη'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RedemptionsTable({ rows }: { rows: RedemptionRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('requested');
  const data = useMemo(() => rows.filter((r) => (filter === 'all' ? true : r.status === filter)), [rows, filter]);
  const refresh = () => router.refresh();

  const act = (id: string, status: 'approved' | 'shipped' | 'delivered') => async () => {
    const r = await setRedemptionStatus(id, status);
    if (r.ok) refresh();
    return r;
  };

  const exportCsv = () => {
    const head = ['Κατάσταση', 'Δώρο', 'Κατηγορία', 'KP', 'Μέλος', 'Παιδί', 'Κινητό', 'Email', 'Αίτημα', 'Διεκπεραίωση', 'Σημείωση'];
    const lines = data.map((r) => [
      r.status, r.gift?.name ?? '', r.gift?.category ?? '', r.cost, `${r.profile?.firstname ?? ''} ${r.profile?.lastname ?? ''}`.trim(), r.kid?.first_name ?? '',
      r.profile?.mobile ?? '', r.profile?.email ?? '', fmtDateTime(r.created_at), r.handled_at ? fmtDateTime(r.handled_at) : '', r.note ?? '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `εξαργυρώσεις-${filter}.csv` });
    a.click();
  };

  const columns: ColumnDef<RedemptionRow, unknown>[] = [
    { id: 'gift', header: 'Δώρο', accessorFn: (r) => r.gift?.name ?? '', cell: ({ row }) => <div className="flex items-center gap-2"><span className="text-xl">{row.original.gift?.emoji ?? '🎁'}</span><div><p className="font-medium">{row.original.gift?.name ?? '—'}</p><StatusBadge value={row.original.gift?.category} className="text-[10px]" /></div></div> },
    { accessorKey: 'cost', header: 'KP', cell: ({ getValue }) => <span className="tabular-nums">{fmtNum(getValue() as number)}</span> },
    { id: 'member', header: 'Μέλος', accessorFn: (r) => `${r.profile?.firstname ?? ''} ${r.profile?.lastname ?? ''} ${r.profile?.mobile ?? ''} ${r.kid?.first_name ?? ''}`,
      cell: ({ row }) => <div><p>{row.original.profile?.firstname} {row.original.profile?.lastname}{row.original.kid ? <span className="text-muted-foreground"> · {row.original.kid.first_name}</span> : null}</p><p className="text-xs text-muted-foreground">{row.original.profile?.mobile} · {row.original.profile?.email}</p></div> },
    { accessorKey: 'created_at', header: 'Αίτημα', cell: ({ getValue }) => fmtDateTime(getValue() as string) },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ row }) => <div><StatusBadge value={row.original.status} />{row.original.note && <p className="text-xs text-muted-foreground mt-1 max-w-48 truncate" title={row.original.note}>{row.original.note}</p>}</div> },
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }) => {
      const { id, status } = row.original;
      return (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {status === 'requested' && <ConfirmButton size="sm" variant="outline" title="Έγκριση εξαργύρωσης;" successMessage="Εγκρίθηκε" onConfirm={act(id, 'approved')}>Έγκριση</ConfirmButton>}
          {(status === 'requested' || status === 'approved') && row.original.gift?.category === 'physical' && <ConfirmButton size="sm" variant="outline" title="Σήμανση ως απεσταλμένο;" successMessage="Απεστάλη" onConfirm={act(id, 'shipped')}>Απεστάλη</ConfirmButton>}
          {(status === 'requested' || status === 'approved' || status === 'shipped') && <ConfirmButton size="sm" variant="outline" title="Σήμανση ως παραδομένο;" successMessage="Παραδόθηκε" onConfirm={act(id, 'delivered')}>Παραδόθηκε</ConfirmButton>}
          {(status === 'requested' || status === 'approved') && <RejectDialog id={id} onDone={refresh} />}
        </div>
      );
    } },
  ];

  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Αναζήτηση μέλους / δώρου…" emptyText="Δεν υπάρχουν εξαργυρώσεις."
      toolbar={<div className="flex flex-wrap gap-1 items-center">
        {FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
      </div>} />
  );
}
