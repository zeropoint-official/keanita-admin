'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Dices } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import {
  committedTotal, forecastLine, generateCampaign, periodCount, validateCampaign,
  type CampaignRuleInput, type ForecastStats, type Fulfillment, type QuotaMode, type Trigger,
} from '@/lib/campaign-rules';
import { saveCampaign, type CampaignInput } from '../actions';

const TRIGGER_OPTIONS: [Trigger, string][] = [
  ['game_milestone', 'Ορόσημο πόντων στο παιχνίδι'],
  ['game_drop', 'Τυχαία εμφάνιση στο παιχνίδι'],
];

const DEFAULTS: CampaignInput = {
  sponsor_id: '', title: '', prize_image_path: null, profile_text: '', redeem_link: '',
  status: 'draft', starts_at: '', ends_at: '', trigger: 'game_milestone',
  every_points: '', chance_pct: '',
  fulfillment: 'pickup', quota_mode: 'total', quota_amount: 10, per_user_limit: 1,
  kid_approved: false, min_age: '', max_age: '', min_kp: '', max_wins_per_day: '', expiry_days: '',
};

/** Inputs register as strings; the rulebook wants numbers ('' = not set). */
const num = (v: unknown): number | '' => (v === '' || v == null || Number.isNaN(Number(v)) ? '' : Number(v));

