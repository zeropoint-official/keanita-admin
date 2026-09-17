import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { SponsorForm } from '../sponsor-form';
import { SponsorActions } from './sponsor-actions';
import { SponsorInvite } from './sponsor-invite';
import type { SponsorInput } from '../actions';

export default async function SponsorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: sponsor }, { count: campaignCount }] = await Promise.all([
    supabase.from('sponsors').select('*').eq('id', id).maybeSingle(),
    supabase.from('sponsor_campaigns').select('id', { count: 'exact', head: true }).eq('sponsor_id', id),
  ]);
  if (!sponsor) notFound();

  const initial: Partial<SponsorInput> = { ...sponsor, contact_name: sponsor.contact_name ?? '', contact_email: sponsor.contact_email ?? '' };

  return (
    <div>
      <PageHeader title={sponsor.name} description={`${campaignCount ?? 0} καμπάνιες`}>
        <StatusBadge value={sponsor.status} />
        <SponsorActions id={id} />
      </PageHeader>
      <SponsorForm id={id} initial={initial} />
      <SponsorInvite sponsorId={id} />
    </div>
  );
}
