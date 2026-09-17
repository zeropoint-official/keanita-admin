'use server';
import { headers } from 'next/headers';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

const REVALIDATE = ['/settings', '/'];

const entrySchema = z.array(z.object({ key: z.string().min(1).max(64), value: z.unknown() }));

/** Upsert many app_settings rows. Values are stored as JSON (string/number/boolean/array/object). Admin only. */
export async function saveSettings(entries: { key: string; value: unknown }[]) {
  const parsed = entrySchema.safeParse(entries);
  if (!parsed.success) return { ok: false as const, error: 'Μη έγκυρα δεδομένα' };
  const now = new Date().toISOString();
  const rows = parsed.data.map((e) => ({ key: e.key, value: (e.value ?? null) as never, updated_at: now }));
  return staffAction({
    role: 'admin', action: 'app_settings.update', entity: 'app_settings', entityId: null,
    payload: Object.fromEntries(rows.map((r) => [r.key, r.value])), revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('app_settings').upsert(rows, { onConflict: 'key' }); if (error) throw error; },
  });
}

const pageSchema = z.object({ title: z.string().min(1, 'Απαιτείται τίτλος'), body_md: z.string().default('') });

export async function savePage(slug: string, input: z.input<typeof pageSchema>) {
  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  return staffAction({
    action: 'pages.update', entity: 'pages', entityId: slug, payload: { title: parsed.data.title }, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('pages').upsert({ slug, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: 'slug' }); if (error) throw error; },
  });
}

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Μη έγκυρο email'),
  role: z.enum(['admin', 'editor', 'viewer']),
  fullName: z.string().trim().max(120).optional(),
});

/**
 * Invite a team member to the dashboard by email. If the email already belongs to an
 * app (parent) account, the existing account is granted the staff role instead of
 * erroring — the person keeps one account for both the app and the dashboard.
 */
export async function inviteStaff(input: z.input<typeof inviteSchema>) {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { email, role, fullName } = parsed.data;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const redirectTo = `${proto}://${host}/set-password`;
  return staffAction<{ existing: boolean }>({
    role: 'admin', action: 'staff.invite', entity: 'staff',
    payload: { email, role }, revalidate: REVALIDATE,
    fn: async (db) => {
      // generateLink resolves an existing account's id without sending any email.
      const { data: link } = await db.auth.admin.generateLink({ type: 'recovery', email });
      const existingUid = link?.user?.id ?? null;

      if (existingUid) {
        const { data: row, error: e0 } = await db.from('staff').select('id, role').eq('id', existingUid).maybeSingle();
        if (e0) throw e0;
        if (row && row.role !== 'sponsor') throw new Error('Είναι ήδη μέλος του προσωπικού — άλλαξε τον ρόλο του από τη λίστα.');
        if (row) {
          // A sponsor-portal account being promoted to real staff: swap the
          // role and detach the sponsor link so portal scoping stops applying.
          const { error: e1 } = await db.from('staff')
            .update({ role, sponsor_id: null, ...(fullName ? { full_name: fullName } : {}) })
            .eq('id', existingUid);
          if (e1) throw e1;
        } else {
          const { error: e1 } = await db.from('staff').insert({ id: existingUid, role, full_name: fullName || null });
          if (e1) throw e1;
        }
        // Existing app password keeps working; this email lets them (re)set one if needed.
        const { error: e2 } = await db.auth.resetPasswordForEmail(email, { redirectTo });
        if (e2) console.error('[staff.invite] reset email failed', e2.message);
        return { existing: true };
      }

      const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo, data: fullName ? { full_name: fullName } : undefined });
      if (error || !data?.user) throw new Error(error?.message ?? 'Η πρόσκληση απέτυχε');
      const { error: e3 } = await db.from('staff').insert({ id: data.user.id, role, full_name: fullName || null });
      if (e3) throw e3;
      return { existing: false };
    },
  });
}

export async function setStaffRole(id: string, role: 'admin' | 'editor' | 'viewer') {
  return staffAction({
    role: 'admin', action: 'staff.role', entity: 'staff', entityId: id, payload: { role }, revalidate: REVALIDATE,
    fn: async (db, staffId) => {
      if (id === staffId && role !== 'admin') throw new Error('Δεν μπορείς να αφαιρέσεις τον δικό σου ρόλο διαχειριστή');
      const { error } = await db.from('staff').update({ role }).eq('id', id); if (error) throw error;
    },
  });
}

export async function removeStaff(id: string) {
  return staffAction({
    role: 'admin', action: 'staff.remove', entity: 'staff', entityId: id, revalidate: REVALIDATE,
    fn: async (db, staffId) => {
      if (id === staffId) throw new Error('Δεν μπορείς να αφαιρέσεις τον εαυτό σου');
      const { error } = await db.from('staff').delete().eq('id', id); if (error) throw error;
    },
  });
}
