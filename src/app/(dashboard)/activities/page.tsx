import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { ActivitiesTable } from './activities-table';

export default async function ActivitiesPage() {
  const supabase = await createClient();
  const { data: activities } = await supabase
    .from('activities').select('id, kind, title, category, image_url, file_url, status, sort_order')
    .order('sort_order').order('created_at', { ascending: false });

  return (
    <div>
      <PageHeader title="Δραστηριότητες" description="Χρωμοσελίδες και αρχεία PDF που κατεβάζουν τα μέλη από την εφαρμογή.">
        <Button render={<Link href="/activities/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέα δραστηριότητα</Button>
      </PageHeader>
      <ActivitiesTable rows={activities ?? []} />
    </div>
  );
}
