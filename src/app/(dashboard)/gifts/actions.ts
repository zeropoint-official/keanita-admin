'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

const giftSchema = z.object({
  name: z.string().min(2, 'Απαιτείται όνομα'),
  description: z.string().nullable().default(null),
  cost: z.coerce.number().int().min(0, 'Το κόστος πρέπει να είναι ≥ 0'),
  category: z.enum(['digital', 'physical']).default('physical'),
  emoji: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  color: z.string().default('#E60C10'),
  bg_color: z.string().default('#FFF0EE'),
  stock: z.union([z.literal(''), z.coerce.number().int().min(0)]).nullable().default(null),
  requires_approval: z.boolean().default(true),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().default(0),
});
export type GiftInput = z.input<typeof giftSchema>;

export async function saveGift(id: string | null, input: GiftInput) {
  const parsed = giftSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const values = { ...parsed.data, description: parsed.data.description || null, emoji: parsed.data.emoji || null, stock: parsed.data.stock === '' || parsed.data.stock == null ? null : parsed.data.stock };
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
