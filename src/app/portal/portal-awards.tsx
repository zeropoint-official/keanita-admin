'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Button } from '@/components/ui/button';
import { fmtDateTime } from '@/lib/format';
import { portalRedeemAward } from './actions';

export interface PortalAwardRow {
  id: string; status: string; won_at: string; expires_at: string | null; redeemed_at: string | null;
  member_id: string | null; kid_first_name: string | null; campaign_id: string; campaign_title: string;
}

const FILTERS = [['won', 'Ενεργά'], ['redeemed', 'Εξαργυρωμένα'], ['all', 'Όλα']] as const;
type Filter = (typeof FILTERS)[number][0];

export function PortalAwards({ rows }: { rows: PortalAwardRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('won');
  const data = useMemo(() => rows.filter((r) => (filter === 'all' ? true : r.status === filter)), [rows, filter]);

  const columns: ColumnDef<PortalAwardRow, unknown>[] = [
    { id: 'member', header: 'Μέλος', accessorFn: (r) => `${r.member_id ?? ''} ${r.kid_first_name ?? ''}`,
      cell: ({ row }) => <div>
        <p className="font-medium tabular-nums">{row.original.member_id ? `#${row.original.member_id}` : '—'}</p>
        <p className="text-xs text-muted-foreground">{row.original.kid_first_name ?? ''}</p>
      </div> },
    { accessorKey: 'campaign_title', header: 'Δώρο' },
    { accessorKey: 'won_at', header: 'Κέρδισε', cell: ({ getValue }) => fmtDateTime(getValue() as string) },
    { id: 'expires', header: 'Λήγει', accessorFn: (r) => r.expires_at ?? '',
      cell: ({ getValue }) => { const e = getValue() as string; return e ? fmtDateTime(e) : <span className="text-muted-foreground">—</span>; } },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: 'actions', header: '', enableSorting: false, cell: ({ row }) => row.original.status === 'won' ? (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <ConfirmButton size="sm" title="Εξαργύρωση δώρου;" description="Επιβεβαίωσε ότι παρέδωσες το δώρο στο μέλος." successMessage="Εξαργυρώθηκε"
          onConfirm={async () => { const r = await portalRedeemAward(row.original.id); if (r.ok) router.refresh(); return r; }}>
          Εξαργύρωση
        </ConfirmButton>
      </div>
    ) : null },
  ];

  return (
    <DataTable columns={columns} data={data} searchPlaceholder="Αναζήτηση με αριθμό μέλους…" emptyText="Δεν υπάρχουν δώρα σε αυτή την κατηγορία."
      toolbar={<div className="flex flex-wrap gap-1 items-center">
        {FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}
      </div>} />
  );
}
