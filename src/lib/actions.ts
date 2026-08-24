'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff, type StaffRole } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Run a privileged mutation as staff: verifies role, runs `fn` with the service-role client,
 * writes an audit_log row, revalidates paths. Always returns a result object (never throws to the client).
 */
export async function staffAction<T>(opts: {
  role?: StaffRole;
  action: string;            // 'events.update'
  entity: string;            // 'events'
  entityId?: string | null;
  payload?: unknown;
  revalidate?: string[];
  fn: (db: ReturnType<typeof createAdminClient>, staffId: string) => Promise<T>;
}): Promise<ActionResult<T>> {
  try {
    const staff = await requireStaff(opts.role ?? 'editor');
    const db = createAdminClient();
    const data = await opts.fn(db, staff.id);
    await db.from('audit_log').insert({
      actor_id: staff.id, action: opts.action, entity: opts.entity,
      entity_id: opts.entityId ?? null, payload: (opts.payload ?? null) as never,
    });
    opts.revalidate?.forEach((p) => revalidatePath(p));
    return { ok: true, data };
  } catch (e) {
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e;
    const msg = e instanceof Error ? e.message : 'Κάτι πήγε στραβά';
    console.error(`[${opts.action}]`, e);
    return { ok: false, error: msg };
  }
}
