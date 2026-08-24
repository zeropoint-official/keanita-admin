import { createClient } from '@/lib/supabase/server';
import { SectionTabs } from '@/components/shared/section-tabs';
import { fmtNum } from '@/lib/format';
import { PageHeader } from '@/components/shared/page-header';
import { KidsQueue } from './kids-queue';
import type { KidStatus } from '../actions';

export default async function KidsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = 'pending' } = await searchParams;
  const supabase = await createClient();
    const makeQuery = () => {
    const b = supabase.from('kids').select('id, first_name, last_name, dob, gender, status, member_id, reject_reason, created_at, parent:profiles(id, firstname, lastname, mobile, email)');
    if (view === 'expiring') {
      const limit = new Date(); limit.setFullYear(limit.getFullYear() - maxAge); limit.setMonth(limit.getMonth() + 3);   // turning max age within 3 months
      return b.eq('status', 'approved').lte('dob', limit.toISOString().slice(0, 10)).order('dob');
    }
    if (view === 'birthdays') return b.eq('status', 'approved').order('dob');   // filtered client-side by month/day
    return b.eq('status', (['pending','approved','rejected','expired'].includes(view) ? view : 'pending') as KidStatus).order('created_at', { ascending: view !== 'pending' });
  };
  const { data: maxAgeRow } = await supabase.from('app_settings').select('value').eq('key', 'kid_max_age').maybeSingle();
  const maxAge = Number(maxAgeRow?.value ?? 11);
  // full paged fetch — PostgREST caps single requests at 1000 rows and there are >10k kids
  const data = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await makeQuery().range(from, from + 999);
    data.push(...(page ?? []));
    if (!page || page.length < 1000) break;
  }
  const [{ count: totalParents }, { count: totalKids }, { count: pendingKids }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return (
    <div>
      <PageHeader title="Μέλη" description="Έγκριση νέων μελών, λήξεις και γενέθλια." />
      <SectionTabs active="/members/kids" tabs={[
        { href: '/members', label: `Γονείς (${fmtNum(totalParents)})` },
        { href: '/members/kids', label: `Παιδιά (${fmtNum(totalKids)})`, badge: pendingKids ?? 0 },
      ]} />
      <KidsQueue view={view} rows={(data ?? []) as never} />
    </div>
  );
}
