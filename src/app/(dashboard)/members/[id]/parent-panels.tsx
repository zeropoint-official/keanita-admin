'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/shared/form-field';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { adjustPoints, setParentActive, updateParent } from '../actions';

export function ParentActions({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  return isActive ? (
    <ConfirmButton variant="outline" title="Απενεργοποίηση λογαριασμού;" description="Ο γονέας δεν θα μπορεί να συνδεθεί στην εφαρμογή μέχρι να ενεργοποιηθεί ξανά."
      onConfirm={async () => { const r = await setParentActive(id, false); router.refresh(); return r; }}>Απενεργοποίηση</ConfirmButton>
  ) : (
    <ConfirmButton variant="outline" title="Ενεργοποίηση λογαριασμού;" onConfirm={async () => { const r = await setParentActive(id, true); router.refresh(); return r; }}>Ενεργοποίηση</ConfirmButton>
  );
}

type ParentValues = { firstname: string; lastname: string; mobile: string; district: string; city: string };
export function ParentForm({ id, initial, legacyId }: { id: string; initial: ParentValues; legacyId: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, handleSubmit } = useForm<ParentValues>({ defaultValues: initial });
  return (
    <Card className="max-w-2xl"><CardHeader><CardTitle>Στοιχεία γονέα</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((v) => start(async () => { const r = await updateParent(id, v); if (r.ok) { toast.success('Αποθηκεύτηκε'); router.refresh(); } else toast.error(r.error); }))} className="grid gap-4 sm:grid-cols-2">
          <Field label="Όνομα"><Input {...register('firstname')} /></Field>
          <Field label="Επώνυμο"><Input {...register('lastname')} /></Field>
          <Field label="Κινητό"><Input {...register('mobile')} /></Field>
          <Field label="Επαρχία"><Input {...register('district')} /></Field>
          <Field label="Πόλη"><Input {...register('city')} /></Field>
          <Field label="Παλιό ID" hint="Από την παλιά εφαρμογή"><Input value={legacyId ?? '—'} disabled /></Field>
          <div className="sm:col-span-2"><Button type="submit" disabled={pending} className="bg-[#E60C10] hover:bg-[#c50a0d]">Αποθήκευση</Button></div>
        </form>
      </CardContent></Card>
  );
}

export function PointsAdjust({ id }: { id: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();
  return (
    <Card><CardHeader><CardTitle>Χειροκίνητη προσαρμογή</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Field label="Ποσό KP" hint="Θετικό = προσθήκη, αρνητικό = αφαίρεση"><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Αιτιολογία" required><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="π.χ. Δώρο διαγωνισμού Πάσχα" /></Field>
        <Button disabled={pending || !amount || !note} className="w-full" variant="outline" onClick={() => start(async () => {
          const r = await adjustPoints(id, Number(amount), note);
          if (r.ok) { toast.success('Καταχωρήθηκε'); setAmount(''); setNote(''); router.refresh(); } else toast.error(r.error);
        })}>Καταχώρηση</Button>
        <p className="text-xs text-muted-foreground">Μόνο διαχειριστές. Καταγράφεται στο ιστορικό.</p>
      </CardContent></Card>
  );
}
