'use server';
import { z } from 'zod';
import { staffAction } from '@/lib/actions';

export const eventSchema = z.object({
  type: z.enum(['event', 'seminar', 'announcement']),
  title: z.string().min(2, 'Απαιτείται τίτλος'),
  description: z.string().default(''),
  date: z.string().min(1, 'Απαιτείται ημερομηνία'),
  time_label: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  accent_color: z.string().default('#E84D3D'),
  bg_color: z.string().default('#FFF0EE'),
  highlights: z.array(z.object({ emoji: z.string(), label: z.string() })).default([]),
  rsvp_points: z.coerce.number().int().min(0).default(10),
  capacity: z.coerce.number().int().positive().nullable().default(null),
  show_on_home: z.boolean().default(true),
  show_call_button: z.boolean().default(false),
  allow_registration: z.boolean().default(true),
  notify_on: z.string().nullable().default(null),
  notify_min_age: z.coerce.number().int().min(0).max(18).nullable().default(null),
  notify_max_age: z.coerce.number().int().min(0).max(18).nullable().default(null),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
});
export type EventInput = z.input<typeof eventSchema>;

export async function saveEvent(id: string | null, input: EventInput) {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const values = { ...parsed.data, notify_on: parsed.data.notify_on || null, capacity: parsed.data.capacity || null };
  return staffAction({
    action: id ? 'events.update' : 'events.create', entity: 'events', entityId: id, payload: values,
    revalidate: ['/events', '/', '/home-screen'],
    fn: async (db, staffId) => {
      const q = id
        ? db.from('events').update(values).eq('id', id)
        : db.from('events').insert({ ...values, created_by: staffId });
      const { data, error } = await q.select('id').single();
      if (error) throw error;
      return data.id as string;
    },
  });
}

export async function setEventStatus(id: string, status: 'draft' | 'published' | 'archived') {
  return staffAction({ action: 'events.status', entity: 'events', entityId: id, payload: { status }, revalidate: ['/events', '/'],
    fn: async (db) => { const { error } = await db.from('events').update({ status }).eq('id', id); if (error) throw error; } });
}

export async function deleteEvent(id: string) {
  return staffAction({ role: 'admin', action: 'events.delete', entity: 'events', entityId: id, revalidate: ['/events', '/'],
    fn: async (db) => { const { error } = await db.from('events').delete().eq('id', id); if (error) throw error; } });
}

export async function toggleCheckIn(registrationId: string, checkedIn: boolean) {
  return staffAction({ action: 'events.checkin', entity: 'event_registrations', entityId: registrationId, payload: { checkedIn }, revalidate: ['/events'],
    fn: async (db) => { const { error } = await db.from('event_registrations').update({ checked_in_at: checkedIn ? new Date().toISOString() : null }).eq('id', registrationId); if (error) throw error; } });
}
