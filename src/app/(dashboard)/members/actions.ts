'use server';
import { staffAction } from '@/lib/actions';
import type { Database } from '@/lib/database.types';
type KidUpdate = Database['public']['Tables']['kids']['Update'];
export type KidStatus = Database['public']['Enums']['kid_status'];

export async function setKidStatus(kidId: string, status: 'approved' | 'rejected' | 'expired' | 'pending', reason?: string) {
  return staffAction({ action: `kids.${status}`, entity: 'kids', entityId: kidId, payload: { status, reason }, revalidate: ['/members', '/members/kids', '/'],
    fn: async (db) => {
      const patch: KidUpdate = { status, reject_reason: status === 'rejected' ? reason ?? null : null };
      if (status === 'expired') patch.expired_at = new Date().toISOString();
      if (status === 'pending') { patch.approved_at = null; patch.expired_at = null; }
      const { error } = await db.from('kids').update(patch).eq('id', kidId);
      if (error) throw error;
    } });
}

export async function setParentActive(parentId: string, isActive: boolean) {
  return staffAction({ action: isActive ? 'profiles.activate' : 'profiles.deactivate', entity: 'profiles', entityId: parentId, revalidate: ['/members', `/members/${parentId}`],
    fn: async (db) => {
      const { error } = await db.from('profiles').update({ is_active: isActive }).eq('id', parentId);
      if (error) throw error;
      // also block login when deactivated
      await db.auth.admin.updateUserById(parentId, { ban_duration: isActive ? 'none' : '876000h' });
    } });
}

export async function adjustPoints(parentId: string, amount: number, note: string) {
  if (!Number.isInteger(amount) || amount === 0) return { ok: false as const, error: 'Μη έγκυρο ποσό' };
  if (!note.trim()) return { ok: false as const, error: 'Απαιτείται αιτιολογία' };
  return staffAction({ role: 'admin', action: 'points.adjust', entity: 'points_ledger', entityId: parentId, payload: { amount, note }, revalidate: [`/members/${parentId}`, '/rewards'],
    fn: async (db, staffId) => {
      const { error } = await db.from('points_ledger').insert({ user_id: parentId, amount, reason: 'manual', label: note.trim(), created_by: staffId,
        expires_at: amount > 0 ? new Date(Date.now() + 365 * 86400e3).toISOString() : null });
      if (error) throw error;
    } });
}

export async function updateParent(parentId: string, values: { firstname: string; lastname: string; mobile: string; district: string; city: string }) {
  return staffAction({ action: 'profiles.update', entity: 'profiles', entityId: parentId, payload: values, revalidate: [`/members/${parentId}`, '/members'],
    fn: async (db) => { const { error } = await db.from('profiles').update(values).eq('id', parentId); if (error) throw error; } });
}

export async function saveKid(parentId: string, kidId: string | null, values: { first_name: string; last_name: string; dob: string; gender: 'boy' | 'girl' | 'other' | null }) {
  return staffAction({ action: kidId ? 'kids.update' : 'kids.create', entity: 'kids', entityId: kidId, payload: values, revalidate: [`/members/${parentId}`, '/members/kids'],
    fn: async (db) => {
      const q = kidId ? db.from('kids').update(values).eq('id', kidId) : db.from('kids').insert({ ...values, parent_id: parentId });
      const { error } = await q; if (error) throw error;
    } });
}

export async function deleteKid(parentId: string, kidId: string) {
  return staffAction({ role: 'admin', action: 'kids.delete', entity: 'kids', entityId: kidId, revalidate: [`/members/${parentId}`, '/members/kids'],
    fn: async (db) => { const { error } = await db.from('kids').delete().eq('id', kidId); if (error) throw error; } });
}
