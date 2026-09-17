'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import { ColorField } from '@/components/shared/color-field';
import { saveSponsor, type SponsorInput } from './actions';

const DEFAULTS: SponsorInput = { name: '', logo_path: null, brand_color: '#E60C10', status: 'draft', contact_name: '', contact_email: '' };

export function SponsorForm({ id, initial }: { id: string | null; initial?: Partial<SponsorInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<SponsorInput>({ defaultValues: { ...DEFAULTS, ...initial } });

  const onSubmit = (values: SponsorInput) => start(async () => {
    const r = await saveSponsor(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/sponsors/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Όνομα" required error={errors.name?.message} className="sm:col-span-2"><Input {...register('name')} placeholder="π.χ. K Cineplex" /></Field>
            <Field label="Κατάσταση" hint="Μόνο ενεργοί χορηγοί εμφανίζονται στην εφαρμογή">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="active">Ενεργός</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Χρώμα μάρκας" hint="Χρησιμοποιείται στην κάρτα δώρου μέσα στην εφαρμογή" className="sm:col-span-2">
              <Controller control={control} name="brand_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Επικοινωνία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Όνομα επαφής"><Input {...register('contact_name')} /></Field>
            <Field label="Email επαφής"><Input type="email" {...register('contact_email')} /></Field>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Λογότυπο</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="logo_path" render={({ field }) => <ImageUpload bucket="sponsors" aspect="aspect-video" value={field.value} onChange={field.onChange} label="Ανέβασε λογότυπο" />} />
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
