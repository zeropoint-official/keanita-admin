import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { ProductCategoriesManager } from './categories-manager';

export default async function ProductCategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('product_categories').select('key, name, plural_name, emoji, sort_order').order('sort_order').order('name'),
    supabase.from('products').select('category'),
  ]);
  const counts: Record<string, number> = {};
  for (const p of products ?? []) counts[p.category] = (counts[p.category] ?? 0) + 1;
  const rows = (categories ?? []).map((c) => ({ ...c, count: counts[c.key] ?? 0 }));

  return (
    <div>
      <PageHeader title="Κατηγορίες προϊόντων" description="Οι κατηγορίες εμφανίζονται ως φίλτρα στην εφαρμογή — μόνο όσες έχουν δημοσιευμένα προϊόντα.">
        <Button variant="outline" render={<Link href="/products" />}><ArrowLeft className="h-4 w-4 mr-1" />Προϊόντα</Button>
      </PageHeader>
      <ProductCategoriesManager rows={rows} />
    </div>
  );
}
