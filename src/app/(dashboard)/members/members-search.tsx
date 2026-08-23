'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/shared/data-table';
import { fmtDate, fmtAgo } from '@/lib/format';

export interface ParentRow { id: string; firstname: string | null; lastname: string | null; email: string | null; mobile: string | null; district: string | null; is_active: boolean; created_at: string | null; last_seen_at: string | null; kids: number }

export function MembersSearch({ q, rows }: { q: string; rows: ParentRow[] }) {
  const router = useRouter();
  const [term, setTerm] = useState(q);
  const columns: ColumnDef<ParentRow, unknown>[] = [
    { id: 'name', header: 'Γονέας', accessorFn: (r) => `${r.firstname ?? ''} ${r.lastname ?? ''}`, cell: ({ row }) => <div><p className="font-medium">{row.original.firstname} {row.original.lastname}</p><p className="text-xs text-muted-foreground">{row.original.email}</p></div> },
    { accessorKey: 'mobile', header: 'Κινητό' },
    { accessorKey: 'district', header: 'Επαρχία', cell: ({ getValue }) => (getValue() as string) || '—' },
    { accessorKey: 'kids', header: 'Παιδιά' },
    { accessorKey: 'created_at', header: 'Εγγραφή', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { accessorKey: 'last_seen_at', header: 'Τελευταία σύνδεση', cell: ({ getValue }) => fmtAgo(getValue() as string) },
    { accessorKey: 'is_active', header: '', cell: ({ getValue }) => (getValue() ? null : <Badge variant="destructive">Ανενεργό</Badge>), enableSorting: false },
  ];
  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); router.push(`/members?q=${encodeURIComponent(term)}`); }}>
        <div className="relative w-96"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Αναζήτηση με όνομα, email ή κινητό…" className="pl-8" /></div>
        <Button type="submit" variant="outline">Αναζήτηση</Button>
      </form>
      <p className="text-xs text-muted-foreground">{q ? `Αποτελέσματα για «${q}»` : 'Οι 100 πιο πρόσφατες εγγραφές — χρησιμοποίησε την αναζήτηση για τους υπόλοιπους.'}</p>
      <DataTable columns={columns} data={rows} onRowClick={(r) => router.push(`/members/${r.id}`)} searchPlaceholder="Φιλτράρισμα αποτελεσμάτων…" />
    </div>
  );
}
