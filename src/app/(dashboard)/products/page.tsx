import Link from 'next/link';
import { Plus, Tags } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { ProductsTable } from './products-table';

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('id, name, category, tagline, image_url, status, sort_order').order('sort_order').order('name'),
    supabase.from('product_categories').select('key, name, plural_name').order('sort_order').order('name'),
  ]);

  return (
    <div>
      <PageHeader title="Προϊόντα" description="Τα προϊόντα που εμφανίζονται στην εφαρμογή.">
        <Button variant="outline" render={<Link href="/products/categories" />}><Tags className="h-4 w-4 mr-1" />Κατηγορίες</Button>
        <Button render={<Link href="/products/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέο προϊόν</Button>
      </PageHeader>
      <ProductsTable rows={products ?? []} categories={categories ?? []} />
    </div>
  );
}
