'use server';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';
import type { Database } from '@/lib/database.types';

import { POINTS_REASONS } from './constants';

const ruleSchema = z.object({
  key: z.enum(POINTS_REASONS),
  label: z.string().min(1, 'Απαιτείται ετικέτα'),
  points: z.coerce.number().int(),
  daily_cap: z.coerce.number().int().min(0).nullable().default(null),
  is_active: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});
export const rulesSchema = z.array(ruleSchema);
export type RuleInput = z.input<typeof ruleSchema>;

export async function saveRules(input: RuleInput[]) {
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const rows = parsed.data.map((r) => ({ ...r, daily_cap: r.daily_cap || null, config: r.config as never }));
  return staffAction({
    role: 'admin', action: 'rewards.rules.save', entity: 'reward_rules', payload: rows, revalidate: ['/rewards'],
    fn: async (db) => { const { error } = await db.from('reward_rules').upsert(rows, { onConflict: 'key' }); if (error) throw error; },
  });
}

// ---------- QR batches ----------
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const genCode = () => Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

const batchSchema = z.object({
  batch: z.string().trim().min(2, 'Απαιτείται όνομα παρτίδας'),
  product_id: z.string().uuid().nullable().default(null),
  points: z.coerce.number().int().min(1, 'Οι πόντοι πρέπει να είναι ≥ 1').default(20),
  quantity: z.coerce.number().int().min(1).max(5000, 'Μέγιστο 5000 κωδικοί ανά παρτίδα'),
  max_uses: z.coerce.number().int().min(1).default(1),
  expires_at: z.string().nullable().default(null),
});
export type BatchInput = z.input<typeof batchSchema>;

export async function createQrBatch(input: BatchInput) {
  const parsed = batchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { batch, product_id, points, quantity, max_uses } = parsed.data;
  const expires_at = parsed.data.expires_at ? new Date(parsed.data.expires_at).toISOString() : null;
  return staffAction({
    action: 'rewards.qr.batch', entity: 'qr_codes', entityId: batch, payload: { batch, product_id, points, quantity, max_uses, expires_at }, revalidate: ['/rewards'],
    fn: async (db) => {
      const { count } = await db.from('qr_codes').select('code', { count: 'exact', head: true }).eq('batch', batch);
      if (count) throw new Error('Υπάρχει ήδη παρτίδα με αυτό το όνομα');
      const codes = new Set<string>();
      while (codes.size < quantity) codes.add(genCode());
      const rows = [...codes].map((code) => ({ code, batch, product_id, points, max_uses, expires_at }));
      for (let i = 0; i < rows.length; i += 1000) {
        const { error } = await db.from('qr_codes').insert(rows.slice(i, i + 1000));
        if (error) throw error;
      }
      return quantity;
    },
  });
}

/** Returns all codes of a batch (used for CSV export). Viewer role suffices. */
export async function fetchQrBatchCodes(batch: string) {
  return staffAction({
    role: 'editor', action: 'rewards.qr.export', entity: 'qr_codes', entityId: batch, revalidate: [],
    fn: async (db) => {
      const out: { code: string; uses: number; max_uses: number }[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('qr_codes').select('code, uses, max_uses').eq('batch', batch).order('code').range(from, from + 999);
        if (error) throw error;
        out.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return out;
    },
  });
}
