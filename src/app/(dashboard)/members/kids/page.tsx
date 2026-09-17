import { createClient } from '@/lib/supabase/server';
import { SectionTabs } from '@/components/shared/section-tabs';
import { fmtNum } from '@/lib/format';
import { PageHeader } from '@/components/shared/page-header';
import { KidsQueue } from './kids-queue';
import type { KidStatus } from '../actions';

const SELECT = 'id, first_name, last_name, dob, gender, status, member_id, reject_reason, created_at, parent:profiles(id, firstname, lastname, mobile, email, city, area)';

export default async function KidsQueuePage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string }> }) {
  const { view = 'pending', q = '' } = await searchParams;
  const supabase = await createClient();
  const { data: maxAgeRow } = await supabase.from('app_settings').select('value').eq('key', 'kid_max_age').maybeSingle();
  const maxAge = Number(maxAgeRow?.value ?? 11);
  const term = q.trim().replace(/[^\p{L}\p{N}@ ._+-]/gu, '');

  const base = () => {
    const b = supabase.from('kids').select(SELECT, { count: 'exact' });
    if (view === 'expiring') {
      const limit = new Date(); limit.setFullYear(limit.getFullYear() - maxAge); limit.setMonth(limit.getMonth() + 3);   // turning max age within 3 months
      return b.eq('status', 'approved').lte('dob', limit.toISOString().slice(0, 10)).order('dob');
    }
    if (view === 'birthdays') return b.eq('status', 'approved');   // month/day windows aren't expressible in PostgREST; filtered client-side
    return b.eq('status', (['pending', 'approved', 'rejected', 'expired'].includes(view) ? view : 'pending') as KidStatus).order('created_at', { ascending: view !== 'pending' });
  };

  let rows: unknown[] = [];
  let viewCount = 0;
  if (view === 'birthdays') {
    // needs every approved kid — fetch the 1000-row pages IN PARALLEL (one roundtrip of latency, not eleven)
    const { count } = await supabase.from('kids').select('id', { count: 'exact', head: true }).eq('status', 'approved');
    const pages = Math.max(1, Math.ceil((count ?? 0) / 1000));
    const results = await Promise.all(Array.from({ length: pages }, (_, i) => base().range(i * 1000, i * 1000 + 999)));
    rows = results.flatMap((r) => r.data ?? []);
    viewCount = count ?? 0;
  } else {
    // one request: the first 1000 of the view (+ optional server-side search across kid, member id and parent)
    let query = base();
    if (term) {
      const { data: parents } = await supabase.from('profiles').select('id')
        .or(`firstname.ilike.%${term}%,lastname.ilike.%${term}%,email.ilike.%${term}%,mobile.ilike.%${term}%`).limit(80);
      const ors = [`first_name.ilike.%${term}%`, `last_name.ilike.%${term}%`, `member_id.ilike.%${term}%`];
      if (parents?.length) ors.push(`parent_id.in.(${parents.map((p) => p.id).join(',')})`);
      query = query.or(ors.join(','));
    }
    const { data, count } = await query.range(0, 999);
    rows = data ?? [];
    viewCount = count ?? 0;
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
      <KidsQueue view={view} q={q} total={viewCount} rows={rows as never} />
    </div>
  );
}
