'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm, type FieldValues, type DefaultValues, type Path } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/shared/form-field';
import { ImageUpload } from '@/components/shared/image-upload';
import { saveSettings } from './actions';

export type SettingField =
  | { key: string; label: string; kind: 'text' | 'textarea' | 'number'; hint?: string; placeholder?: string; span?: boolean }
  | { key: string; label: string; kind: 'switch'; hint?: string }
  | { key: string; label: string; kind: 'file'; hint?: string; accept: string; bucket: string };

/**
 * Generic settings card: renders fields from a spec, saves all keys in one `saveSettings` call.
 * Numbers are coerced to number, switches to boolean, everything else stays a string.
 */
export function SettingsForm<T extends FieldValues>({ title, description, fields, initial }: { title: string; description?: string; fields: SettingField[]; initial: T }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { register, control, handleSubmit } = useForm<T>({ defaultValues: initial as DefaultValues<T> });

  const onSubmit = (values: T) => start(async () => {
    const entries = fields.map((f) => {
      const raw = values[f.key];
      let value: unknown = raw;
      if (f.kind === 'number') value = raw === '' || raw === null || raw === undefined ? 0 : Number(raw);
      else if (f.kind === 'switch') value = !!raw;
      else value = raw ?? '';
      return { key: f.key, value };
    });
    const r = await saveSettings(entries);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    router.refresh();
  });

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => {
            const name = f.key as Path<T>;
            if (f.kind === 'switch') return (
              <div key={f.key} className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                <div><p className="text-sm font-medium">{f.label}</p>{f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}</div>
                <Controller control={control} name={name} render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} />} />
              </div>
            );
            if (f.kind === 'file') return (
              <Field key={f.key} label={f.label} hint={f.hint} className="sm:col-span-2">
                <Controller control={control} name={name} render={({ field }) => (
                  <ImageUpload bucket={f.bucket} accept={f.accept} value={field.value || null} onChange={(p) => field.onChange(p ?? '')} label="Ανέβασε αρχείο" />)} />
              </Field>
            );
            if (f.kind === 'textarea') return (
              <Field key={f.key} label={f.label} hint={f.hint} className="sm:col-span-2"><Textarea rows={4} placeholder={f.placeholder} {...register(name)} /></Field>
            );
            return (
              <Field key={f.key} label={f.label} hint={f.hint} className={f.span ? 'sm:col-span-2' : undefined}>
                <Input type={f.kind === 'number' ? 'number' : 'text'} placeholder={f.placeholder} {...register(name)} />
              </Field>
            );
          })}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending} className="bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
