'use client';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtDate, fmtNum } from '@/lib/format';
import { FULFILLMENT_LABEL, QUOTA_LABEL, TRIGGER_LABEL } from './constants';

export interface CampaignRow {
  id: string; title: string; status: string; trigger: string; fulfillment: string;
  quota_mode: string; quota_amount: number; per_user_limit: number;
  starts_at: string | null; ends_at: string | null; expiry_days: number | null;
  sponsor: { name: string; logo_path: string | null } | null;
  remaining: number;
}

export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();
  const columns: ColumnDef<CampaignRow, unknown>[] = [
    { id: 'title', header: 'Καμπάνια', accessorFn: (r) => `${r.title} ${r.sponsor?.name ?? ''}`,
      cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground">{row.original.sponsor?.name}</p></div> },
    { accessorKey: 'trigger', header: 'Πώς κερδίζεται', cell: ({ getValue }) => TRIGGER_LABEL[getValue() as string] ?? getValue() },
    { id: 'stock', header: 'Απόθεμα', accessorFn: (r) => r.remaining,
      cell: ({ row }) => <div className="tabular-nums"><span className={row.original.remaining === 0 ? 'text-red-700 font-semibold' : 'font-medium'}>{fmtNum(row.original.remaining)}</span>
        <span className="text-muted-foreground"> / {fmtNum(row.original.quota_amount)} {QUOTA_LABEL[row.original.quota_mode]}</span></div> },
    { accessorKey: 'fulfillment', header: 'Παράδοση', cell: ({ getValue }) => FULFILLMENT_LABEL[getValue() as string] ?? getValue() },
    { id: 'window', header: 'Διάρκεια', accessorFn: (r) => r.starts_at ?? '',
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.starts_at || row.original.ends_at
        ? `${row.original.starts_at ? fmtDate(row.original.starts_at) : '…'} – ${row.original.ends_at ? fmtDate(row.original.ends_at) : '…'}` : 'Χωρίς όριο'}</span> },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];
  return <DataTable columns={columns} data={rows} onRowClick={(r) => router.push(`/sponsors/campaigns/${r.id}`)} searchPlaceholder="Αναζήτηση καμπάνιας…" emptyText="Δεν υπάρχουν καμπάνιες ακόμη." />;
}
