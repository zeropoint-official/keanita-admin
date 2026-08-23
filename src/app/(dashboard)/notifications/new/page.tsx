import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { CampaignForm } from '../campaign-form';

export async function loadLinkOptions() {
  const supabase = await createClient();
  const [{ data: events }, { data: products }] = await Promise.all([
    supabase.from('events').select('id, title, date').neq('status', 'archived').order('date', { ascending: false }).limit(100),
    supabase.from('products').select('id, name').neq('status', 'archived').order('sort_order').limit(200),
  ]);
  return {
    events: (events ?? []).map((e) => ({ id: e.id, label: `${e.title} (${e.date})` })),
    products: (products ?? []).map((p) => ({ id: p.id, label: p.name })),
  };
}

export default async function NewCampaignPage() {
  const opts = await loadLinkOptions();
  return (<div><PageHeader title="Νέα καμπάνια" description="Push ειδοποίηση προς τους γονείς της εφαρμογής." /><CampaignForm id={null} {...opts} /></div>);
}
