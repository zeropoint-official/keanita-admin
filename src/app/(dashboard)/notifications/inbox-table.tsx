'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Mail, Archive, CheckCheck, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { fmtDateTime, fmtAgo } from '@/lib/format';
import { setContactStatus } from './actions';

export interface ContactRow { id: string; name: string; email: string; subject: string | null; message: string; status: string; created_at: string; user_id: string | null }
type Status = 'new' | 'read' | 'replied' | 'archived';
const FILTERS = [['all', 'Όλα'], ['new', 'Νέα'], ['read', 'Διαβασμένα'], ['replied', 'Απαντημένα'], ['archived', 'Αρχείο']] as const;

export function InboxTable({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const data = useMemo(() => rows.filter((r) => filter === 'all' ? r.status !== 'archived' : r.status === filter), [rows, filter]);
  const current = rows.find((r) => r.id === openId) ?? null;

  const change = (id: string, status: Status, silent = false) => start(async () => {
    const r = await setContactStatus(id, status);
    if (!r.ok) { toast.error(r.error); return; }
    if (!silent) toast.success('Ενημερώθηκε'); router.refresh();
  });

  const open = (r: ContactRow) => { setOpenId(r.id); if (r.status === 'new') change(r.id, 'read', true); };

  const columns: ColumnDef<ContactRow, unknown>[] = [
    { accessorKey: 'name', header: 'Όνομα', cell: ({ row }) => <span className={row.original.status === 'new' ? 'font-semibold' : ''}>{row.original.name}</span> },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'subject', header: 'Θέμα', cell: ({ row }) => <div><p>{row.original.subject || '—'}</p><p className="text-xs text-muted-foreground line-clamp-1 max-w-md">{row.original.message}</p></div> },
    { accessorKey: 'created_at', header: 'Ημερομηνία', cell: ({ getValue }) => <span title={fmtDateTime(getValue() as string)}>{fmtAgo(getValue() as string)}</span> },
    { accessorKey: 'status', header: 'Κατάσταση', cell: ({ getValue }) => <StatusBadge value={getValue() as string} /> },
  ];

  const mailto = current ? `mailto:${current.email}?subject=${encodeURIComponent(`Re: ${current.subject || 'Το μήνυμά σας στην Keanita'}`)}` : '#';

  return (
    <>
      <DataTable columns={columns} data={data} onRowClick={open} searchPlaceholder="Αναζήτηση μηνύματος…" emptyText="Δεν υπάρχουν μηνύματα."
        toolbar={<div className="flex gap-1">{FILTERS.map(([k, l]) => <Button key={k} size="sm" variant={filter === k ? 'default' : 'outline'} onClick={() => setFilter(k)}>{l}</Button>)}</div>} />
      <Sheet open={!!current} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {current && (
            <>
              <SheetHeader>
                <SheetTitle>{current.subject || 'Μήνυμα επικοινωνίας'}</SheetTitle>
                <SheetDescription>
                  {current.name} · <a className="underline" href={`mailto:${current.email}`}>{current.email}</a><br />
                  {fmtDateTime(current.created_at)} · <StatusBadge value={current.status} />
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 whitespace-pre-wrap text-sm leading-relaxed">{current.message}</div>
              <div className="mt-auto flex flex-wrap gap-2 border-t p-4">
                <Button render={<a href={mailto} />} className="bg-[#E60C10] hover:bg-[#c50a0d]" onClick={() => { if (current.status !== 'replied') change(current.id, 'replied'); }}><Mail className="h-4 w-4 mr-1" />Απάντηση με email</Button>
                {current.status !== 'read' && <Button variant="outline" disabled={pending} onClick={() => change(current.id, 'read')}><Eye className="h-4 w-4 mr-1" />Διαβάστηκε</Button>}
                {current.status !== 'replied' && <Button variant="outline" disabled={pending} onClick={() => change(current.id, 'replied')}><CheckCheck className="h-4 w-4 mr-1" />Απαντήθηκε</Button>}
                {current.status !== 'archived' && <Button variant="outline" disabled={pending} onClick={() => { change(current.id, 'archived'); setOpenId(null); }}><Archive className="h-4 w-4 mr-1" />Αρχειοθέτηση</Button>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
