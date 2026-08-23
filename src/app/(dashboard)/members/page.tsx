import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { MembersSearch } from './members-search';

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const supabase = await createClient();
  const [{ count: totalParents }, { count: totalKids }, { count: pendingKids }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  let query = supabase.from('profiles').select('id, firstname, lastname, email, mobile, district, is_active, created_at, last_seen_at, kids(count)').order('created_at', { ascending: false }).limit(100);
  if (q.trim()) {
    const term = q.trim().replace(/[%,]/g, '');
    query = query.or(`firstname.ilike.%${term}%,lastname.ilike.%${term}%,email.ilike.%${term}%,mobile.ilike.%${term}%`);
  }
  const { data: parents } = await query;
  const rows = (parents ?? []).map((p) => ({ ...p, kids: (p.kids as unknown as { count: number }[])[0]?.count ?? 0 }));

  return (
    <div>
      <PageHeader title="Μέλη" description={`${totalParents?.toLocaleString('el-GR')} γονείς · ${totalKids?.toLocaleString('el-GR')} παιδιά`}>
        <Button variant={pendingKids ? 'default' : 'outline'} render={<Link href="/members/kids" />} className={pendingKids ? 'bg-[#E60C10] hover:bg-[#c50a0d]' : ''}>
          Παιδιά σε αναμονή {pendingKids ? `(${pendingKids})` : ''}
        </Button>
      </PageHeader>
      <MembersSearch q={q} rows={rows} />
    </div>
  );
}
