'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { mediaUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';

export interface ActivityRow {
  id: string; kind: 'puzzle' | 'download'; title: string; category: string | null; image_url: string | null; file_url: string; status: string; sort_order: number;
}

const FILTERS = [['all', 'Όλα'], ['puzzle', 'Χρωμοσελίδες'], ['download', 'Λήψεις PDF']] as const;

export function ActivitiesTable({ rows }: { rows: ActivityRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const data = useMemo(() => rows.filter((r) => filter === 'all' || r.kind === filter), [rows, filter]);

  const columns: ColumnDef<ActivityRow, unknown>[] = [
    { id: 'image', header: '', cell: ({ row }) => row.original.image_url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(row.original.image_url)} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-muted" />, enableSorting: false },
    { accessorKey: 'title', header: 'Τίτλος', cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground truncate max-w-[240px]">{row.original.file_url.split('/').pop()}</p></div> },
    { accessorKey: 'kind', header: 'Τύπος', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { accessorKey: 'category', header: 'Κατηγορία', cell: ({ getValue }) => (getValue() as string | null) ?? <span className="text-muted-foreground">—</span> },
    { accessorKey: 'sort_order', header: 'Σειρά' },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];

  return (
    <DataTable columns={columns} data={data} onRowClick={(r) => router.push(`/activities/${r.id}`)} searchPlaceholder="Αναζήτηση δραστηριότητας…"
      toolbar={<div className="flex gap-1">{FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}</div>} />
  );
}
