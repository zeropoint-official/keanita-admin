import Link from 'next/link';
import { Plus, Tags } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { StoresTable } from './stores-table';

export default async function StoresPage() {
  const supabase = await createClient();
  const [{ data: stores }, { data: categories }] = await Promise.all([
    supabase.from('stores').select('id, name, phone, city, logo_url, status, sort_order, category_id, category:store_categories(name), store_discounts(value, description, sort_order)').order('sort_order').order('name'),
    supabase.from('store_categories').select('id, name').order('sort_order').order('name'),
  ]);

  const rows = (stores ?? []).map((s) => ({
    id: s.id, name: s.name, phone: s.phone, city: s.city, logo_url: s.logo_url, status: s.status, sort_order: s.sort_order,
    category_id: s.category_id,
    category_name: (s.category as unknown as { name: string } | null)?.name ?? null,
    discounts: [...(s.store_discounts ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((d) => ({ value: d.value, description: d.description })),
  }));

  return (
    <div>
      <PageHeader title="Καταστήματα & Εκπτώσεις" description="Συνεργαζόμενα καταστήματα και οι εκπτώσεις που προσφέρουν στα μέλη.">
        <Button variant="outline" render={<Link href="/stores/categories" />}><Tags className="h-4 w-4 mr-1" />Κατηγορίες</Button>
        <Button render={<Link href="/stores/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέο κατάστημα</Button>
      </PageHeader>
      <StoresTable rows={rows} categories={categories ?? []} />
    </div>
  );
}
