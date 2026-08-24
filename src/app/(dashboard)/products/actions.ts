'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

const productSchema = z.object({
  name: z.string().min(2, 'Απαιτείται όνομα'),
  category: z.enum(['juice', 'yogurt']),
  tagline: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  accent_color: z.string().default('#F5820D'),
  bg_color: z.string().default('#FFF4E5'),
  serving_size: z.string().nullable().default(null),
  highlights: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).default([]),
  nutrition: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().min(0).default(0),
});
export type ProductInput = z.input<typeof productSchema>;

const REVALIDATE = ['/products', '/'];

export async function saveProduct(id: string | null, input: ProductInput) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const values = {
    ...d,
    tagline: d.tagline || null, description: d.description || null, serving_size: d.serving_size || null,
    highlights: d.highlights.map((s) => s.trim()).filter(Boolean),
    ingredients: d.ingredients.map((s) => s.trim()).filter(Boolean),
    nutrition: d.nutrition.filter((n) => n.label.trim() || n.value.trim()),
  };
  return staffAction({
    action: id ? 'products.update' : 'products.create', entity: 'products', entityId: id, payload: values, revalidate: REVALIDATE,
    fn: async (db) => {
      const q = id ? db.from('products').update(values).eq('id', id) : db.from('products').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export async function setProductStatus(id: string, status: 'draft' | 'published' | 'archived') {
  return staffAction({ action: 'products.status', entity: 'products', entityId: id, payload: { status }, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('products').update({ status }).eq('id', id); if (error) throw error; } });
}

export async function deleteProduct(id: string) {
  return staffAction({ role: 'admin', action: 'products.delete', entity: 'products', entityId: id, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('products').delete().eq('id', id); if (error) throw error; } });
}
