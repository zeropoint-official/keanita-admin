import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ActivityForm } from '../activity-form';
import { ActivityActions } from './activity-actions';
import { loadCategories } from '../categories';
import type { ActivityInput } from '../actions';

export default async function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: activity }, categories] = await Promise.all([
    supabase.from('activities').select('*').eq('id', id).maybeSingle(),
    loadCategories(supabase),
  ]);
  if (!activity) notFound();

  const initial: Partial<ActivityInput> = {
    kind: activity.kind, title: activity.title, category: activity.category ?? '', image_url: activity.image_url,
    file_url: activity.file_url, status: activity.status, sort_order: activity.sort_order,
  };

  return (
    <div>
      <PageHeader title={activity.title} description={activity.category ?? undefined}>
        <StatusBadge value={activity.kind} />
        <StatusBadge value={activity.status} />
        <ActivityActions id={id} status={activity.status} />
      </PageHeader>
      <ActivityForm id={id} initial={initial} categories={categories} />
    </div>
  );
}
