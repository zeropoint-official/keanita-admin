import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StoreForm } from '../store-form';

export default async function NewStorePage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('store_categories').select('id, name').order('sort_order').order('name');
  return (<div><PageHeader title="Νέο κατάστημα" /><StoreForm id={null} categories={categories ?? []} /></div>);
}
