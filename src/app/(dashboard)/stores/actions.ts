'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

const discountSchema = z.object({
  value: z.coerce.number().min(0, 'Μη έγκυρη τιμή').max(100, 'Μέγιστο 100%'),
  description: z.string().default(''),
});

export const storeSchema = z.object({
  name: z.string().min(2, 'Απαιτείται όνομα'),
  category_id: z.coerce.number().int().nullable().default(null),
  phone: z.string().nullable().default(null),
  website: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  logo_url: z.string().nullable().default(null),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().default(0),
  discounts: z.array(discountSchema).default([]),
});
export type StoreInput = z.input<typeof storeSchema>;

const REVALIDATE = ['/stores', '/'];
const orNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export async function saveStore(id: string | null, input: StoreInput) {
  const parsed = storeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { discounts, ...rest } = parsed.data;
  const values = {
    ...rest,
    category_id: rest.category_id || null,
    phone: orNull(rest.phone), website: orNull(rest.website), description: orNull(rest.description),
    address: orNull(rest.address), city: orNull(rest.city), logo_url: orNull(rest.logo_url),
  };
  return staffAction({
    action: id ? 'stores.update' : 'stores.create', entity: 'stores', entityId: id, payload: { ...values, discounts },
    revalidate: REVALIDATE,
    fn: async (db) => {
      const q = id ? db.from('stores').update(values).eq('id', id) : db.from('stores').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      const storeId = data.id as string;
      // Replace discounts: delete + reinsert for this store.
      const { error: delErr } = await db.from('store_discounts').delete().eq('store_id', storeId);
      if (delErr) throw delErr;
      if (discounts.length) {
        const { error: insErr } = await db.from('store_discounts').insert(
          discounts.map((d, i) => ({ store_id: storeId, value: d.value, description: d.description.trim(), sort_order: i })),
        );
        if (insErr) throw insErr;
      }
      return storeId;
    },
  });
}

export async function setStoreStatus(id: string, status: 'draft' | 'published' | 'archived') {
  return staffAction({ action: 'stores.status', entity: 'stores', entityId: id, payload: { status }, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('stores').update({ status }).eq('id', id); if (error) throw error; } });
}

export async function deleteStore(id: string) {
  return staffAction({ role: 'admin', action: 'stores.delete', entity: 'stores', entityId: id, revalidate: REVALIDATE,
    fn: async (db) => {
      const { error: dErr } = await db.from('store_discounts').delete().eq('store_id', id); if (dErr) throw dErr;
      const { error } = await db.from('stores').delete().eq('id', id); if (error) throw error;
    } });
}

// ---- Categories ----
const categorySchema = z.object({ name: z.string().min(1, 'Απαιτείται όνομα'), sort_order: z.coerce.number().int().default(0) });

export async function saveCategory(id: number | null, input: { name: string; sort_order?: number }) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const values = { name: parsed.data.name.trim(), sort_order: parsed.data.sort_order };
  return staffAction({
    action: id ? 'store_categories.update' : 'store_categories.create', entity: 'store_categories', entityId: id ? String(id) : null,
    payload: values, revalidate: ['/stores', '/stores/categories'],
    fn: async (db) => {
      const q = id ? db.from('store_categories').update(values).eq('id', id) : db.from('store_categories').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as number;
    },
  });
}

export async function deleteCategory(id: number) {
  return staffAction({ role: 'admin', action: 'store_categories.delete', entity: 'store_categories', entityId: String(id), revalidate: ['/stores', '/stores/categories'],
    fn: async (db) => {
      // Detach stores first so FK doesn't block deletion.
      const { error: uErr } = await db.from('stores').update({ category_id: null }).eq('category_id', id); if (uErr) throw uErr;
      const { error } = await db.from('store_categories').delete().eq('id', id); if (error) throw error;
    } });
}
