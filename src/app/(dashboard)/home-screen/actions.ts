'use server';
import { localInputToIso } from '@/lib/format';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

import { QUICK_ACTION_KEYS } from './constants';

const REVALIDATE = ['/home-screen', '/'];

const sliderSchema = z.object({
  title: z.string().min(2, 'Απαιτείται τίτλος'),
  subtitle: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  accent_color: z.string().default('#E60C10'),
  bg_color: z.string().default('#FFF0EE'),
  link_type: z.enum(['event', 'product', 'screen', 'url']).nullable().default(null),
  link_target: z.string().nullable().default(null),
  starts_at: z.string().nullable().default(null),
  ends_at: z.string().nullable().default(null),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});
export type SliderInput = z.input<typeof sliderSchema>;

const toIso = (v: string | null | undefined) => localInputToIso(v);

export async function saveSlider(id: string | null, input: SliderInput) {
  const parsed = sliderSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const values = {
    ...d,
    subtitle: d.subtitle || null,
    link_type: d.link_type || null,
    link_target: d.link_type ? d.link_target || null : null,
    starts_at: toIso(d.starts_at),
    ends_at: toIso(d.ends_at),
  };
  return staffAction({
    action: id ? 'home_sliders.update' : 'home_sliders.create', entity: 'home_sliders', entityId: id, payload: values, revalidate: REVALIDATE,
    fn: async (db) => {
      if (id) {
        const { error } = await db.from('home_sliders').update(values).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data: last } = await db.from('home_sliders').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
      const { data, error } = await db.from('home_sliders').insert({ ...values, sort_order: (last?.sort_order ?? 0) + 1 }).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

/** Swap sort_order between two sliders (move up/down). */
export async function swapSliderOrder(aId: string, bId: string) {
  return staffAction({
    action: 'home_sliders.reorder', entity: 'home_sliders', entityId: aId, payload: { with: bId }, revalidate: REVALIDATE,
    fn: async (db) => {
      const { data, error } = await db.from('home_sliders').select('id, sort_order').in('id', [aId, bId]);
      if (error) throw error;
      const a = data.find((r) => r.id === aId); const b = data.find((r) => r.id === bId);
      if (!a || !b) throw new Error('Δεν βρέθηκε');
      // Guard against equal sort_order values (legacy rows) by forcing distinct values.
      const [ao, bo] = a.sort_order === b.sort_order ? [a.sort_order, a.sort_order + 1] : [a.sort_order, b.sort_order];
      const r1 = await db.from('home_sliders').update({ sort_order: bo }).eq('id', aId);
      if (r1.error) throw r1.error;
      const r2 = await db.from('home_sliders').update({ sort_order: ao }).eq('id', bId);
      if (r2.error) throw r2.error;
    },
  });
}

export async function deleteSlider(id: string) {
  return staffAction({ role: 'admin', action: 'home_sliders.delete', entity: 'home_sliders', entityId: id, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('home_sliders').delete().eq('id', id); if (error) throw error; } });
}

export async function saveQuickActions(keys: string[]) {
  const parsed = z.array(z.enum(QUICK_ACTION_KEYS)).safeParse(keys);
  if (!parsed.success) return { ok: false as const, error: 'Μη έγκυρες επιλογές' };
  return staffAction({ role: 'admin', action: 'app_settings.update', entity: 'app_settings', entityId: 'home_quick_actions', payload: parsed.data, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('app_settings').upsert({ key: 'home_quick_actions', value: parsed.data, updated_at: new Date().toISOString() }); if (error) throw error; } });
}

export async function saveProductChips(chips: { emoji: string; label: string }[]) {
  const parsed = z.array(z.object({ emoji: z.string(), label: z.string().min(1, 'Απαιτείται ετικέτα') })).safeParse(chips);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  return staffAction({ role: 'admin', action: 'app_settings.update', entity: 'app_settings', entityId: 'home_product_chips', payload: parsed.data, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('app_settings').upsert({ key: 'home_product_chips', value: parsed.data, updated_at: new Date().toISOString() }); if (error) throw error; } });
}
