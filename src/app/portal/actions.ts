'use server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/actions';
import { requireSponsor } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const REDEEM_ERROR: Record<string, string> = {
  'award not found': 'Το δώρο δεν βρέθηκε',
  'award not redeemable': 'Το δώρο έχει ήδη εξαργυρωθεί ή ανακληθεί',
  'award expired': 'Το δώρο έχει λήξει',
  forbidden: 'Δεν έχεις δικαίωμα εξαργύρωσης',
};

/**
 * Redeem with the SPONSOR'S OWN session: the redeem_award RPC verifies the
 * award belongs to one of this sponsor's campaigns and writes the audit row.
 */
export async function portalRedeemAward(id: string): Promise<ActionResult<undefined>> {
  await requireSponsor();
  const supabase = await createClient();
  const { error } = await supabase.rpc('redeem_award', { p_award: id });
  if (error) return { ok: false, error: REDEEM_ERROR[error.message] ?? 'Κάτι πήγε στραβά' };
  revalidatePath('/portal');
  return { ok: true };
}
