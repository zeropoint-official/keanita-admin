'use client';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { fmtDateTime } from '@/lib/format';

export interface AuditRow { id: number; action: string; entity: string; entity_id: string | null; created_at: string; actor: string }

const ACTION_LABEL: Record<string, string> = {
  create: 'Δημιουργία', update: 'Ενημέρωση', delete: 'Διαγραφή', status: 'Αλλαγή κατάστασης',
  approve: 'Έγκριση', approved: 'Έγκριση', rejected: 'Απόρριψη', expired: 'Λήξη', pending: 'Επαναφορά',
  adjust: 'Προσαρμογή KP', checkin: 'Check-in', activate: 'Ενεργοποίηση', deactivate: 'Απενεργοποίηση',
};
const ENTITY_LABEL: Record<string, string> = {
  events: 'Εκδήλωση', products: 'Προϊόν', stores: 'Κατάστημα', store_categories: 'Κατηγορία', activities: 'Δραστηριότητα',
  characters: 'Χαρακτήρας', home_sliders: 'Slide', gifts: 'Δώρο', redemptions: 'Εξαργύρωση', kids: 'Παιδί', profiles: 'Γονέας',
  points_ledger: 'Πόντοι', app_settings: 'Ρυθμίσεις', pages: 'Σελίδα', staff: 'Προσωπικό', push_campaigns: 'Καμπάνια',
  contact_messages: 'Μήνυμα', reward_rules: 'Κανόνες KP', qr_codes: 'QR', event_registrations: 'Συμμετοχή',
};

export function AuditTab({ rows }: { rows: AuditRow[] }) {
  const columns: ColumnDef<AuditRow, unknown>[] = [
    { accessorKey: 'created_at', header: 'Πότε', cell: ({ getValue }) => fmtDateTime(getValue() as string) },
    { accessorKey: 'actor', header: 'Ποιος' },
    { id: 'what', header: 'Ενέργεια', accessorFn: (r) => r.action, cell: ({ row }) => {
      const verb = row.original.action.split('.').pop() ?? '';
      return <span>{ACTION_LABEL[verb] ?? verb} · {ENTITY_LABEL[row.original.entity] ?? row.original.entity}</span>;
    } },
    { accessorKey: 'entity_id', header: 'ID', cell: ({ getValue }) => <span className="font-mono text-xs text-muted-foreground">{(getValue() as string)?.slice(0, 8) ?? '—'}</span> },
  ];
  return <DataTable columns={columns} data={rows} searchPlaceholder="Αναζήτηση ενέργειας…" emptyText="Καμία καταγεγραμμένη ενέργεια." pageSize={50} />;
}
