'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { Field } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate, fmtNum } from '@/lib/format';
import { createQrBatch, fetchQrBatchCodes, type BatchInput } from './actions';

export interface QrBatch { batch: string; count: number; used: number; scans: number; points: number; max_uses: number; product: string | null; expires_at: string | null; created_at: string }

const NONE = '__none__';

function NewBatchDialog({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<BatchInput>({ defaultValues: { batch: '', product_id: null, points: 20, quantity: 100, max_uses: 1, expires_at: null } });

  const onSubmit = (values: BatchInput) => start(async () => {
    const r = await createQrBatch({ ...values, expires_at: values.expires_at || null });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(`Δημιουργήθηκαν ${r.data} κωδικοί`);
    reset(); setOpen(false); router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="bg-[#E60C10] hover:bg-[#c50a0d]" />}><Plus className="h-4 w-4 mr-1" />Νέα παρτίδα</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader><DialogTitle>Νέα παρτίδα QR</DialogTitle><DialogDescription>Δημιουργεί τυχαίους κωδικούς για εκτύπωση σε συσκευασίες.</DialogDescription></DialogHeader>
          <Field label="Όνομα παρτίδας" required error={errors.batch?.message}><Input placeholder="π.χ. 2026-09-portokali" {...register('batch')} /></Field>
          <Field label="Προϊόν">
            <Controller control={control} name="product_id" render={({ field }) => (
              <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value={NONE}>— Κανένα —</SelectItem>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Πόντοι" error={errors.points?.message}><Input type="number" min={1} {...register('points')} /></Field>
            <Field label="Πλήθος" error={errors.quantity?.message}><Input type="number" min={1} max={5000} {...register('quantity')} /></Field>
            <Field label="Χρήσεις/κωδ."><Input type="number" min={1} {...register('max_uses')} /></Field>
          </div>
          <Field label="Λήξη" hint="Κενό = χωρίς λήξη"><Input type="date" {...register('expires_at')} /></Field>
          <DialogFooter><Button type="submit" disabled={pending} className="bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Δημιουργία…' : 'Δημιουργία'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function QrBatches({ rows, products }: { rows: QrBatch[]; products: { id: string; name: string }[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const exportCsv = async (batch: string) => {
    setBusy(batch);
    const r = await fetchQrBatchCodes(batch);
    setBusy(null);
    if (!r.ok) { toast.error(r.error); return; }
    const lines = (r.data ?? []).map((c) => [c.code, `keanita://qr/${c.code}`, c.uses, c.max_uses].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + ['code,url,uses,max_uses', ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `qr-${batch}.csv` });
    a.click();
  };

  const columns: ColumnDef<QrBatch, unknown>[] = [
    { accessorKey: 'batch', header: 'Παρτίδα', cell: ({ row }) => <div><p className="font-medium font-mono">{row.original.batch}</p><p className="text-xs text-muted-foreground">{row.original.product ?? 'Χωρίς προϊόν'}</p></div> },
    { accessorKey: 'points', header: 'KP' },
    { accessorKey: 'count', header: 'Κωδικοί', cell: ({ getValue }) => fmtNum(getValue() as number) },
    { accessorKey: 'used', header: 'Χρησιμοποιημένοι', cell: ({ row }) => <span>{fmtNum(row.original.used)} <span className="text-xs text-muted-foreground">({row.original.count ? Math.round((row.original.used / row.original.count) * 100) : 0}%) · {fmtNum(row.original.scans)} σαρώσεις</span></span> },
    { accessorKey: 'max_uses', header: 'Χρήσεις/κωδ.' },
    { accessorKey: 'expires_at', header: 'Λήξη', cell: ({ getValue }) => fmtDate(getValue() as string | null) },
    { accessorKey: 'created_at', header: 'Δημιουργία', cell: ({ getValue }) => fmtDate(getValue() as string) },
    { id: 'export', header: '', enableSorting: false, cell: ({ row }) => <Button variant="outline" size="sm" disabled={busy === row.original.batch} onClick={() => exportCsv(row.original.batch)}><Download className="h-4 w-4 mr-1" />CSV</Button> },
  ];

  return <DataTable columns={columns} data={rows} searchPlaceholder="Αναζήτηση παρτίδας…" emptyText="Δεν υπάρχουν παρτίδες QR ακόμη." toolbar={<NewBatchDialog products={products} />} />;
}
