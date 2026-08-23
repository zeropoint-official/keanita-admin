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
import { PairListEditor } from '@/components/shared/list-editor';
import { saveEvent, type EventInput } from './actions';

const DEFAULTS: EventInput = {
  type: 'event', title: '', description: '', date: '', time_label: '', location: '', image_url: null,
  accent_color: '#E84D3D', bg_color: '#FFF0EE', highlights: [], rsvp_points: 10, capacity: null,
  show_on_home: true, show_call_button: false, allow_registration: true,
  notify_on: null, notify_min_age: null, notify_max_age: null, status: 'draft',
};

export function EventForm({ id, initial }: { id: string | null; initial?: Partial<EventInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<EventInput>({ defaultValues: { ...DEFAULTS, ...initial } });

  const onSubmit = (values: EventInput) => start(async () => {
    const r = await saveEvent(id, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/events/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Τίτλος" required error={errors.title?.message} className="sm:col-span-2"><Input {...register('title')} /></Field>
            <Field label="Τύπος">
              <Controller control={control} name="type" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="event">Εκδήλωση</SelectItem><SelectItem value="seminar">Σεμινάριο</SelectItem><SelectItem value="announcement">Ανακοίνωση</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Κατάσταση">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Ημερομηνία" required error={errors.date?.message}><Input type="date" {...register('date')} /></Field>
            <Field label="Ώρα" hint="π.χ. 11:00 - 13:00 ή Όλη μέρα"><Input {...register('time_label')} /></Field>
            <Field label="Τοποθεσία" className="sm:col-span-2"><Input {...register('location')} /></Field>
            <Field label="Περιγραφή" className="sm:col-span-2"><Textarea rows={5} {...register('description')} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>«Τι να περιμένεις»</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="highlights" render={({ field }) => (
              <PairListEditor value={field.value ?? []} onChange={field.onChange} keys={['emoji', 'label']} placeholders={['🎨', 'Διασκεδαστικά εργαστήρια']} />)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Push ειδοποίηση</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Αποστολή στις" hint="Κενό = χωρίς αυτόματη αποστολή"><Input type="date" {...register('notify_on')} /></Field>
            <Field label="Ηλικία παιδιού από"><Input type="number" min={0} max={18} {...register('notify_min_age')} /></Field>
            <Field label="έως"><Input type="number" min={0} max={18} {...register('notify_max_age')} /></Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Εικόνα</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="image_url" render={({ field }) => <ImageUpload bucket="events" value={field.value} onChange={field.onChange} />} />
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
          <CardHeader><CardTitle>Επιλογές</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {([['show_on_home', 'Εμφάνιση στην αρχική'], ['allow_registration', 'Δήλωση συμμετοχής'], ['show_call_button', 'Κουμπί κλήσης']] as const).map(([k, l]) => (
              <div key={k} className="flex items-center justify-between"><span className="text-sm">{l}</span>
                <Controller control={control} name={k} render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} /></div>
            ))}
            <Field label="KP για συμμετοχή"><Input type="number" min={0} {...register('rsvp_points')} /></Field>
            <Field label="Χωρητικότητα" hint="Κενό = απεριόριστη"><Input type="number" min={1} {...register('capacity')} /></Field>
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