export function CampaignForm({ id, sponsors, initial, stats, codesCount = 0 }: {
  id: string | null;
  sponsors: { id: string; name: string }[];
  initial?: Partial<CampaignInput>;
  stats?: ForecastStats | null;
  codesCount?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm<CampaignInput>({ defaultValues: { ...DEFAULTS, ...initial } });
  const values = watch();
  const trigger = values.trigger;
  const fulfillment = values.fulfillment;

  const rule: CampaignRuleInput = {
    trigger: (trigger ?? 'game_milestone') as Trigger,
    every_points: num(values.every_points), chance_pct: num(values.chance_pct),
    fulfillment: (fulfillment ?? 'pickup') as Fulfillment,
    quota_mode: (values.quota_mode ?? 'total') as QuotaMode,
    quota_amount: Number(values.quota_amount) || 0,
    per_user_limit: Number(values.per_user_limit) || 1,
    starts_at: values.starts_at || null, ends_at: values.ends_at || null,
    expiry_days: num(values.expiry_days),
    min_age: num(values.min_age), max_age: num(values.max_age),
    min_kp: num(values.min_kp),
    max_wins_per_day: num(values.max_wins_per_day),
    codes_count: codesCount,
  };
  const check = validateCampaign(rule);
  const total = committedTotal(rule);
  const periods = periodCount(rule.quota_mode, rule.starts_at, rule.ends_at);
  const forecast = forecastLine(rule, stats ?? null);
  const publishBlocked = values.status === 'active' && check.errors.length > 0;

  const rollGenerate = () => {
    const g = generateCampaign({
      quota_amount: rule.quota_amount, quota_mode: rule.quota_mode,
      starts_at: rule.starts_at, ends_at: rule.ends_at,
      fulfillment: rule.fulfillment, codes_count: codesCount, stats: stats ?? null,
    });
    setValue('trigger', g.trigger);
    setValue('every_points', g.every_points);
    setValue('chance_pct', g.chance_pct);
    setValue('fulfillment', g.fulfillment);
    setValue('per_user_limit', g.per_user_limit);
    setValue('expiry_days', g.expiry_days);
    setValue('kid_approved', g.kid_approved);
    setValue('min_kp', g.min_kp);
    setValue('max_wins_per_day', g.max_wins_per_day);
    toast.success('Νέα πρόταση (μηχανισμός + προϋποθέσεις) — πάτησέ το ξανά για άλλη');
  };

  const onSubmit = (v: CampaignInput) => start(async () => {
    const r = await saveCampaign(id, v);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    if (!id) router.replace(`/sponsors/campaigns/${r.data}`); else router.refresh();
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Βασικά στοιχεία</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Χορηγός" required error={errors.sponsor_id?.message}>
              <Controller control={control} name="sponsor_id" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Επίλεξε χορηγό" /></SelectTrigger>
                  <SelectContent>{sponsors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>)} />
            </Field>
            <Field label="Κατάσταση" hint="Μόνο ενεργές καμπάνιες παίζουν στην εφαρμογή">
              <Controller control={control} name="status" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Πρόχειρο</SelectItem><SelectItem value="active">Ενεργή</SelectItem><SelectItem value="paused">Σε παύση</SelectItem><SelectItem value="ended">Ολοκληρώθηκε</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Τίτλος δώρου" required error={errors.title?.message} className="sm:col-span-2"><Input {...register('title')} placeholder="π.χ. Δωρεάν εισιτήριο K Cineplex" /></Field>
            <Field label="Οδηγίες παραλαβής" required error={errors.profile_text?.message} hint="Αυτό διαβάζει ο νικητής στο προφίλ του — πού και πώς παραλαμβάνει το δώρο" className="sm:col-span-2">
              <Textarea rows={4} {...register('profile_text')} placeholder="π.χ. Δείξε τον αριθμό μέλους στο ταμείο του K Cineplex Λευκωσίας…" />
            </Field>
            <Field label="Σύνδεσμος (προαιρετικά)" hint="Εμφανίζεται ως κουμπί κάτω από τις οδηγίες" className="sm:col-span-2"><Input {...register('redeem_link')} placeholder="https://…" /></Field>
            <Field label="Έναρξη" hint="Κενό = άμεσα"><Input type="datetime-local" {...register('starts_at')} /></Field>
            <Field label="Λήξη" hint="Κενό = χωρίς λήξη"><Input type="datetime-local" {...register('ends_at')} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Απόθεμα & μηχανισμός</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={rollGenerate}>
              <Dices className="h-4 w-4 mr-1" />Πρόταση
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Ποσότητα" required error={errors.quota_amount?.message}><Input type="number" min={1} {...register('quota_amount')} /></Field>
            <Field label="Ποσόστωση">
              <Controller control={control} name="quota_mode" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="total">Συνολικά</SelectItem><SelectItem value="monthly">Ανά μήνα</SelectItem><SelectItem value="weekly">Ανά εβδομάδα</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Όριο ανά μέλος"><Input type="number" min={1} {...register('per_user_limit')} /></Field>
            <Field label="Πώς κερδίζεται" required>
              <Controller control={control} name="trigger" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_OPTIONS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>)} />
            </Field>
            {trigger === 'game_milestone' && <Field label="Κάθε πόσους πόντους" required hint="Το δώρο εμφανίζεται στη Φρουτοτρέλα κάθε τόσους πόντους (≥ 5)"><Input type="number" min={5} {...register('every_points')} /></Field>}
            {trigger === 'game_drop' && <Field label="Πιθανότητα (%)" required hint="Ανά αντικείμενο που εμφανίζεται· έως 5%"><Input type="number" step="0.1" min={0} max={5} {...register('chance_pct')} /></Field>}
            <Field label="Παράδοση" hint={fulfillment === 'code' ? 'Οι κωδικοί ανεβαίνουν στη σελίδα της καμπάνιας μετά την αποθήκευση' : 'Ο νικητής παραλαμβάνει με τον αριθμό μέλους'}>
              <Controller control={control} name="fulfillment" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pickup">Παραλαβή από κατάστημα</SelectItem><SelectItem value="code">Κωδικός κουπονιού</SelectItem></SelectContent>
                </Select>)} />
            </Field>
            <Field label="Λήξη δώρου (ημέρες)" hint="Κενό = δεν λήγει· αλλιώς το απόθεμα επιστρέφει μετά από N ημέρες">
              <Input type="number" min={1} {...register('expiry_days')} />
            </Field>
            {periods && (
              <p className="sm:col-span-3 text-sm text-muted-foreground">
                {rule.quota_amount}/{rule.quota_mode === 'monthly' ? 'μήνα' : 'εβδομάδα'} × {periods} {rule.quota_mode === 'monthly' ? 'μήνες' : 'εβδομάδες'} = <span className="font-semibold text-foreground">{total} δώρα συνολικά</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Προϋποθέσεις</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center justify-between sm:col-span-3"><span className="text-sm">Απαιτεί εγκεκριμένο παιδί</span>
              <Controller control={control} name="kid_approved" render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} /></div>
            <Field label="Ηλικία από" hint="Αφορά το δώρο — δεν το αλλάζει η Πρόταση"><Input type="number" min={0} max={11} {...register('min_age')} /></Field>
            <Field label="Ηλικία έως"><Input type="number" min={0} max={11} {...register('max_age')} /></Field>
            <Field label="Ελάχιστα KP" hint="Μόνο για πιστούς παίκτες — δεν ξοδεύονται"><Input type="number" min={0} {...register('min_kp')} /></Field>
            <Field label="Μέγιστες νίκες / ημέρα" hint="Κενό = 1 (προστασία για τα παιχνίδια)" className="sm:col-span-3"><Input type="number" min={1} {...register('max_wins_per_day')} /></Field>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Εικόνα δώρου</CardTitle></CardHeader>
          <CardContent>
            <Controller control={control} name="prize_image_path" render={({ field }) => <ImageUpload bucket="sponsors" aspect="aspect-square" value={field.value} onChange={field.onChange} label="Ανέβασε εικόνα (αλλιώς το λογότυπο του χορηγού)" />} />
          </CardContent>
        </Card>

        {/* Rulebook footer: validation summary + forecast */}
        <Card>
          <CardHeader><CardTitle>Έλεγχος</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {check.errors.map((e) => <p key={e} className="text-sm text-destructive">✕ {e}</p>)}
            {check.warnings.map((w) => <p key={w} className="text-sm text-amber-700">⚠ {w}</p>)}
            {check.errors.length === 0 && check.warnings.length === 0 && (
              <p className="text-sm text-green-700">✓ Όλοι οι κανόνες περνούν</p>
            )}
            {forecast && <p className="text-sm text-muted-foreground border-t pt-2 mt-2">📈 {forecast}</p>}
          </CardContent>
        </Card>

        <Button type="submit" disabled={pending || publishBlocked} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">
          {pending ? 'Αποθήκευση…' : publishBlocked ? 'Διόρθωσε τα σφάλματα για δημοσίευση' : 'Αποθήκευση'}
        </Button>
      </div>
    </form>
  );
}
