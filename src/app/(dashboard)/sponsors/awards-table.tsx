'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Button } from '@/components/ui/button';
import { fmtDateTime } from '@/lib/format';
import { redeemAward, revokeAward } from './actions';

export interface AwardRow {
  id: string; status: string; won_at: string; expires_at: string | null; redeemed_at: string | null;
  campaign: { title: string; fulfillment: string; sponsor: { name: string } | null } | null;
  profile: { firstname: string | null; lastname: string | null; mobile: string | null; email: string | null } | null;
  kid: { first_name: string; member_id: string | null } | null;
  code: { code: string } | null;
}

const FILTERS = [['won', 'Ενεργά'], ['redeemed', 'Εξαργυρωμένα'], ['expired', 'Ληγμένα'], ['revoked', 'Ανακλημένα'], ['all', 'Όλα']] as const;
type Filter = (typeof FILTERS)[number][0];

export function AwardsTable({ rows }: { rows: AwardRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('won');
  const data = useMemo(() => rows.filter((r) => (filter === 'all' ? true : r.status === filter)), [rows, filter]);
  const refresh = () => router.refresh();

  const exportCsv = () => {
    const head = ['Κατάσταση', 'Χορηγός', 'Καμπάνια', 'Μέλος', 'Παιδί', 'Αρ. μέλους', 'Κινητό', 'Κωδικός', 'Κέρδισε', 'Λήγει', 'Εξαργυρώθηκε'];
    const lines = data.map((r) => [
      r.status, r.campaign?.sponsor?.name ?? '', r.campaign?.title ?? '',
      `${r.profile?.firstname ?? ''} ${r.profile?.lastname ?? ''}`.trim(), r.kid?.first_name ?? '', r.kid?.member_id ?? '',
      r.profile?.mobile ?? '', r.code?.code ?? '', fmtDateTime(r.won_at),
      r.expires_at ? fmtDateTime(r.expires_at) : '', r.redeemed_at ? fmtDateTime(r.redeemed_at) : '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `δώρα-χορηγών-${filter}.csv` });
    a.click();
  };

  const columns: ColumnDef<AwardRow, unknown>[] = [
    { id: 'gift', header: 'Δώρο', accessorFn: (r) => `${r.campaign?.title ?? ''} ${r.campaign?.sponsor?.name ?? ''}`,
      cell: ({ row }) => <div><p className="font-medium">{row.original.campaign?.title ?? '—'}</p><p className="text-xs text-muted-foreground">{row.original.campaign?.sponsor?.name}</p></div> },
    { id: 'member', header: 'Μέλος', accessorFn: (r) => `${r.profile?.firstname ?? ''} ${r.profile?.lastname ?? ''} ${r.profile?.mobile ?? ''} ${r.kid?.first_name ?? ''} ${r.kid?.member_id ?? ''}`,
      cell: ({ row }) => <div><p>{row.original.profile?.firstname} {row.original.profile?.lastname}{row.original.kid ? <span className="text-muted-foreground"> · {row.original.kid.first_name}{row.original.kid.member_id ? ` (#${row.original.kid.member_id})` : ''}</span> : null}</p>
        <p className="text-xs text-muted-foreground">{row.original.profile?.mobile}</p></div> },
    { id: 'code', header: 'Κωδικός', accessorFn: (r) => r.code?.code ?? '',
      cell: ({ getValue }) => { const c = getValue() as string; return c ? <span className="font-mono text-xs">{c}</span> : <span className="text-muted-foreground">—</span>; } },
    { accessorKey: 'won_at', header: 'Κέρδισε', cell: ({ getValue }) => fmtDateTime(getValue() as string) },
    { id: 'expires', header: 'Λήγει', accessorFn: (r) => r.expires_at ?? '',
      cell: ({ row }) => { const e = row.original.expires_at; if (!e) return <span className="text-muted-foreground">—</span>;
        const soon = row.original.status === 'won' && new Date(e).getTime() - Date.now() < 3 * 86400_000;
        return <span className={soon ? 'text-red-700 font-medium' : ''}>{fmtDateTime(e)}</span>; } },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }) => {
      const { id, status } = row.original;
      if (status !== 'won') return null;
      return (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <ConfirmButton size="sm" variant="outline" title="Εξαργύρωση δώρου;" description="Επιβεβαίωσε ότι το δώρο παραδόθηκε στο μέλος." successMessage="Εξαργυρώθηκε"
            onConfirm={async () => { const r = await redeemAward(id); if (r.ok) refresh(); return r; }}>Εξαργύρωση</ConfirmButton>
          <ConfirmButton size="sm" variant="destructive" title="Ανάκληση δώρου;" description="Το δώρο ακυρώνεται και το απόθεμα επιστρέφει. Μόνο για διαχειριστές." successMessage="Ανακλήθηκε"
            onConfirm={async () => { const r = await revokeAward(id); if (r.ok) refresh(); return r; }}>Ανάκληση</ConfirmButton>
        </div>
      );
    } },
  ];

  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Αναζήτηση μέλους / αρ. μέλους / καμπάνιας…" emptyText="Δεν υπάρχουν δώρα σε αυτή την κατηγορία."
      toolbar={<div className="flex flex-wrap gap-1 items-center">
        {FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button>
      </div>} />
  );
}
