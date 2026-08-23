import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { KidsQueue } from './kids-queue';
import type { KidStatus } from '../actions';

export default async function KidsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'pending' } = await searchParams;
  const supabase = await createClient();
  const base = supabase.from('kids').select('id, first_name, last_name, dob, gender, status, member_id, reject_reason, created_at, parent:profiles(id, firstname, lastname, mobile, email)');
  let q;
  if (view === 'expiring') {
    const { data: maxAge } = await supabase.from('app_settings').select('value').eq('key', 'kid_max_age').maybeSingle();
    const age = Number(maxAge?.value ?? 11);
    const limit = new Date(); limit.setFullYear(limit.getFullYear() - age); limit.setMonth(limit.getMonth() + 3);   // turning max age within 3 months
    q = base.eq('status', 'approved').lte('dob', limit.toISOString().slice(0, 10)).order('dob');
  } else if (view === 'birthdays') {
    q = base.eq('status', 'approved').order('dob');   // filtered client-side by month/day
  } else {
    q = base.eq('status', (['pending','approved','rejected','expired'].includes(view) ? view : 'pending') as KidStatus).order('created_at', { ascending: view !== 'pending' }).limit(500);
  }
  const { data } = await q;
  return (
    <div>
      <PageHeader title="Παιδιά" description="Έγκριση νέων μελών, λήξεις και γενέθλια." />
      <KidsQueue view={view} rows={(data ?? []) as never} />
    </div>
  );
}
