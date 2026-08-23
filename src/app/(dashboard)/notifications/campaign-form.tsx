'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { cn } from '@/lib/utils';
import { estimateAudience, saveCampaign, type Audience, type CampaignInput } from './actions';
import { SCREENS } from './campaign-utils';

export interface LinkOption { id: string; label: string }

const DEFAULTS: CampaignInput = {
  title: '', body: '', type: 'system', link_type: 'none', link_target: null,
  audience_mode: 'all', kid_min_age: null, kid_max_age: null, kid_status: 'any', districts: '',
  schedule_mode: 'now', scheduled_at: null,
};

function Radio({ name, value, current, onChange, label, hint }: { name: string; value: string; current: string; onChange: (v: string) => void; label: string; hint?: string }) {
  const on = current === value;
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors', on ? 'border-[#E60C10] bg-[#FFF5F5]' : 'hover:bg-muted/50')}>
      <input type="radio" name={name} value={value} checked={on} onChange={() => onChange(value)} className="mt-1 accent-[#E60C10]" />
      <span><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    </label>
  );
}

export function CampaignForm({ id, initial, readOnly = false, events, products }: { id: string | null; initial?: Partial<CampaignInput>; readOnly?: boolean; events: LinkOption[]; products: LinkOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<CampaignInput>({ defaultValues: { ...DEFAULTS, ...initial } });
  const w = useWatch({ control });
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  // live audience estimate (debounced)
  useEffect(() => {
    if (w.audience_mode === 'test') { setEstimate(1); return; }
    const a: Audience = w.audience_mode === 'all' ? { all: true } : {
      kid_min_age: w.kid_min_age === null || w.kid_min_age === undefined || w.kid_min_age === ('' as never) ? null : Number(w.kid_min_age),
      kid_max_age: w.kid_max_age === null || w.kid_max_age === undefined || w.kid_max_age === ('' as never) ? null : Number(w.kid_max_age),
      kid_status: (w.kid_status as Audience['kid_status']) ?? 'any',
      districts: (w.districts ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    };
    setEstimating(true);
    const t = setTimeout(async () => {
      const r = await estimateAudience(a);
      setEstimate(r.ok ? (r.data ?? 0) : null);
      setEstimating(false);
    }, 400);
    return () => clearTimeout(t);
  }, [w.audience_mode, w.kid_min_age, w.kid_max_age, w.kid_status, w.districts]);

  const submit = (mode: 'draft' | 'schedule') => handleSubmit((values) => start(async () => {
    const r = await saveCampaign(id, values, mode);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success(mode === 'schedule' ? 'Προγραμματίστηκε — θα σταλεί αυτόματα από τον server.' : 'Αποθηκεύτηκε ως πρόχειρο');
    if (!id) router.replace(`/notifications/${r.data}`); else router.refresh();
  }));

  const bodyLen = (w.body ?? '').length;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <fieldset disabled={readOnly || pending} className="contents">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Μήνυμα</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Τίτλος" required error={errors.title?.message} className="sm:col-span-2"><Input {...register('title')} maxLength={60} placeholder="π.χ. Νέα εκδήλωση το Σάββατο!" /></Field>
              <Field label="Κείμενο" required error={errors.body?.message} className="sm:col-span-2" hint={`${bodyLen}/140 χαρακτήρες`}>
                <Textarea rows={3} maxLength={140} {...register('body')} className={bodyLen >= 140 ? 'border-[#E60C10]' : ''} />
              </Field>
              <Field label="Τύπος">
                <Controller control={control} name="type" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="system">Σύστημα</SelectItem><SelectItem value="event">Εκδήλωση</SelectItem><SelectItem value="reward">Ανταμοιβή</SelectItem><SelectItem value="gift">Δώρο</SelectItem></SelectContent>
                  </Select>)} />
              </Field>
              <Field label="Σύνδεσμος (πατώντας την ειδοποίηση)">
                <Controller control={control} name="link_type" render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); setValue('link_target', null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Χωρίς σύνδεσμο</SelectItem><SelectItem value="event">Εκδήλωση</SelectItem><SelectItem value="product">Προϊόν</SelectItem><SelectItem value="screen">Οθόνη εφαρμογής</SelectItem><SelectItem value="url">Εξωτερικό URL</SelectItem></SelectContent>
                  </Select>)} />
              </Field>
              {w.link_type && w.link_type !== 'none' && (
                <Field label="Προορισμός" required className="sm:col-span-2">
                  <Controller control={control} name="link_target" render={({ field }) => w.link_type === 'url'
                    ? <Input type="url" placeholder="https://…" value={field.value ?? ''} onChange={field.onChange} />
                    : (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue placeholder="Επιλογή…" /></SelectTrigger>
                        <SelectContent>
                          {(w.link_type === 'event' ? events : w.link_type === 'product' ? products : SCREENS.map(([id, label]) => ({ id, label }))).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )} />
                </Field>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Παραλήπτες</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Controller control={control} name="audience_mode" render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-3">
                  <Radio name="audience_mode" value="all" current={field.value ?? 'all'} onChange={field.onChange} label="Όλοι" hint="Όλοι οι ενεργοί γονείς" />
                  <Radio name="audience_mode" value="targeted" current={field.value ?? 'all'} onChange={field.onChange} label="Στοχευμένο" hint="Φίλτρα ηλικίας / περιοχής" />
                  <Radio name="audience_mode" value="test" current={field.value ?? 'all'} onChange={field.onChange} label="Δοκιμαστική αποστολή σε εμένα" hint="Μόνο στον λογαριασμό σου" />
                </div>)} />
              {w.audience_mode === 'targeted' && (
                <div className="grid gap-4 sm:grid-cols-3 rounded-lg border bg-muted/30 p-4">
                  <Field label="Ηλικία παιδιού από"><Input type="number" min={0} max={18} {...register('kid_min_age')} /></Field>
                  <Field label="έως"><Input type="number" min={0} max={18} {...register('kid_max_age')} /></Field>
                  <Field label="Κατάσταση παιδιού">
                    <Controller control={control} name="kid_status" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="any">Οποιαδήποτε</SelectItem><SelectItem value="approved">Εγκεκριμένα</SelectItem><SelectItem value="pending">Σε αναμονή</SelectItem></SelectContent>
                      </Select>)} />
                  </Field>
                  <Field label="Περιοχές" hint="Χωρισμένες με κόμμα, π.χ. Λευκωσία, Λεμεσός" className="sm:col-span-3"><Input {...register('districts')} /></Field>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-[#E60C10]" />
                {estimating ? <span className="text-muted-foreground">Υπολογισμός…</span> : estimate === null ? <span className="text-muted-foreground">—</span> : <span><b>~{estimate.toLocaleString('el-GR')}</b> παραλήπτες</span>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Χρόνος αποστολής</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Controller control={control} name="schedule_mode" render={({ field }) => (
                <div className="grid gap-2">
                  <Radio name="schedule_mode" value="now" current={field.value ?? 'now'} onChange={field.onChange} label="Τώρα" hint="Μόλις γίνει προγραμματισμός" />
                  <Radio name="schedule_mode" value="later" current={field.value ?? 'now'} onChange={field.onChange} label="Σε συγκεκριμένη ώρα" />
                </div>)} />
              {w.schedule_mode === 'later' && <Field label="Ημερομηνία & ώρα" required><Input type="datetime-local" {...register('scheduled_at')} /></Field>}
              <p className="flex items-start gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-900"><Info className="h-4 w-4 shrink-0" />Η αποστολή γίνεται αυτόματα από τον server μέσα σε λίγα λεπτά.</p>
            </CardContent>
          </Card>
          {!readOnly && (
            <div className="space-y-2">
              <Button type="button" disabled={pending} onClick={submit('schedule')} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Προγραμματισμός'}</Button>
              <Button type="button" variant="outline" disabled={pending} onClick={submit('draft')} className="w-full">Αποθήκευση ως πρόχειρο</Button>
            </div>
          )}
        </div>
      </fieldset>
    </form>
  );
}
