import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { GiftForm } from '../gift-form';
import { GiftActions } from './gift-actions';
import type { GiftInput } from '../actions';

export default async function GiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: gift } = await supabase.from('gifts').select('*').eq('id', id).maybeSingle();
  if (!gift) notFound();

  const initial: Partial<GiftInput> = { ...gift, description: gift.description ?? '', emoji: gift.emoji ?? '', stock: gift.stock ?? '' };

  return (
    <div>
      <PageHeader title={gift.name} description={`${gift.cost} KP`}>
        <StatusBadge value={gift.category} />
        <StatusBadge value={gift.status} />
        <GiftActions id={id} />
      </PageHeader>
      <GiftForm id={id} initial={initial} />
    </div>
  );
}
