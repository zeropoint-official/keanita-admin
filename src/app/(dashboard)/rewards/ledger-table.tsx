'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { fmtDateTime, fmtNum } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface LedgerRow { id: number; amount: number; reason: string; label: string; created_at: string; profiles: { firstname: string | null; lastname: string | null } | null }

const REASON: Record<string, string> = {
  daily_login: 'Είσοδος', streak_bonus: 'Σερί', game: 'Παιχνίδι', event_rsvp: 'Εκδήλωση', profile_complete: 'Προφίλ', qr_scan: 'QR',
  gift_redeem: 'Δώρο', refund: 'Επιστροφή', manual: 'Χειροκίνητο', birthday: 'Γενέθλια', expiry: 'Λήξη',
};

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  const columns: ColumnDef<LedgerRow, unknown>[] = [
    { id: 'member', header: 'Μέλος', accessorFn: (r) => `${r.profiles?.firstname ?? ''} ${r.profiles?.lastname ?? ''}`, cell: ({ getValue }) => <span className="font-medium">{(getValue() as string).trim() || '—'}</span> },
    { accessorKey: 'amount', header: 'Πόντοι', cell: ({ getValue }) => { const a = getValue() as number; return <span className={cn('font-semibold tabular-nums', a >= 0 ? 'text-green-700' : 'text-red-700')}>{a >= 0 ? '+' : '−'}{fmtNum(Math.abs(a))}</span>; } },
    { accessorKey: 'reason', header: 'Αιτία', cell: ({ getValue }) => <Badge variant="secondary" className="border-0 font-semibold">{REASON[getValue() as string] ?? (getValue() as string)}</Badge> },
    { accessorKey: 'label', header: 'Περιγραφή' },
    { accessorKey: 'created_at', header: 'Ημερομηνία', cell: ({ getValue }) => fmtDateTime(getValue() as string) },
  ];
  return <DataTable columns={columns} data={rows} pageSize={50} searchPlaceholder="Αναζήτηση μέλους / περιγραφής…" emptyText="Δεν υπάρχουν κινήσεις ακόμη." />;
}
