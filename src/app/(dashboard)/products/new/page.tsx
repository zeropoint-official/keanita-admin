import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { ProductForm } from '../product-form';

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from('product_categories').select('key, name').order('sort_order').order('name');
  return (<div><PageHeader title="Νέο προϊόν" /><ProductForm id={null} categories={categories ?? []} initial={categories?.[0] ? { category: categories[0].key } : undefined} /></div>);
}
