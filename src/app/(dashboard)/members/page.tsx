import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { SectionTabs } from '@/components/shared/section-tabs';
import { fmtNum } from '@/lib/format';
import { MembersSearch } from './members-search';

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const supabase = await createClient();
  const [{ count: totalParents }, { count: totalKids }, { count: pendingKids }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  let query = supabase.from('profiles')
    .select('id, firstname, lastname, email, mobile, is_active, created_at, kids(first_name, status)')
    .order('created_at', { ascending: false }).limit(100);
  if (q.trim()) {
    const term = q.trim().replace(/[^\p{L}\p{N}@ ._+-]/gu, '');
    query = query.or(`firstname.ilike.%${term}%,lastname.ilike.%${term}%,email.ilike.%${term}%,mobile.ilike.%${term}%`);
  }
  const { data: parents } = await query;

  return (
    <div>
      <PageHeader title="Μέλη" description={`${fmtNum(totalParents)} γονείς · ${fmtNum(totalKids)} παιδιά`} />
      <SectionTabs active="/members" tabs={[
        { href: '/members', label: `Γονείς (${fmtNum(totalParents)})` },
        { href: '/members/kids', label: `Παιδιά (${fmtNum(totalKids)})`, badge: pendingKids ?? 0 },
      ]} />
      <MembersSearch q={q} rows={(parents ?? []) as never} />
    </div>
  );
}
