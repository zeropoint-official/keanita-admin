'use server';
import { z } from 'zod';
import { staffAction, type ActionResult } from '@/lib/actions';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const audienceSchema = z.object({
  all: z.boolean().optional(),
  kid_min_age: z.coerce.number().int().min(0).max(18).nullable().optional(),
  kid_max_age: z.coerce.number().int().min(0).max(18).nullable().optional(),
  kid_status: z.enum(['approved', 'pending', 'any']).nullable().optional(),
  districts: z.array(z.string()).optional(),
  user_ids: z.array(z.string()).optional(),
});
export type Audience = z.infer<typeof audienceSchema>;

export const campaignSchema = z.object({
  title: z.string().min(2, 'Απαιτείται τίτλος'),
  body: z.string().min(2, 'Απαιτείται κείμενο').max(140, 'Μέγιστο 140 χαρακτήρες'),
  type: z.enum(['event', 'reward', 'gift', 'system']),
  link_type: z.enum(['none', 'event', 'product', 'screen', 'url']).default('none'),
  link_target: z.string().nullable().default(null),
  audience_mode: z.enum(['all', 'targeted', 'test']).default('all'),
  kid_min_age: z.coerce.number().int().min(0).max(18).nullable().default(null),
  kid_max_age: z.coerce.number().int().min(0).max(18).nullable().default(null),
  kid_status: z.enum(['approved', 'pending', 'any']).default('any'),
  districts: z.string().default(''),
  schedule_mode: z.enum(['now', 'later']).default('now'),
  scheduled_at: z.string().nullable().default(null),
});
export type CampaignInput = z.input<typeof campaignSchema>;

/** Builds the JSON audience filter stored in push_campaigns.audience. */
async function buildAudience(v: z.infer<typeof campaignSchema>, staffId: string): Promise<Audience> {
  if (v.audience_mode === 'test') return { user_ids: [staffId] };
  if (v.audience_mode === 'all') return { all: true };
  const districts = v.districts.split(',').map((s) => s.trim()).filter(Boolean);
  const a: Audience = {};
  if (v.kid_min_age != null && !Number.isNaN(v.kid_min_age)) a.kid_min_age = v.kid_min_age;
  if (v.kid_max_age != null && !Number.isNaN(v.kid_max_age)) a.kid_max_age = v.kid_max_age;
  if (v.kid_status !== 'any') a.kid_status = v.kid_status;
  if (districts.length) a.districts = districts;
  return Object.keys(a).length ? a : { all: true };
}

function parseCampaign(input: CampaignInput) {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.link_type !== 'none' && !v.link_target) return { ok: false as const, error: 'Επίλεξε προορισμό για τον σύνδεσμο' };
  if (v.schedule_mode === 'later' && !v.scheduled_at) return { ok: false as const, error: 'Επίλεξε ημερομηνία/ώρα αποστολής' };
  return { ok: true as const, v };
}

/** Save as draft (status stays draft) or schedule (status=scheduled). */
export async function saveCampaign(id: string | null, input: CampaignInput, mode: 'draft' | 'schedule') {
  const p = parseCampaign(input);
  if (!p.ok) return p;
  const v = p.v;
  return staffAction({
    action: id ? 'push_campaigns.update' : 'push_campaigns.create', entity: 'push_campaigns', entityId: id, payload: { ...v, mode },
    revalidate: ['/notifications'],
    fn: async (db, staffId) => {
      const audience = await buildAudience(v, staffId);
      const scheduled_at = mode === 'schedule' ? (v.schedule_mode === 'now' ? new Date().toISOString() : new Date(v.scheduled_at!).toISOString()) : (v.scheduled_at ? new Date(v.scheduled_at).toISOString() : null);
      const values = {
        title: v.title, body: v.body, type: v.type,
        link_type: v.link_type === 'none' ? null : v.link_type,
        link_target: v.link_type === 'none' ? null : v.link_target,
        audience: audience as never, scheduled_at,
        status: (mode === 'schedule' ? 'scheduled' : 'draft') as 'scheduled' | 'draft',
      };
      if (id) {
        const { data: existing } = await db.from('push_campaigns').select('status').eq('id', id).single();
        if (existing && !['draft', 'scheduled', 'cancelled', 'failed'].includes(existing.status)) throw new Error('Η καμπάνια έχει ήδη σταλεί και δεν επεξεργάζεται');
      }
      const q = id
        ? db.from('push_campaigns').update(values).eq('id', id)
        : db.from('push_campaigns').insert({ ...values, created_by: staffId, source: 'manual' });
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export async function cancelCampaign(id: string) {
  return staffAction({ action: 'push_campaigns.cancel', entity: 'push_campaigns', entityId: id, revalidate: ['/notifications'],
    fn: async (db) => { const { error } = await db.from('push_campaigns').update({ status: 'cancelled' }).eq('id', id).eq('status', 'scheduled'); if (error) throw error; } });
}

export async function deleteCampaign(id: string) {
  return staffAction({ role: 'admin', action: 'push_campaigns.delete', entity: 'push_campaigns', entityId: id, revalidate: ['/notifications'],
    fn: async (db) => { const { error } = await db.from('push_campaigns').delete().eq('id', id); if (error) throw error; } });
}

/** Counts profiles matching an audience filter (used live in the form). Viewer role is enough. */
export async function estimateAudience(audience: Audience): Promise<ActionResult<number>> {
  try {
    await requireStaff('viewer');
    const db = createAdminClient();
    const a = audienceSchema.parse(audience);
    if (a.user_ids?.length) return { ok: true, data: a.user_ids.length };

    const hasKidFilter = a.kid_min_age != null || a.kid_max_age != null || (a.kid_status && a.kid_status !== 'any');
    let parentIds: string[] | null = null;
    if (hasKidFilter) {
      let kq = db.from('kids').select('parent_id, dob, status');
      if (a.kid_status && a.kid_status !== 'any') kq = kq.eq('status', a.kid_status);
      const today = new Date();
      // age >= min  => dob <= today - min years ; age <= max => dob > today - (max+1) years
      if (a.kid_min_age != null) { const d = new Date(today); d.setFullYear(d.getFullYear() - a.kid_min_age); kq = kq.lte('dob', d.toISOString().slice(0, 10)); }
      if (a.kid_max_age != null) { const d = new Date(today); d.setFullYear(d.getFullYear() - a.kid_max_age - 1); kq = kq.gt('dob', d.toISOString().slice(0, 10)); }
      const { data: kids, error } = await kq;
      if (error) throw error;
      parentIds = Array.from(new Set((kids ?? []).map((k) => k.parent_id)));
      if (!parentIds.length) return { ok: true, data: 0 };
    }

    let pq = db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true);
    if (a.districts?.length) pq = pq.in('district', a.districts);
    if (parentIds) pq = pq.in('id', parentIds);
    const { count, error } = await pq;
    if (error) throw error;
    return { ok: true, data: count ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Κάτι πήγε στραβά' };
  }
}

export async function setContactStatus(id: string, status: 'new' | 'read' | 'replied' | 'archived') {
  return staffAction({ action: 'contact_messages.status', entity: 'contact_messages', entityId: id, payload: { status }, revalidate: ['/notifications'],
    fn: async (db) => { const { error } = await db.from('contact_messages').update({ status }).eq('id', id); if (error) throw error; } });
}
