'use client';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Check, Minus } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtNum } from '@/lib/format';
import { mediaUrl } from '@/lib/storage';

export interface GiftRow { id: string; name: string; cost: number; category: string; emoji: string | null; image_url: string | null; stock: number | null; requires_approval: boolean; status: string; sort_order: number }

export function GiftsTable({ rows }: { rows: GiftRow[] }) {
  const router = useRouter();
  const columns: ColumnDef<GiftRow, unknown>[] = [
    { id: 'image', header: '', enableSorting: false, cell: ({ row }) => row.original.image_url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(row.original.image_url)} alt="" className="h-10 w-10 rounded object-cover" />
      : <div className="h-10 w-10 rounded bg-muted grid place-items-center text-xl">{row.original.emoji ?? '🎁'}</div> },
    { accessorKey: 'name', header: 'Όνομα', cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
    { accessorKey: 'cost', header: 'Κόστος KP', cell: ({ getValue }) => <span className="tabular-nums">{fmtNum(getValue() as number)}</span> },
    { accessorKey: 'category', header: 'Κατηγορία', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { accessorKey: 'stock', header: 'Απόθεμα', cell: ({ getValue }) => { const s = getValue() as number | null; return s == null ? <span className="text-muted-foreground">∞</span> : <span className={s === 0 ? 'text-red-700 font-semibold' : ''}>{fmtNum(s)}</span>; } },
    { accessorKey: 'requires_approval', header: 'Έγκριση', cell: ({ getValue }) => (getValue() ? <Check className="h-4 w-4 text-green-700" /> : <Minus className="h-4 w-4 text-muted-foreground" />) },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];
  return <DataTable columns={columns} data={rows} onRowClick={(r) => router.push(`/gifts/${r.id}`)} searchPlaceholder="Αναζήτηση δώρου…" emptyText="Δεν υπάρχουν δώρα ακόμη." />;
}
