'use server';
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
