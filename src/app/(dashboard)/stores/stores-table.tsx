'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { mediaUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';

export interface StoreRow {
  id: string; name: string; phone: string | null; city: string | null; logo_url: string | null; status: string; sort_order: number;
  category_id: number | null; category_name: string | null; discounts: { value: number; description: string }[];
}

export function discountSummary(d: { value: number; description: string }[]) {
  if (!d.length) return '—';
  return d.map((x) => `${x.value}% ${x.description || 'Έκπτωση'}`).join(' · ');
}

export function StoresTable({ rows, categories }: { rows: StoreRow[]; categories: { id: number; name: string }[] }) {
  const router = useRouter();
  const [cat, setCat] = useState<number | 'all'>('all');
  const data = useMemo(() => rows.filter((r) => cat === 'all' || r.category_id === cat), [rows, cat]);

  const columns: ColumnDef<StoreRow, unknown>[] = [
    { id: 'logo', header: '', cell: ({ row }) => row.original.logo_url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(row.original.logo_url)} alt="" className="h-10 w-10 rounded object-contain bg-white border" /> : <div className="h-10 w-10 rounded bg-muted" />, enableSorting: false },
    { accessorKey: 'name', header: 'Όνομα', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-muted-foreground">{row.original.city}</p></div> },
    { accessorKey: 'category_name', header: 'Κατηγορία', cell: ({ getValue }) => (getValue() as string | null) ?? <span className="text-muted-foreground">—</span> },
    { accessorKey: 'phone', header: 'Τηλέφωνο', cell: ({ getValue }) => (getValue() as string | null) ?? '—' },
    { id: 'discounts', header: 'Εκπτώσεις', accessorFn: (r) => discountSummary(r.discounts), cell: ({ row }) => <span className="text-sm">{discountSummary(row.original.discounts)}</span> },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];

  return (
    <DataTable columns={columns} data={data} onRowClick={(r) => router.push(`/stores/${r.id}`)} searchPlaceholder="Αναζήτηση καταστήματος…"
      toolbar={<div className="flex flex-wrap gap-1">
        <Button size="sm" variant={cat === 'all' ? 'default' : 'outline'} onClick={() => setCat('all')}>Όλα</Button>
        {categories.map((c) => <Button key={c.id} size="sm" variant={cat === c.id ? 'default' : 'outline'} onClick={() => setCat(c.id)}>{c.name}</Button>)}
      </div>} />
  );
}
