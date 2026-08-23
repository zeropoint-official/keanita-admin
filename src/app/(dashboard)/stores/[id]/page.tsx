import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { StoreForm } from '../store-form';
import { StoreActions } from './store-actions';
import type { StoreInput } from '../actions';

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: store }, { data: discounts }, { data: categories }] = await Promise.all([
    supabase.from('stores').select('*').eq('id', id).maybeSingle(),
    supabase.from('store_discounts').select('value, description').eq('store_id', id).order('sort_order'),
    supabase.from('store_categories').select('id, name').order('sort_order').order('name'),
  ]);
  if (!store) notFound();

  const initial: Partial<StoreInput> = {
    name: store.name, category_id: store.category_id, phone: store.phone ?? '', website: store.website ?? '',
    description: store.description ?? '', address: store.address ?? '', city: store.city ?? '', logo_url: store.logo_url,
    status: store.status, sort_order: store.sort_order,
    discounts: (discounts ?? []).map((d) => ({ value: d.value, description: d.description })),
  };

  return (
    <div>
      <PageHeader title={store.name} description={[store.city, store.phone].filter(Boolean).join(' · ')}>
        <StatusBadge value={store.status} />
        <StoreActions id={id} status={store.status} />
      </PageHeader>
      <StoreForm id={id} initial={initial} categories={categories ?? []} />
    </div>
  );
}
