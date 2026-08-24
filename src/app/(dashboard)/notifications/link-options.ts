import { fmtDate } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';

/** Event/product options for the campaign link selector. */
export async function loadLinkOptions() {
  const supabase = await createClient();
  const [{ data: events }, { data: products }] = await Promise.all([
    supabase.from('events').select('id, title, date').neq('status', 'archived').order('date', { ascending: false }).limit(100),
    supabase.from('products').select('id, name').neq('status', 'archived').order('sort_order').limit(200),
  ]);
  return {
    events: (events ?? []).map((e) => ({ id: e.id, label: `${e.title} (${fmtDate(e.date)})` })),
    products: (products ?? []).map((p) => ({ id: p.id, label: p.name })),
  };
}
