'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import { ColorField } from '@/components/shared/color-field';
import { PairListEditor, StringListEditor } from '@/components/shared/list-editor';
import { saveProduct, type ProductInput } from './actions';

const DEFAULTS: ProductInput = {
  name: '', category: 'juice', tagline: '', description: '', image_url: null, accent_color: '#F5820D', bg_color: '#FFF4E5',
  serving_size: '', highlights: [], ingredients: [], nutrition: [], status: 'draft', sort_order: 0,
};

export function ProductForm({ id, initial }: { id: string | null; initial?: Partial<ProductInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<ProductInput>({ defaultValues: { ...DEFAULTS, ...initial } });

  const onSubmit = (values: ProductInput) => start(async () => {
    const r = await saveProduct(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/products/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Όνομα" required error={errors.name?.message} className="sm:col-span-2"><Input {...register('name')} /></Field>
            <Field label="Κατηγορία">
              <Controller control={control} name="category" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="juice">Χυμός</SelectItem><SelectItem value="yogurt">Γιαούρτι</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Κατάσταση">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Σύντομη φράση" hint="Εμφανίζεται κάτω από το όνομα" className="sm:col-span-2"><Input {...register('tagline')} /></Field>
            <Field label="Περιγραφή" className="sm:col-span-2"><Textarea rows={5} {...register('description')} /></Field>
            <Field label="Μερίδα" hint="π.χ. 250ml"><Input {...register('serving_size')} /></Field>
            <Field label="Σειρά εμφάνισης"><Input type="number" min={0} {...register('sort_order')} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Χαρακτηριστικά</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="highlights" render={({ field }) => (
              <StringListEditor value={field.value ?? []} onChange={field.onChange} placeholder="Χωρίς προσθήκη ζάχαρης" />)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Συστατικά</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="ingredients" render={({ field }) => (
              <StringListEditor value={field.value ?? []} onChange={field.onChange} placeholder="Πορτοκάλι" />)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Διατροφικά στοιχεία</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="nutrition" render={({ field }) => (
              <PairListEditor value={field.value ?? []} onChange={field.onChange} keys={['label', 'value']} placeholders={['Ενέργεια', '45 kcal']} />)} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Εικόνα</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="image_url" render={({ field }) => <ImageUpload bucket="products" aspect="aspect-square" value={field.value} onChange={field.onChange} />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Χρώματα</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Κύριο"><Controller control={control} name="accent_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
            <Field label="Φόντο"><Controller control={control} name="bg_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
