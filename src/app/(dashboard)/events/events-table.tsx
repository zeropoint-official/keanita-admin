'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtDate, todayLocal } from '@/lib/format';
import { mediaUrl } from '@/lib/storage';
import { Button } from '@/components/ui/button';

export interface EventRow {
  id: string; type: string; title: string; date: string; time_label: string | null; location: string | null;
  image_url: string | null; status: string; show_on_home: boolean; registrations: number;
}

const FILTERS = [['all', 'Όλα'], ['upcoming', 'Επερχόμενα'], ['past', 'Παρελθόντα'], ['draft', 'Πρόχειρα']] as const;

export function EventsTable({ rows }: { rows: EventRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('upcoming');
  const today = todayLocal();
  const data = useMemo(() => rows.filter((r) =>
    filter === 'all' ? true : filter === 'draft' ? r.status === 'draft' : filter === 'upcoming' ? r.date >= today && r.status !== 'archived' : r.date < today), [rows, filter, today]);

  const columns: ColumnDef<EventRow, unknown>[] = [
    { id: 'image', header: '', cell: ({ row }) => row.original.image_url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(row.original.image_url)} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-muted" />, enableSorting: false },
    { accessorKey: 'title', header: 'Τίτλος', cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground">{row.original.location}</p></div> },
    { accessorKey: 'type', header: 'Τύπος', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { accessorKey: 'date', header: 'Ημερομηνία', cell: ({ row }) => <span>{fmtDate(row.original.date)}<span className="text-muted-foreground text-xs ml-1">{row.original.time_label}</span></span> },
    { accessorKey: 'registrations', header: 'Συμμετοχές' },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];

  return (
    <DataTable columns={columns} data={data} onRowClick={(r) => router.push(`/events/${r.id}`)} searchPlaceholder="Αναζήτηση εκδήλωσης…"
      toolbar={<div className="flex gap-1">{FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}</div>} />
  );
}
