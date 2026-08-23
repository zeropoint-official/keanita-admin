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
import { saveCharacter, type CharacterInput } from './actions';

const DEFAULTS: CharacterInput = {
  name: '', slug: '', tagline: '', description: '', best_friend: '', power: '', favorite_juice: '', image_url: null,
  accent_color: '#E60C10', bg_color: '#FFF0EE', status: 'draft', sort_order: 0,
};

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function CharacterForm({ id, initial }: { id: number | null; initial?: Partial<CharacterInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, getValues, setValue, formState: { errors } } = useForm<CharacterInput>({ defaultValues: { ...DEFAULTS, ...initial } });

  const onSubmit = (values: CharacterInput) => start(async () => {
    const r = await saveCharacter(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/characters/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Όνομα" required error={errors.name?.message}>
              <Input {...register('name', { onBlur: () => { if (!id && !getValues('slug')) setValue('slug', slugify(getValues('name'))); } })} />
            </Field>
            <Field label="Slug" required error={errors.slug?.message} hint="Μόνο λατινικά πεζά, αριθμοί και παύλες"><Input {...register('slug')} className="font-mono" /></Field>
            <Field label="Σύντομη φράση" className="sm:col-span-2"><Input {...register('tagline')} /></Field>
            <Field label="Περιγραφή" className="sm:col-span-2"><Textarea rows={5} {...register('description')} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ταυτότητα ήρωα</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Καλύτερος φίλος"><Input {...register('best_friend')} /></Field>
            <Field label="Υπερδύναμη"><Input {...register('power')} /></Field>
            <Field label="Αγαπημένος χυμός"><Input {...register('favorite_juice')} /></Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Εικόνα</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="image_url" render={({ field }) => <ImageUpload bucket="characters" aspect="aspect-square" value={field.value} onChange={field.onChange} />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Χρώματα</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Κύριο"><Controller control={control} name="accent_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
            <Field label="Φόντο"><Controller control={control} name="bg_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Δημοσίευση</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Κατάσταση">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Σειρά εμφάνισης"><Input type="number" min={0} {...register('sort_order')} /></Field>
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
