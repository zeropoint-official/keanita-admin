'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { staffAction } from '@/lib/actions';
import type { ActionResult } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { localInputToIso } from '@/lib/format';
import { validateCampaign, type CampaignRuleInput } from '@/lib/campaign-rules';

const sponsorSchema = z.object({
  name: z.string().min(1, 'Το όνομα είναι υποχρεωτικό'),
  logo_path: z.string().nullable().default(null),
  brand_color: z.string().nullable().default(null),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  contact_name: z.string().nullable().default(null),
  contact_email: z.string().nullable().default(null),
});
export type SponsorInput = z.input<typeof sponsorSchema>;

export async function saveSponsor(id: string | null, input: SponsorInput) {
  const parsed = sponsorSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const values = {
    ...parsed.data,
    brand_color: parsed.data.brand_color || null,
    contact_name: parsed.data.contact_name?.trim() || null,
    contact_email: parsed.data.contact_email?.trim() || null,
  };
  return staffAction({
    action: id ? 'sponsors.update' : 'sponsors.create', entity: 'sponsors', entityId: id, payload: values, revalidate: ['/sponsors'],
    fn: async (db) => {
      const q = id ? db.from('sponsors').update(values).eq('id', id) : db.from('sponsors').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export async function deleteSponsor(id: string) {
  return staffAction({ role: 'admin', action: 'sponsors.delete', entity: 'sponsors', entityId: id, revalidate: ['/sponsors'],
    fn: async (db) => { const { error } = await db.from('sponsors').delete().eq('id', id); if (error) throw error; } });
}

const blankOrInt = (min: number, max?: number) => {
  let n = z.coerce.number().int().min(min);
  if (max != null) n = n.max(max);
  return z.union([z.literal(''), n]).default('');
};

const campaignSchema = z.object({
  sponsor_id: z.string().min(1, 'Επίλεξε χορηγό'),
  title: z.string().min(1, 'Ο τίτλος είναι υποχρεωτικός'),
  prize_image_path: z.string().nullable().default(null),
  profile_text: z.string().min(1, 'Οι οδηγίες παραλαβής είναι υποχρεωτικές'),
  redeem_link: z.string().nullable().default(null),
  status: z.enum(['draft', 'active', 'paused', 'ended']).default('draft'),
  starts_at: z.string().nullable().default(null),
  ends_at: z.string().nullable().default(null),
  // Gifts are won in the game, one of two ways; everything else is a requirement.
  trigger: z.enum(['game_milestone', 'game_drop']),
  every_points: blankOrInt(5),
  chance_pct: z.union([z.literal(''), z.coerce.number().positive().max(5, 'Η πιθανότητα δεν μπορεί να ξεπερνά το 5%')]).default(''),
  fulfillment: z.enum(['pickup', 'code']).default('pickup'),
  quota_mode: z.enum(['total', 'monthly', 'weekly']).default('total'),
  quota_amount: z.coerce.number().int().min(1, 'Η ποσότητα πρέπει να είναι ≥ 1'),
  per_user_limit: z.coerce.number().int().min(1).default(1),
  kid_approved: z.boolean().default(false),
  min_age: blankOrInt(0, 11),
  max_age: blankOrInt(0, 11),
  min_kp: blankOrInt(0),
  max_wins_per_day: blankOrInt(1),
  expiry_days: blankOrInt(1),
});
export type CampaignInput = z.input<typeof campaignSchema>;

export async function saveCampaign(id: string | null, input: CampaignInput) {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const trigger_config =
    v.trigger === 'game_milestone' ? { every_points: v.every_points } : { chance: (v.chance_pct as number) / 100 };
  const requirements = {
    ...(v.kid_approved ? { kid_approved: true } : {}),
    ...(v.min_age !== '' ? { min_age: v.min_age } : {}),
    ...(v.max_age !== '' ? { max_age: v.max_age } : {}),
    ...(v.min_kp !== '' ? { min_kp: v.min_kp } : {}),
    ...(v.max_wins_per_day !== '' ? { max_wins_per_day: v.max_wins_per_day } : {}),
  };
  const values = {
    sponsor_id: v.sponsor_id, title: v.title, prize_image_path: v.prize_image_path || null,
    profile_text: v.profile_text, redeem_link: v.redeem_link?.trim() || null, status: v.status,
    starts_at: localInputToIso(v.starts_at), ends_at: localInputToIso(v.ends_at),
    trigger: v.trigger, trigger_config, fulfillment: v.fulfillment,
    quota_mode: v.quota_mode, quota_amount: v.quota_amount, per_user_limit: v.per_user_limit,
    requirements, expiry_days: v.expiry_days === '' ? null : v.expiry_days,
  };
  return staffAction({
    action: id ? 'sponsor_campaigns.update' : 'sponsor_campaigns.create', entity: 'sponsor_campaigns', entityId: id, payload: values, revalidate: ['/sponsors'],
    fn: async (db) => {
      // The rulebook is the law for publishing: drafts save with warnings,
      // an active campaign must pass every constraint.
      if (v.status === 'active') {
        let codes_count = 0;
        if (v.fulfillment === 'code' && id) {
          const { count } = await db.from('campaign_codes').select('id', { count: 'exact', head: true }).eq('campaign_id', id);
          codes_count = count ?? 0;
        }
        const rule: CampaignRuleInput = {
          trigger: v.trigger, every_points: v.every_points, chance_pct: v.chance_pct,
          fulfillment: v.fulfillment, quota_mode: v.quota_mode,
          quota_amount: v.quota_amount, per_user_limit: v.per_user_limit,
          starts_at: v.starts_at, ends_at: v.ends_at, expiry_days: v.expiry_days,
          min_age: v.min_age, max_age: v.max_age, min_kp: v.min_kp,
          max_wins_per_day: v.max_wins_per_day, codes_count,
        };
        const { errors } = validateCampaign(rule);
        if (errors.length) throw new Error(errors[0]);
      }
      const q = id ? db.from('sponsor_campaigns').update(values).eq('id', id) : db.from('sponsor_campaigns').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

/** Paste/CSV batch upload; duplicates (per campaign) are silently skipped. */
export async function uploadCodes(campaignId: string, batchLabel: string, codes: string[]) {
  const clean = Array.from(new Set(codes.map((c) => c.trim()).filter((c) => c.length > 0 && c.length <= 64)));
  if (!clean.length) return { ok: false as const, error: 'Δεν βρέθηκαν κωδικοί' };
  if (clean.length > 20_000) return { ok: false as const, error: 'Έως 20.000 κωδικοί ανά ανέβασμα' };
  return staffAction({
    action: 'campaign_codes.upload', entity: 'campaign_codes', entityId: campaignId,
    payload: { batch: batchLabel || null, count: clean.length }, revalidate: ['/sponsors', `/sponsors/campaigns/${campaignId}`],
    fn: async (db) => {
      let added = 0;
      for (let i = 0; i < clean.length; i += 1000) {
        const chunk = clean.slice(i, i + 1000).map((code) => ({ campaign_id: campaignId, code, batch_label: batchLabel.trim() || null }));
        const { data, error } = await db.from('campaign_codes')
          .upsert(chunk, { onConflict: 'campaign_id,code', ignoreDuplicates: true }).select('id');
        if (error) throw error;
        added += data?.length ?? 0;
      }
      return { added, skipped: clean.length - added };
    },
  });
}

/** Invite a sponsor-portal user (admin only): auth invite email + staff row with role 'sponsor'. */
export async function inviteSponsorUser(sponsorId: string, email: string) {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false as const, error: 'Μη έγκυρο email' };
  return staffAction({
    role: 'admin', action: 'staff.invite_sponsor', entity: 'staff', entityId: sponsorId,
    payload: { email: clean, sponsor_id: sponsorId }, revalidate: ['/sponsors'],
    fn: async (db) => {
      const { data, error } = await db.auth.admin.inviteUserByEmail(clean);
      if (error) {
        throw new Error(/already|exists|registered/i.test(error.message)
          ? 'Υπάρχει ήδη λογαριασμός με αυτό το email — σύνδεσέ τον χειροκίνητα από τη βάση.'
          : error.message);
      }
      const uid = data.user?.id;
      if (!uid) throw new Error('Η πρόσκληση απέτυχε');
      const { error: e2 } = await db.from('staff').upsert({ id: uid, role: 'sponsor', sponsor_id: sponsorId });
      if (e2) throw e2;
      return uid;
    },
  });
}

export async function deleteCampaign(id: string) {
  return staffAction({ role: 'admin', action: 'sponsor_campaigns.delete', entity: 'sponsor_campaigns', entityId: id, revalidate: ['/sponsors'],
    fn: async (db) => { const { error } = await db.from('sponsor_campaigns').delete().eq('id', id); if (error) throw error; } });
}

const REDEEM_ERROR: Record<string, string> = {
  'award not found': 'Το δώρο δεν βρέθηκε',
  'award not redeemable': 'Το δώρο έχει ήδη εξαργυρωθεί ή ανακληθεί',
  'award expired': 'Το δώρο έχει λήξει',
  forbidden: 'Δεν έχεις δικαίωμα εξαργύρωσης',
};

/**
 * Redemption goes through the redeem_award RPC with the STAFF USER'S OWN
 * session (not the service role): the RPC checks the role, stamps
 * redeemed_by and writes the audit_log row itself — so no staffAction here,
 * a second audit row would be a duplicate.
 */
export async function redeemAward(id: string): Promise<ActionResult<void>> {
  await requireStaff('editor');
  const supabase = await createClient();
  const { error } = await supabase.rpc('redeem_award', { p_award: id });
  if (error) return { ok: false, error: REDEEM_ERROR[error.message] ?? 'Κάτι πήγε στραβά' };
  revalidatePath('/sponsors');
  return { ok: true, data: undefined };
}

export async function revokeAward(id: string) {
  return staffAction({
    role: 'admin', action: 'awards.revoke', entity: 'awards', entityId: id, revalidate: ['/sponsors'],
    fn: async (db) => {
      const { data: updated, error } = await db.from('awards')
        .update({ status: 'revoked' }).eq('id', id).eq('status', 'won').select('id');
      if (error) throw error;
      if (!updated?.length) throw new Error('Το δώρο δεν είναι πλέον ενεργό');
    },
  });
}
