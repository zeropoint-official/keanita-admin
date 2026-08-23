import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { ProductsTable } from './products-table';

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, tagline, image_url, status, sort_order')
    .order('sort_order').order('name');

  return (
    <div>
      <PageHeader title="Προϊόντα" description="Χυμοί και γιαούρτια που εμφανίζονται στην εφαρμογή.">
        <Button render={<Link href="/products/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέο προϊόν</Button>
      </PageHeader>
      <ProductsTable rows={products ?? []} />
    </div>
  );
}
