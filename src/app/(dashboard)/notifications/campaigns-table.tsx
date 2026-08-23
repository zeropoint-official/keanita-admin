'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtDateTime, fmtNum } from '@/lib/format';
import { cn } from '@/lib/utils';
import { audienceSummary, SOURCE_LABEL, TYPE_LABEL } from './campaign-utils';

export interface CampaignRow {
  id: string; title: string; type: string; source: string; audience: Record<string, unknown>;
  scheduled_at: string | null; sent_at: string | null; status: string; created_at: string;
  sent: number | null; opened: number | null; targeted: number | null;
}

const STATUS_FILTERS = [['all', 'Όλες'], ['draft', 'Πρόχειρα'], ['scheduled', 'Προγραμματισμένες'], ['sent', 'Σταλμένες'], ['failed', 'Αποτυχίες']] as const;
const SOURCE_FILTERS = [['all', 'Όλες οι πηγές'], ['manual', 'Χειροκίνητες'], ['auto', 'Αυτόματες'], ['birthday', 'Γενέθλια'], ['event_reminder', 'Υπενθυμίσεις'], ['event_announce', 'Ανακοινώσεις']] as const;

export function SourceBadge({ value }: { value: string }) {
  const m = SOURCE_LABEL[value] ?? { label: value, cls: 'bg-gray-100 text-gray-700' };
  return <Badge variant="secondary" className={cn('font-semibold border-0', m.cls)}>{m.label}</Badge>;
}

export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number][0]>('all');
  const [source, setSource] = useState<(typeof SOURCE_FILTERS)[number][0]>('all');
  const data = useMemo(() => rows.filter((r) =>
    (status === 'all' || r.status === status) &&
    (source === 'all' || (source === 'auto' ? r.source !== 'manual' : r.source === source))), [rows, status, source]);

  const columns: ColumnDef<CampaignRow, unknown>[] = [
    { accessorKey: 'title', header: 'Τίτλος', cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-muted-foreground">{audienceSummary(row.original.audience)}</p></div> },
    { accessorKey: 'type', header: 'Τύπος', cell: ({ getValue }) => <Badge variant="outline">{TYPE_LABEL[getValue() as string] ?? (getValue() as string)}</Badge> },
    { accessorKey: 'source', header: 'Πηγή', cell: ({ getValue }) => <SourceBadge value={getValue() as string} /> },
    { accessorKey: 'scheduled_at', header: 'Αποστολή', cell: ({ row }) => <span className="text-sm">{fmtDateTime(row.original.sent_at ?? row.original.scheduled_at)}</span> },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
    { id: 'stats', header: 'Στάλθηκαν / Άνοιξαν', accessorFn: (r) => r.sent ?? 0, cell: ({ row }) => row.original.sent == null ? <span className="text-muted-foreground">—</span>
      : <span className="text-sm tabular-nums">{fmtNum(row.original.sent)} / {fmtNum(row.original.opened)}</span> },
  ];

  return (
    <DataTable columns={columns} data={data} onRowClick={(r) => router.push(`/notifications/${r.id}`)} searchPlaceholder="Αναζήτηση καμπάνιας…" emptyText="Δεν υπάρχουν καμπάνιες."
      toolbar={<div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={status === k ? 'default' : 'outline'} onClick={() => setStatus(k)}>{l}</Button>)}
        <span className="mx-1 border-l" />
        {SOURCE_FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={source === k ? 'secondary' : 'ghost'} onClick={() => setSource(k)}>{l}</Button>)}
      </div>} />
  );
}
