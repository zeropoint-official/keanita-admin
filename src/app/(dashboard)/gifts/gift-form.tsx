'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import { ColorField } from '@/components/shared/color-field';
import { saveGift, type GiftInput } from './actions';

const DEFAULTS: GiftInput = {
  name: '', description: '', cost: 100, category: 'physical', emoji: '🎁', image_url: null,
  color: '#E60C10', bg_color: '#FFF0EE', stock: '', requires_approval: true, status: 'draft', sort_order: 0,
};

export function GiftForm({ id, initial }: { id: string | null; initial?: Partial<GiftInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<GiftInput>({ defaultValues: { ...DEFAULTS, ...initial } });

  const onSubmit = (values: GiftInput) => start(async () => {
    const r = await saveGift(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/gifts/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Όνομα" required error={errors.name?.message} className="sm:col-span-2"><Input {...register('name')} /></Field>
            <Field label="Κόστος (KP)" required error={errors.cost?.message}><Input type="number" min={0} {...register('cost')} /></Field>
            <Field label="Κατηγορία">
              <Controller control={control} name="category" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="physical">Φυσικό</SelectItem><SelectItem value="digital">Ψηφιακό</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Emoji" hint="Εμφανίζεται όταν δεν υπάρχει εικόνα"><Input {...register('emoji')} /></Field>
            <Field label="Κατάσταση">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Περιγραφή" className="sm:col-span-2"><Textarea rows={4} {...register('description')} /></Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Εικόνα</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="image_url" render={({ field }) => <ImageUpload bucket="gifts" aspect="aspect-square" value={field.value} onChange={field.onChange} />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Χρώματα</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Κύριο"><Controller control={control} name="color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
            <Field label="Φόντο"><Controller control={control} name="bg_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Διαθεσιμότητα</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Απόθεμα" hint="Κενό = απεριόριστο" error={errors.stock?.message}><Input type="number" min={0} {...register('stock')} /></Field>
            <Field label="Σειρά εμφάνισης"><Input type="number" {...register('sort_order')} /></Field>
            <div className="flex items-center justify-between"><span className="text-sm">Απαιτεί έγκριση</span>
              <Controller control={control} name="requires_approval" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} /></div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
