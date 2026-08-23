'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

export const characterSchema = z.object({
  name: z.string().min(2, 'Απαιτείται όνομα'),
  slug: z.string().min(2, 'Απαιτείται slug').regex(/^[a-z0-9-]+$/, 'Το slug επιτρέπει μόνο πεζά λατινικά, αριθμούς και παύλες'),
  tagline: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  best_friend: z.string().nullable().default(null),
  power: z.string().nullable().default(null),
  favorite_juice: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  accent_color: z.string().default('#E60C10'),
  bg_color: z.string().default('#FFF0EE'),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  sort_order: z.coerce.number().int().min(0).default(0),
});
export type CharacterInput = z.input<typeof characterSchema>;

const REVALIDATE = ['/characters', '/'];

export async function saveCharacter(id: number | null, input: CharacterInput) {
  const parsed = characterSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const values = {
    ...d,
    tagline: d.tagline || null, description: d.description || null, best_friend: d.best_friend || null,
    power: d.power || null, favorite_juice: d.favorite_juice || null,
  };
  return staffAction({
    action: id ? 'characters.update' : 'characters.create', entity: 'characters', entityId: id == null ? null : String(id), payload: values, revalidate: REVALIDATE,
    fn: async (db) => {
      const q = id ? db.from('characters').update(values).eq('id', id) : db.from('characters').insert(values);
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as number;
    },
  });
}

export async function deleteCharacter(id: number) {
  return staffAction({ role: 'admin', action: 'characters.delete', entity: 'characters', entityId: String(id), revalidate: REVALIDATE,
    fn: async (db) => { const { error } = await db.from('characters').delete().eq('id', id); if (error) throw error; } });
}
