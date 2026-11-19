import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { SectionTabs } from '@/components/shared/section-tabs';
import { fmtNum } from '@/lib/format';
import { MembersSearch } from './members-search';
import { cleanTerm } from './kids/query';

const PAGE_SIZE = 50;

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? '';
  const term = cleanTerm(q);
  const page = Math.max(1, Number(sp.page) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();

  // ONE page from the server, newest first — every parent is reachable by paging, and a search pages
  // through all its matches. `id` breaks ties: thousands of imported parents share a created_at, and
  // without a unique sort key Postgres may repeat some rows and skip others between pages.
  let query = supabase.from('profiles')
    .select('id, firstname, lastname, email, mobile, is_active, created_at, kids(first_name, status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (term) {
    query = query.or(`firstname.ilike.%${term}%,lastname.ilike.%${term}%,email.ilike.%${term}%,mobile.ilike.%${term}%`);
  }

  const [{ data: parents, count, error }, { count: totalParents }, { count: totalKids }, { count: pendingKids }] = await Promise.all([
    query.range(start, start + PAGE_SIZE - 1),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  // A page past the end (old link, or the list shrank) → back to the first page of the same search.
  if (error && page > 1) redirect(q.trim() ? `/members?q=${encodeURIComponent(q.trim())}` : '/members');

  return (
    <div>
      <PageHeader title="Μέλη" description={`${fmtNum(totalParents)} γονείς · ${fmtNum(totalKids)} παιδιά`} />
      <SectionTabs active="/members" tabs={[
        { href: '/members', label: `Γονείς (${fmtNum(totalParents)})` },
        { href: '/members/kids', label: `Παιδιά (${fmtNum(totalKids)})`, badge: pendingKids ?? 0 },
      ]} />
      <MembersSearch q={q} page={page} pageSize={PAGE_SIZE} total={count ?? 0} rows={(parents ?? []) as never} />
    </div>
  );
}
