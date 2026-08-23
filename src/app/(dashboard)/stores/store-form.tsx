'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import { saveStore, type StoreInput } from './actions';

const DEFAULTS: StoreInput = {
  name: '', category_id: null, phone: '', website: '', description: '', address: '', city: '', logo_url: null,
  status: 'draft', sort_order: 0, discounts: [],
};

export function StoreForm({ id, initial, categories }: { id: string | null; initial?: Partial<StoreInput>; categories: { id: number; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<StoreInput>({ defaultValues: { ...DEFAULTS, ...initial } });
  const discounts = useFieldArray({ control, name: 'discounts' });

  const onSubmit = (values: StoreInput) => start(async () => {
    const r = await saveStore(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/stores/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Όνομα" required error={errors.name?.message} className="sm:col-span-2"><Input {...register('name')} /></Field>
            <Field label="Κατηγορία">
              <Controller control={control} name="category_id" render={({ field }) => (
                <Select value={field.value ? String(field.value) : 'none'} onValueChange={(v) => field.onChange(v && v !== 'none' ? Number(v) : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Χωρίς κατηγορία —</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>)} />
            </Field>
            <Field label="Κατάσταση">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Τηλέφωνο"><Input {...register('phone')} /></Field>
            <Field label="Ιστοσελίδα" hint="π.χ. https://example.gr"><Input {...register('website')} /></Field>
            <Field label="Διεύθυνση"><Input {...register('address')} /></Field>
            <Field label="Πόλη"><Input {...register('city')} /></Field>
            <Field label="Περιγραφή" className="sm:col-span-2"><Textarea rows={5} {...register('description')} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Εκπτώσεις</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {discounts.fields.map((f, i) => (
              <div key={f.id} className="flex gap-2 items-start">
                <div className="relative w-28">
                  <Input type="number" min={0} max={100} step="0.5" placeholder="15" className="pr-7" {...register(`discounts.${i}.value`)} />
                  <span className="absolute right-2.5 top-2 text-sm text-muted-foreground">%</span>
                </div>
                <Input placeholder="Έκπτωση σε όλα τα προϊόντα" {...register(`discounts.${i}.description`)} />
                <Button type="button" variant="ghost" size="icon" onClick={() => discounts.remove(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {errors.discounts && <p className="text-xs text-destructive">Ελέγξτε τις τιμές των εκπτώσεων.</p>}
            <Button type="button" variant="outline" size="sm" onClick={() => discounts.append({ value: 10, description: 'Έκπτωση' })}><Plus className="h-4 w-4 mr-1" />Προσθήκη έκπτωσης</Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Λογότυπο</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="logo_url" render={({ field }) => <ImageUpload bucket="stores" aspect="aspect-square" label="Ανέβασε λογότυπο" value={field.value} onChange={field.onChange} />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Εμφάνιση</CardTitle></CardHeader>
          <CardContent>
            <Field label="Σειρά" hint="Μικρότερος αριθμός = πιο ψηλά"><Input type="number" {...register('sort_order')} /></Field>
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
