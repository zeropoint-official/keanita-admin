'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';
import { OUTFIT_PREFIX } from './gift-kind';

const giftSchema = z.object({
  name: z.string().min(2, 'Απαιτείται όνομα'),
  description: z.string().nullable().default(null),
  cost: z.coerce.number().int().min(0, 'Το κόστος πρέπει να είναι ≥ 0'),
  category: z.enum(['digital', 'physical']).default('digital'),
  emoji: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  color: z.string().default('#E60C10'),
  bg_color: z.string().default('#FFF0EE'),
  stock: z.union([z.literal(''), z.coerce.number().int().min(0)]).nullable().default(null),
  requires_approval: z.boolean().default(false),
  /** Only read when creating: what staff picked in the "Τύπος" dropdown. */
  kind: z.enum(['gift', 'outfit']).default('gift'),
  consumable: z.boolean().default(false),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().default(0),
});
export type GiftInput = z.input<typeof giftSchema> & { item_key?: string | null };

const GREEK_TO_LATIN: Record<string, string> = {
  α: 'a', β: 'v', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'i', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x',
  ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'f', χ: 'ch', ψ: 'ps', ω: 'o',
};

/** e.g. "Πειρατίνα" → "outfit_peiratina_k3f9". The suffix keeps keys unique. */
function newOutfitKey(name: string) {
  const latin = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[α-ως]/g, (c) => GREEK_TO_LATIN[c] ?? '');
  const slug = latin.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'outfit';
  return `${OUTFIT_PREFIX}${slug}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function saveGift(id: string | null, input: GiftInput) {
  const parsed = giftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { kind, ...data } = parsed.data;
  const base = { ...data, description: data.description || null, emoji: data.emoji || null, stock: data.stock === '' || data.stock == null ? null : data.stock };

  // A gift's type is fixed at creation: `item_key` is never written on update,
  // so an outfit kids already own can't be turned into something else.
  let values: typeof base & { item_key?: string | null };
  if (id) {
    const isOutfit = (input.item_key ?? '').startsWith(OUTFIT_PREFIX);
    if (isOutfit && !base.image_url) return { ok: false as const, error: 'Τα ρούχα χρειάζονται εικόνα' };
    values = isOutfit ? { ...base, category: 'digital', requires_approval: false, consumable: false } : base;
  } else if (kind === 'outfit') {
    if (!base.image_url) return { ok: false as const, error: 'Τα ρούχα χρειάζονται εικόνα' };
    values = { ...base, category: 'digital', requires_approval: false, consumable: false, item_key: newOutfitKey(base.name) };
  } else {
    values = { ...base, item_key: null };
  }
  return staffAction({
    action: id ? 'gifts.update' : 'gifts.create', entity: 'gifts', entityId: id, payload: values, revalidate: ['/gifts', '/'],
    fn: async (db) => {
      const q = id ? db.from('gifts').update(values).eq('id', id) : db.from('gifts').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export async function deleteGift(id: string) {
  return staffAction({ role: 'admin', action: 'gifts.delete', entity: 'gifts', entityId: id, revalidate: ['/gifts', '/'],
    fn: async (db) => { const { error } = await db.from('gifts').delete().eq('id', id); if (error) throw error; } });
}

export type RedemptionStatus = 'approved' | 'shipped' | 'delivered' | 'rejected';

export async function setRedemptionStatus(id: string, status: RedemptionStatus, note?: string) {
  return staffAction({
    action: `redemptions.${status}`, entity: 'redemptions', entityId: id, payload: { status, note: note ?? null }, revalidate: ['/gifts', '/'],
    fn: async (db, staffId) => {
      if (status === 'rejected') {
        // transactional + idempotent: refund and stock restore happen atomically in SQL
        const { data: ok, error } = await db.rpc('reject_redemption', { p_redemption: id, p_note: note?.trim() || '', p_staff: staffId });
        if (error) throw error;
        if (!ok) throw new Error('Η εξαργύρωση έχει ήδη κλείσει');
        return;
      }
      const { data: updated, error } = await db.from('redemptions')
        .update({ status, note: note?.trim() || null, handled_by: staffId, handled_at: new Date().toISOString() })
        .eq('id', id).not('status', 'in', '("rejected","cancelled")').select('id');
      if (error) throw error;
      if (!updated?.length) throw new Error('Η εξαργύρωση έχει ήδη κλείσει');
    },
  });
}
