import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { ProductForm } from '../product-form';
import { ProductActions } from './product-actions';
import type { ProductInput } from '../actions';

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
  if (!product) notFound();

  const initial: Partial<ProductInput> = {
    ...product,
    tagline: product.tagline ?? '', description: product.description ?? '', serving_size: product.serving_size ?? '',
    highlights: product.highlights ?? [], ingredients: product.ingredients ?? [],
    nutrition: Array.isArray(product.nutrition) ? (product.nutrition as { label: string; value: string }[]) : [],
  };

  return (
    <div>
      <PageHeader title={product.name} description={product.tagline ?? undefined}>
        <StatusBadge value={product.category} />
        <StatusBadge value={product.status} />
        <ProductActions id={id} status={product.status} />
      </PageHeader>
      <ProductForm id={id} initial={initial} />
    </div>
  );
}
