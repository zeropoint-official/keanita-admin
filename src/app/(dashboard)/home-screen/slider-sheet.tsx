'use client';
import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import { ColorField } from '@/components/shared/color-field';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteSlider, saveSlider, type SliderInput } from './actions';
import { SCREEN_TARGETS } from './constants';

export interface SliderRow {
  id: string; title: string; subtitle: string | null; image_url: string | null; accent_color: string; bg_color: string;
  link_type: string | null; link_target: string | null; starts_at: string | null; ends_at: string | null; status: 'draft' | 'published' | 'archived'; sort_order: number;
}
export interface LinkOption { id: string; title: string }

const DEFAULTS: SliderInput = {
  title: '', subtitle: '', image_url: null, accent_color: '#E60C10', bg_color: '#FFF0EE',
  link_type: null, link_target: '', starts_at: '', ends_at: '', status: 'draft',
};

/** ISO → value for <input type="datetime-local"> in local time. */
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NONE = '__none__';

export function SliderSheet({ open, onClose, slider, events, products }: { open: boolean; onClose: () => void; slider: SliderRow | null; events: LinkOption[]; products: LinkOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm<SliderInput>({ defaultValues: DEFAULTS });
  const linkType = useWatch({ control, name: 'link_type' });

  useEffect(() => {
    if (!open) return;
    reset(slider ? {
      title: slider.title, subtitle: slider.subtitle ?? '', image_url: slider.image_url, accent_color: slider.accent_color, bg_color: slider.bg_color,
      link_type: (slider.link_type as SliderInput['link_type']) ?? null, link_target: slider.link_target ?? '',
      starts_at: toLocal(slider.starts_at), ends_at: toLocal(slider.ends_at), status: slider.status,
    } : DEFAULTS);
  }, [open, slider, reset]);

  const onSubmit = (values: SliderInput) => start(async () => {
    const r = await saveSlider(slider?.id ?? null, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    onClose();
    router.refresh();
  });

  const options = linkType === 'event' ? events : linkType === 'product' ? products : [];

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{slider ? 'Επεξεργασία slide' : 'Νέο slide'}</SheetTitle>
          <SheetDescription>Εμφανίζεται στο hero slider της αρχικής οθόνης.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-4 pb-4">
          <Field label="Τίτλος" required error={errors.title?.message}><Input {...register('title')} /></Field>
          <Field label="Υπότιτλος"><Input {...register('subtitle')} /></Field>
          <Field label="Εικόνα">
            <Controller control={control} name="image_url" render={({ field }) => <ImageUpload bucket="sliders" value={field.value} onChange={field.onChange} />} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Κύριο χρώμα"><Controller control={control} name="accent_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
            <Field label="Φόντο"><Controller control={control} name="bg_color" render={({ field }) => <ColorField value={field.value ?? ''} onChange={field.onChange} />} /></Field>
          </div>
          <Field label="Σύνδεσμος">
            <Controller control={control} name="link_type" render={({ field }) => (
              <Select value={field.value ?? NONE} onValueChange={(v) => { field.onChange(v === NONE ? null : v); setValue('link_target', ''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Χωρίς σύνδεσμο</SelectItem>
                  <SelectItem value="event">Εκδήλωση</SelectItem>
                  <SelectItem value="product">Προϊόν</SelectItem>
                  <SelectItem value="screen">Οθόνη εφαρμογής</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>)} />
          </Field>
          {(linkType === 'event' || linkType === 'product') && (
            <Field label={linkType === 'event' ? 'Εκδήλωση' : 'Προϊόν'}>
              <Controller control={control} name="link_target" render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Επιλογή…" /></SelectTrigger>
                  <SelectContent>{options.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent>
                </Select>)} />
            </Field>
          )}
          {linkType === 'screen' && (
            <Field label="Οθόνη">
              <Controller control={control} name="link_target" render={({ field }) => (
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Επιλογή…" /></SelectTrigger>
                  <SelectContent>{SCREEN_TARGETS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>)} />
            </Field>
          )}
          {linkType === 'url' && <Field label="URL"><Input type="url" placeholder="https://…" {...register('link_target')} /></Field>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Έναρξη" hint="Κενό = άμεσα"><Input type="datetime-local" {...register('starts_at')} /></Field>
            <Field label="Λήξη" hint="Κενό = χωρίς λήξη"><Input type="datetime-local" {...register('ends_at')} /></Field>
          </div>
          <Field label="Κατάσταση">
            <Controller control={control} name="status" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="published">Δημοσιευμένο</SelectItem><SelectItem value="archived">Αρχείο</SelectItem></SelectContent>
              </Select>)} />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={pending} className="flex-1 bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
            {slider && (
              <ConfirmButton variant="destructive" title="Διαγραφή slide;" description="Δεν αναιρείται."
                onConfirm={async () => { const r = await deleteSlider(slider.id); if (r.ok) { onClose(); router.refresh(); } return r; }}>Διαγραφή</ConfirmButton>
            )}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
