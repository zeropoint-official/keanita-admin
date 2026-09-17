import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { CampaignForm } from '../campaign-form';
import { getForecastStats } from '../../stats';

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const [{ data: sponsors }, stats] = await Promise.all([
    supabase.from('sponsors').select('id, name').neq('status', 'archived').order('name'),
    getForecastStats(supabase),
  ]);
  return (<div><PageHeader title="Νέα καμπάνια" /><CampaignForm id={null} sponsors={sponsors ?? []} stats={stats} codesCount={0} /></div>);
}
