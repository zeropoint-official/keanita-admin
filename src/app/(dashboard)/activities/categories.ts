import type { createClient } from '@/lib/supabase/server';

/** Distinct, non-empty activity categories (for the datalist). */
export async function loadCategories(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string[]> {
  const { data } = await supabase.from('activities').select('category').not('category', 'is', null);
  return [...new Set((data ?? []).map((r) => r.category).filter((c): c is string => !!c && !!c.trim()))].sort((a, b) => a.localeCompare(b, 'el'));
}
