import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'admin' | 'editor' | 'viewer' | 'sponsor';
export interface Staff { id: string; email: string; full_name: string | null; role: StaffRole }
export interface SponsorUser extends Staff { sponsor_id: string }

/**
 * Returns the logged-in staff member or redirects to /login (or /no-access if not staff).
 * The 'sponsor' role is NOT staff: it is routed to its portal and nothing else.
 */
export async function requireStaff(minRole: Exclude<StaffRole, 'sponsor'> = 'viewer'): Promise<Staff> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: staff } = await supabase.from('staff').select('*').eq('id', user.id).maybeSingle();
  if (!staff) redirect('/login?error=not-staff');
  if (staff.role === 'sponsor') redirect('/portal');
  const rank: Record<Exclude<StaffRole, 'sponsor'>, number> = { viewer: 0, editor: 1, admin: 2 };
  if (rank[staff.role as Exclude<StaffRole, 'sponsor'>] < rank[minRole]) redirect('/?error=forbidden');
  return { id: staff.id, email: user.email ?? '', full_name: staff.full_name, role: staff.role as StaffRole };
}

/** Returns the logged-in sponsor-portal user or redirects (staff land back on the dashboard). */
export async function requireSponsor(): Promise<SponsorUser> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: staff } = await supabase.from('staff').select('*').eq('id', user.id).maybeSingle();
  if (!staff) redirect('/login?error=not-staff');
  if (staff.role !== 'sponsor' || !staff.sponsor_id) redirect('/');
  return { id: staff.id, email: user.email ?? '', full_name: staff.full_name, role: 'sponsor', sponsor_id: staff.sponsor_id };
}
