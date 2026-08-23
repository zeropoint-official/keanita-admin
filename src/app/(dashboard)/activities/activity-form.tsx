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
import { saveActivity, type ActivityInput } from './actions';

const DEFAULTS: ActivityInput = { kind: 'puzzle', title: '', category: '', image_url: null, file_url: '', status: 'draft', sort_order: 0 };

export function ActivityForm({ id, initial, categories }: { id: string | null; initial?: Partial<ActivityInput>; categories: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<ActivityInput>({ defaultValues: { ...DEFAULTS, ...initial } });

  const onSubmit = (values: ActivityInput) => start(async () => {
    const r = await saveActivity(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/activities/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Τίτλος" required error={errors.title?.message} className="sm:col-span-2"><Input {...register('title')} /></Field>
            <Field label="Τύπος">
              <Controller control={control} name="kind" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="puzzle">Χρωμοσελίδα</SelectItem><SelectItem value="download">Λήψη PDF</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Κατάσταση">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Κατηγορία" hint="Ελεύθερο κείμενο — διάλεξε υπάρχουσα ή γράψε νέα">
              <Input list="activity-categories" {...register('category')} />
              <datalist id="activity-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Σειρά" hint="Μικρότερος αριθμός = πιο ψηλά"><Input type="number" {...register('sort_order')} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Αρχείο PDF</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="file_url" render={({ field }) => (
              <ImageUpload bucket="activities" accept="application/pdf" label="Ανέβασε PDF" value={field.value || null} onChange={(v) => field.onChange(v ?? '')} />)} />
            {errors.file_url && <p className="text-xs text-destructive mt-2">{errors.file_url.message}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Εικόνα προεπισκόπησης</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="image_url" render={({ field }) => <ImageUpload bucket="activities" value={field.value} onChange={field.onChange} />} />
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
