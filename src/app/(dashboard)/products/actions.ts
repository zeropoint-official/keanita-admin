'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

const productSchema = z.object({
  name: z.string().min(2, 'Απαιτείται όνομα'),
  category: z.string().min(1, 'Διάλεξε κατηγορία'),
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

// ---- Categories ----
// Categories live in `product_categories`; `key` is a latin slug made once at
// creation and never changed (products reference it), the Greek names are free.
const categorySchema = z.object({
  name: z.string().trim().min(1, 'Απαιτείται όνομα'),
  plural_name: z.string().trim().min(1, 'Απαιτείται πληθυντικός'),
  emoji: z.string().trim().nullable().default(null),
  sort_order: z.coerce.number().int().min(0).default(0),
});
export type ProductCategoryInput = z.input<typeof categorySchema>;

const GREEK_TO_LATIN: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

/** «Γάλα» → "gala". */
function slugify(name: string) {
  const latin = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[α-ως]/g, (c) => GREEK_TO_LATIN[c] ?? '');
  return latin.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'category';
}

const CATEGORY_REVALIDATE = ['/products', '/products/categories'];

export async function saveProductCategory(key: string | null, input: ProductCategoryInput) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const values = { ...parsed.data, emoji: parsed.data.emoji || null };
  return staffAction({
    action: key ? 'product_categories.update' : 'product_categories.create', entity: 'product_categories', entityId: key,
    payload: values, revalidate: CATEGORY_REVALIDATE,
    fn: async (db) => {
      if (key) {
        const { error } = await db.from('product_categories').update(values).eq('key', key);
        if (error) throw error;
        return key;
      }
      // New key: slug of the name, suffixed if it's already taken.
      const base = slugify(values.name);
      const { data: taken, error: tErr } = await db.from('product_categories').select('key').like('key', `${base}%`);
      if (tErr) throw tErr;
      const used = new Set((taken ?? []).map((r) => r.key));
      let next = base;
      for (let i = 2; used.has(next); i++) next = `${base}_${i}`;
      const { error } = await db.from('product_categories').insert({ ...values, key: next });
      if (error) throw error;
      return next;
    },
  });
}

export async function deleteProductCategory(key: string) {
  return staffAction({ role: 'admin', action: 'product_categories.delete', entity: 'product_categories', entityId: key, revalidate: CATEGORY_REVALIDATE,
    fn: async (db) => {
      const { count, error: cErr } = await db.from('products').select('id', { count: 'exact', head: true }).eq('category', key);
      if (cErr) throw cErr;
      if (count) throw new Error(`Υπάρχουν ${count} προϊόντα σε αυτή την κατηγορία — μετάφερέ τα πρώτα σε άλλη.`);
      const { error } = await db.from('product_categories').delete().eq('key', key);
      if (error) throw error;
    } });
}
