'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { mediaUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';

export interface ProductRow {
  id: string; name: string; category: string; tagline: string | null; image_url: string | null; status: string; sort_order: number;
}

const FILTERS = [['all', 'Όλα'], ['juice', 'Χυμοί'], ['yogurt', 'Γιαούρτια'], ['draft', 'Πρόχειρα']] as const;

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const data = useMemo(() => rows.filter((r) =>
    filter === 'all' ? true : filter === 'draft' ? r.status === 'draft' : r.category === filter), [rows, filter]);

  const columns: ColumnDef<ProductRow, unknown>[] = [
    { id: 'image', header: '', cell: ({ row }) => row.original.image_url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(row.original.image_url)} alt="" className="h-12 w-12 rounded object-contain bg-muted" /> : <div className="h-12 w-12 rounded bg-muted" />, enableSorting: false },
    { accessorKey: 'name', header: 'Όνομα', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.tagline}</p></div> },
    { accessorKey: 'category', header: 'Κατηγορία', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { accessorKey: 'sort_order', header: 'Σειρά' },
  ];

  return (
    <DataTable columns={columns} data={data} onRowClick={(r) => router.push(`/products/${r.id}`)} searchPlaceholder="Αναζήτηση προϊόντος…"
      toolbar={<div className="flex gap-1">{FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}</div>} />
  );
}
