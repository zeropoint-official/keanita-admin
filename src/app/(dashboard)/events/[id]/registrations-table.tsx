'use client';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { fmtDateTime, ageOf } from '@/lib/format';
import { toggleCheckIn } from '../actions';

interface Reg {
  id: string; created_at: string; checked_in_at: string | null;
  kid: { first_name: string; last_name: string | null; dob: string; member_id: string | null } | null;
  parent: { firstname: string | null; lastname: string | null; mobile: string | null; email: string | null } | null;
}

export function RegistrationsTable({ rows, eventTitle }: { rows: Reg[]; eventTitle: string }) {
  const router = useRouter();
  const exportCsv = () => {
    const head = ['Παιδί', 'Ηλικία', 'Αρ. μέλους', 'Γονέας', 'Κινητό', 'Email', 'Δήλωση', 'Check-in'];
    const lines = rows.map((r) => [
      `${r.kid?.first_name ?? ''} ${r.kid?.last_name ?? ''}`.trim(), ageOf(r.kid?.dob) ?? '', r.kid?.member_id ?? '',
      `${r.parent?.firstname ?? ''} ${r.parent?.lastname ?? ''}`.trim(), r.parent?.mobile ?? '', r.parent?.email ?? '',
      fmtDateTime(r.created_at), r.checked_in_at ? 'Ναι' : 'Όχι',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${eventTitle}-συμμετοχές.csv` });
    a.click();
  };

  const columns: ColumnDef<Reg, unknown>[] = [
    { id: 'checkin', header: 'Check-in', cell: ({ row }) => <Checkbox checked={!!row.original.checked_in_at} onCheckedChange={async (v) => { await toggleCheckIn(row.original.id, !!v); router.refresh(); }} />, enableSorting: false },
    { id: 'kid', header: 'Παιδί', accessorFn: (r) => `${r.kid?.first_name ?? ''} ${r.kid?.last_name ?? ''}`, cell: ({ row }) => <div><p className="font-medium">{row.original.kid ? `${row.original.kid.first_name} ${row.original.kid.last_name ?? ''}` : '—'}</p><p className="text-xs text-muted-foreground">{row.original.kid?.member_id} · {ageOf(row.original.kid?.dob) ?? '?'} ετών</p></div> },
    { id: 'parent', header: 'Γονέας', accessorFn: (r) => `${r.parent?.firstname ?? ''} ${r.parent?.lastname ?? ''} ${r.parent?.mobile ?? ''}`, cell: ({ row }) => <div><p>{row.original.parent?.firstname} {row.original.parent?.lastname}</p><p className="text-xs text-muted-foreground">{row.original.parent?.mobile} · {row.original.parent?.email}</p></div> },
    { accessorKey: 'created_at', header: 'Δήλωση', cell: ({ getValue }) => fmtDateTime(getValue() as string) },
  ];

  return <DataTable columns={columns} data={rows} emptyText="Καμία συμμετοχή ακόμη." toolbar={<Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Εξαγωγή CSV</Button>} />;
}
