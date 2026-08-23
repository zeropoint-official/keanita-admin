import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'admin' | 'editor' | 'viewer';
export interface Staff { id: string; email: string; full_name: string | null; role: StaffRole }

/** Returns the logged-in staff member or redirects to /login (or /no-access if not staff). */
export async function requireStaff(minRole: StaffRole = 'viewer'): Promise<Staff> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: staff } = await supabase.from('staff').select('*').eq('id', user.id).maybeSingle();
  if (!staff) redirect('/login?error=not-staff');
  const rank: Record<StaffRole, number> = { viewer: 0, editor: 1, admin: 2 };
  if (rank[staff.role as StaffRole] < rank[minRole]) redirect('/?error=forbidden');
  return { id: staff.id, email: user.email ?? '', full_name: staff.full_name, role: staff.role as StaffRole };
}
