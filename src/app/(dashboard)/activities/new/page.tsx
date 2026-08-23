import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { ActivityForm } from '../activity-form';
import { loadCategories } from '../categories';

export default async function NewActivityPage() {
  const supabase = await createClient();
  const categories = await loadCategories(supabase);
  return (<div><PageHeader title="Νέα δραστηριότητα" /><ActivityForm id={null} categories={categories} /></div>);
}
