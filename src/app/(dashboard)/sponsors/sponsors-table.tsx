'use client';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { mediaUrl } from '@/lib/storage';

export interface SponsorRow {
  id: string; name: string; logo_path: string | null; brand_color: string | null;
  status: string; contact_name: string | null; contact_email: string | null;
}

export function SponsorsTable({ rows }: { rows: SponsorRow[] }) {
  const router = useRouter();
  const columns: ColumnDef<SponsorRow, unknown>[] = [
    { id: 'logo', header: '', enableSorting: false, cell: ({ row }) => row.original.logo_path
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(row.original.logo_path)} alt="" className="h-10 w-16 rounded border bg-white object-contain p-1" />
      : <div className="h-10 w-16 rounded bg-muted grid place-items-center text-xl">🤝</div> },
    { accessorKey: 'name', header: 'Χορηγός', cell: ({ row }) => <div className="flex items-center gap-2">
        {row.original.brand_color && <span className="h-3 w-3 rounded-full border border-black/10" style={{ background: row.original.brand_color }} />}
        <span className="font-medium">{row.original.name}</span>
      </div> },
    { id: 'contact', header: 'Επαφή', accessorFn: (r) => `${r.contact_name ?? ''} ${r.contact_email ?? ''}`,
      cell: ({ row }) => <div><p>{row.original.contact_name ?? '—'}</p><p className="text-xs text-muted-foreground">{row.original.contact_email}</p></div> },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];
  return <DataTable columns={columns} data={rows} onRowClick={(r) => router.push(`/sponsors/${r.id}`)} searchPlaceholder="Αναζήτηση χορηγού…" emptyText="Δεν υπάρχουν χορηγοί ακόμη." />;
}
