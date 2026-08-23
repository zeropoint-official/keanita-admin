import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { CategoriesManager } from './categories-manager';

export default async function StoreCategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: stores }] = await Promise.all([
    supabase.from('store_categories').select('id, name, sort_order').order('sort_order').order('name'),
    supabase.from('stores').select('category_id'),
  ]);
  const counts: Record<number, number> = {};
  for (const s of stores ?? []) if (s.category_id != null) counts[s.category_id] = (counts[s.category_id] ?? 0) + 1;
  const rows = (categories ?? []).map((c) => ({ ...c, count: counts[c.id] ?? 0 }));

  return (
    <div>
      <PageHeader title="Κατηγορίες καταστημάτων" description="Οι κατηγορίες που ομαδοποιούν τα συνεργαζόμενα καταστήματα.">
        <Button variant="outline" render={<Link href="/stores" />}><ArrowLeft className="h-4 w-4 mr-1" />Καταστήματα</Button>
      </PageHeader>
      <CategoriesManager rows={rows} />
    </div>
  );
}
