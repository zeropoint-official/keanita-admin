import { createClient } from '@/lib/supabase/server';
import { SectionTabs } from '@/components/shared/section-tabs';
import { fmtNum } from '@/lib/format';
import { PageHeader } from '@/components/shared/page-header';
import { KidsQueue } from './kids-queue';
import { PAGE_SIZE, buildKidsQuery, cleanTerm, matchingParentIds, type KidFilters } from './query';

interface Search {
  view?: string; q?: string; page?: string;
  from?: string; to?: string; y1?: string; y2?: string;
}

export default async function KidsQueuePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const view = sp.view ?? 'pending';
  const q = sp.q ?? '';
  const supabase = await createClient();

  const { data: maxAgeRow } = await supabase.from('app_settings').select('value').eq('key', 'kid_max_age').maybeSingle();
  const maxAge = Number(maxAgeRow?.value ?? 11);

  const filters: KidFilters = { view, q: cleanTerm(q), from: sp.from, to: sp.to, y1: sp.y1, y2: sp.y2 };
  const parentIds = await matchingParentIds(supabase, filters.q);

  // ONE page — not the whole view. Everything else is reachable by paging,
  // searching, or the export (which pulls all matching rows on demand).
  const page = Math.max(1, Number(sp.page) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const { data, count } = await buildKidsQuery(supabase, filters, maxAge, parentIds)
    .range(start, start + PAGE_SIZE - 1);

  const total = count ?? 0;

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
      <KidsQueue
        view={view}
        q={q}
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        birthday={{ from: sp.from ?? '', to: sp.to ?? '', y1: sp.y1 ?? '', y2: sp.y2 ?? '' }}
        rows={(data ?? []) as never}
      />
    </div>
  );
}
