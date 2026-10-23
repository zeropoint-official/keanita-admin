'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
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

// Mirrors nextjs-sample/lib/items.ts: an `outfit_*` gift with an image becomes
// a wearable outfit in the app, and the image is the character sprite itself.
const OUTFIT_PREFIX = 'outfit_';
const OUTFIT_W = 480;
const OUTFIT_H = 416;

async function checkOutfitSprite(file: File): Promise<string | null> {
  if (file.type !== 'image/png' && file.type !== 'image/webp') return 'Τα ρούχα πρέπει να είναι PNG ή WebP με διάφανο φόντο.';
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return 'Δεν ήταν δυνατή η ανάγνωση της εικόνας.';
  const ok = bmp.width * OUTFIT_H === bmp.height * OUTFIT_W;
  const msg = `Η εικόνα είναι ${bmp.width}×${bmp.height}. Τα ρούχα πρέπει να έχουν αναλογία ${OUTFIT_W}×${OUTFIT_H} (κατέβασε το πρότυπο).`;
  bmp.close();
  return ok ? null : msg;
}

const DEFAULTS: GiftInput = {
  name: '', description: '', cost: 100, category: 'digital', emoji: '🎁', image_url: null,
  color: '#E60C10', bg_color: '#FFF0EE', stock: '', requires_approval: false, status: 'draft', sort_order: 0, item_key: '', consumable: false,
};

export function GiftForm({ id, initial }: { id: string | null; initial?: Partial<GiftInput> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, formState: { errors } } = useForm<GiftInput>({ defaultValues: { ...DEFAULTS, ...initial } });
  const isOutfit = (useWatch({ control, name: 'item_key' }) ?? '').trim().startsWith(OUTFIT_PREFIX);

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
            <Field label="Κωδικός στοιχείου εφαρμογής" hint="Συνδέει το δώρο με αντικείμενο μέσα στην εφαρμογή (π.χ. theme_night). Νέο ρούχο: γράψε outfit_ και ένα όνομα με λατινικά (π.χ. outfit_pirate) και ανέβασε την εικόνα του. Κενό = απλό δώρο." error={errors.item_key?.message} className="sm:col-span-2">
              <Input {...register('item_key')} placeholder="π.χ. outfit_pirate" />
            </Field>
            <Field label="Περιγραφή" className="sm:col-span-2"><Textarea rows={4} {...register('description')} /></Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{isOutfit ? 'Εικόνα ρούχου' : 'Εικόνα'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {isOutfit && (
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground space-y-1">
                <p>Ο ήρωας με το ρούχο, όπως θα φαίνεται στο παιχνίδι: PNG/WebP με διάφανο φόντο, {OUTFIT_W}×{OUTFIT_H}.</p>
                <p>Ζωγράφισε πάνω στο πρότυπο ώστε τα μάτια να μένουν στην ίδια θέση, αλλιώς ο ήρωας θα «πηδάει» όταν αλλάζει ρούχο.</p>
                <a href="/outfit-template.png" download className="font-medium text-[#E60C10] underline">Κατέβασε το πρότυπο</a>
              </div>
            )}
            <Controller control={control} name="image_url" render={({ field }) => (
              <ImageUpload bucket="gifts" aspect={isOutfit ? 'aspect-[480/416]' : 'aspect-square'} value={field.value} onChange={field.onChange}
                accept={isOutfit ? 'image/png,image/webp' : undefined} validate={isOutfit ? checkOutfitSprite : undefined} />)} />
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
            <div className="flex items-center justify-between"><span className="text-sm">Αναλώσιμο <span className="text-muted-foreground">(αγοράζεται ξανά)</span></span>
              <Controller control={control} name="consumable" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} /></div>
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </div>
    </form>
  );
}
