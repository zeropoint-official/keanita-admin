/**
 * One place that turns the Μέλη → Παιδιά filters into a Supabase query, shared
 * by the paged table and the Excel export.
 *
 * The table fetches ONE page; only the export pulls every matching row, and
 * only at the moment someone clicks it. Loading all ~10.5k approved members on
 * every page view cost ~7 MB of JSON (≈15 MB once serialized to the browser).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import type { KidStatus } from '../actions';

export const PAGE_SIZE = 50;
/** PostgREST never returns more than 1000 rows in one response. */
export const MAX_PAGE = 1000;
/** Ceiling on an export so a runaway filter can't try to serialise the table. */
export const MAX_EXPORT_ROWS = 25_000;

// The export feeds printed address labels, so it needs the full street line,
// not just the city.
export const KIDS_SELECT =
  'id, first_name, last_name, dob, gender, status, member_id, reject_reason, created_at, '
  + 'parent:profiles(id, firstname, lastname, mobile, email, street_address, household_number, building_name, zipcode, district, city, area)';

export interface KidFilters {
  view: string;
  q: string;
  /** 'MM-DD' — birthday window start, year ignored. */
  from?: string;
  /** 'MM-DD' — birthday window end, year ignored. */
  to?: string;
  /** Birth-year bounds. */
  y1?: string;
  y2?: string;
}

export const isMD = (v: string | undefined): v is string => !!v && /^\d{2}-\d{2}$/.test(v);

/** Local YYYY-MM-DD, never UTC — a Cyprus evening must not count as tomorrow. */
function localISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Clamp 29/02 to 28/02 in common years so the date literal stays valid. */
function safeDate(year: number, md: string): string {
  const [m, d] = md.split('-');
  if (m === '02' && d === '29' && !isLeap(year)) return `${year}-02-28`;
  return `${year}-${md}`;
}

/**
 * A day/month window ignores the year, which PostgREST can't express — so
 * expand it into one concrete dob range per candidate birth year. A window
 * that wraps new year (15/12 → 15/01) yields two ranges per year.
 */
export function birthdayRanges(fromMD: string, toMD: string, yearFrom: number, yearTo: number): [string, string][] {
  const out: [string, string][] = [];
  for (let y = yearFrom; y <= yearTo; y++) {
    if (fromMD <= toMD) {
      out.push([safeDate(y, fromMD), safeDate(y, toMD)]);
    } else {
      out.push([safeDate(y, fromMD), `${y}-12-31`]);
      out.push([`${y}-01-01`, safeDate(y, toMD)]);
    }
  }
  return out;
}

/** The default birthdays view: whoever has a birthday in the next 30 days. */
export function next30Days(): { from: string; to: string } {
  const today = new Date();
  const end = new Date(today.getTime() + 30 * 86400e3);
  return { from: localISO(today).slice(5), to: localISO(end).slice(5) };
}

type DB = SupabaseClient<Database>;

/**
 * Build the filtered query. Returns a FRESH builder each call — supabase-js
 * builders mutate in place, so a shared one can't be ranged twice.
 */
export function buildKidsQuery(
  supabase: DB,
  f: KidFilters,
  maxAge: number,
  parentIds: string[],
) {
  let b = supabase.from('kids').select(KIDS_SELECT, { count: 'exact' });

  if (f.view === 'expiring') {
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() - maxAge);
    limit.setMonth(limit.getMonth() + 3);   // turning max age within 3 months
    b = b.eq('status', 'approved').lte('dob', localISO(limit)).order('dob');
  } else if (f.view === 'birthdays') {
    b = b.eq('status', 'approved');

    const thisYear = new Date().getFullYear();
    // Kids can only be 0..maxAge, so that bounds the birth years we expand.
    const y1 = Math.max(Number(f.y1) || thisYear - maxAge - 1, 1900);
    const y2 = Math.min(Number(f.y2) || thisYear, thisYear);

    const win = isMD(f.from) && isMD(f.to) ? { from: f.from, to: f.to } : next30Days();
    const ranges = birthdayRanges(win.from, win.to, Math.min(y1, y2), Math.max(y1, y2));
    if (ranges.length) {
      b = b.or(ranges.map(([a, z]) => `and(dob.gte.${a},dob.lte.${z})`).join(','));
    }
    b = b.order('dob');
  } else {
    const status = (['pending', 'approved', 'rejected', 'expired'].includes(f.view) ? f.view : 'pending') as KidStatus;
    b = b.eq('status', status).order('created_at', { ascending: f.view !== 'pending' });
  }

  if (f.q) {
    const ors = [`first_name.ilike.%${f.q}%`, `last_name.ilike.%${f.q}%`, `member_id.ilike.%${f.q}%`];
    if (parentIds.length) ors.push(`parent_id.in.(${parentIds.join(',')})`);
    b = b.or(ors.join(','));
  }
  return b;
}

/** Parents matching the search term, so the kid query can filter on parent_id. */
export async function matchingParentIds(supabase: DB, term: string): Promise<string[]> {
  if (!term) return [];
  const { data } = await supabase.from('profiles').select('id')
    .or(`firstname.ilike.%${term}%,lastname.ilike.%${term}%,email.ilike.%${term}%,mobile.ilike.%${term}%`)
    .limit(80);
  return (data ?? []).map((p) => p.id);
}

/** Strip anything that could break out of a PostgREST filter value. */
export const cleanTerm = (q: string) => q.trim().replace(/[^\p{L}\p{N}@ ._+-]/gu, '');
