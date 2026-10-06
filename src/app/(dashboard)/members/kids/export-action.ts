'use server';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  MAX_EXPORT_ROWS, MAX_PAGE, buildKidsQuery, cleanTerm, matchingParentIds, type KidFilters,
} from './query';

export interface ExportRow {
  first_name: string; last_name: string | null; dob: string; gender: string | null;
  status: string; member_id: string | null;
  parent: {
    firstname: string | null; lastname: string | null; mobile: string | null; email: string | null;
    street_address: string | null; household_number: string | null; building_name: string | null;
    zipcode: string | null; district: string | null; city: string | null; area: string | null;
  } | null;
}

/**
 * Every row matching the current filters, for the Excel export.
 *
 * This is the one path allowed to pull the whole view, and it only runs when a
 * staff member clicks Export — browsing stays on a single 50-row page.
 */
export async function fetchKidsForExport(filters: KidFilters): Promise<
  { ok: true; rows: ExportRow[]; truncated: boolean } | { ok: false; error: string }
> {
  try {
    await requireStaff('viewer');
    const supabase = await createClient();

    const { data: maxAgeRow } = await supabase.from('app_settings').select('value').eq('key', 'kid_max_age').maybeSingle();
    const maxAge = Number(maxAgeRow?.value ?? 11);

    const f: KidFilters = { ...filters, q: cleanTerm(filters.q ?? '') };
    const parentIds = await matchingParentIds(supabase, f.q);

    // First page also tells us the true size.
    const { data: first, count, error } = await buildKidsQuery(supabase, f, maxAge, parentIds).range(0, MAX_PAGE - 1);
    if (error) throw error;

    const total = count ?? 0;
    const capped = Math.min(total, MAX_EXPORT_ROWS);
    let rows = first ?? [];

    if (capped > MAX_PAGE) {
      // PostgREST caps each response at 1000 rows — fetch the rest in parallel.
      const pages = Math.ceil(capped / MAX_PAGE);
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, i) =>
          buildKidsQuery(supabase, f, maxAge, parentIds).range((i + 1) * MAX_PAGE, (i + 2) * MAX_PAGE - 1)),
      );
      rows = [...rows, ...rest.flatMap((r) => r.data ?? [])];
    }

    return { ok: true, rows: rows as unknown as ExportRow[], truncated: total > capped };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Η εξαγωγή απέτυχε' };
  }
}
