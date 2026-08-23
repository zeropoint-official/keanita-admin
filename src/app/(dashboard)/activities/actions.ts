'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

export const activitySchema = z.object({
  kind: z.enum(['puzzle', 'download']),
  title: z.string().min(2, 'Απαιτείται τίτλος'),
  category: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  file_url: z.string().min(1, 'Απαιτείται αρχείο PDF'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().default(0),
});
export type ActivityInput = z.input<typeof activitySchema>;

const REVALIDATE = ['/activities', '/'];

export async function saveActivity(id: string | null, input: ActivityInput) {
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const values = { ...parsed.data, category: parsed.data.category?.trim() || null, image_url: parsed.data.image_url || null };
  return staffAction({
    action: id ? 'activities.update' : 'activities.create', entity: 'activities', entityId: id, payload: values, revalidate: REVALIDATE,
    fn: async (db) => {
      const q = id ? db.from('activities').update(values).eq('id', id) : db.from('activities').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export async function setActivityStatus(id: string, status: 'draft' | 'published' | 'archived') {
  return staffAction({ action: 'activities.status', entity: 'activities', entityId: id, payload: { status }, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('activities').update({ status }).eq('id', id); if (error) throw error; } });
}

export async function deleteActivity(id: string) {
  return staffAction({ role: 'admin', action: 'activities.delete', entity: 'activities', entityId: id, revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('activities').delete().eq('id', id); if (error) throw error; } });
}
