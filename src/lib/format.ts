import { formatDistanceToNow, differenceInYears } from 'date-fns';
import { el } from 'date-fns/locale';

/** All staff and members are in Cyprus — pin every display/parse to this zone so
 * server (UTC on Vercel) and browser render identically (no hydration drift). */
export const TZ = 'Asia/Nicosia';

const OPTS: Record<string, Intl.DateTimeFormatOptions> = {
  'd MMM yyyy': { day: 'numeric', month: 'short', year: 'numeric' },
  'd MMMM yyyy': { day: 'numeric', month: 'long', year: 'numeric' },
  'EEEE d MMMM yyyy': { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  'EEE d MMM': { weekday: 'short', day: 'numeric', month: 'short' },
};

export function fmtDate(d: string | Date | null | undefined, f = 'd MMM yyyy'): string {
  if (!d) return '—';
  const date = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00') : new Date(d);
  return new Intl.DateTimeFormat('el', { ...(OPTS[f] ?? OPTS['d MMM yyyy']), timeZone: TZ }).format(date);
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('el', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(new Date(d));
}

export const fmtAgo = (d: string | Date | null | undefined) => (d ? formatDistanceToNow(new Date(d), { locale: el, addSuffix: true }) : '—');
export const ageOf = (dob: string | Date | null | undefined) => (dob ? differenceInYears(new Date(), new Date(dob)) : null);
export const fmtNum = (n: number | null | undefined) => (n ?? 0).toLocaleString('el-GR');

/** Today's date (YYYY-MM-DD) in Cyprus — identical on server and client. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Offset (ms) of the Cyprus zone at a given instant (handles DST). */
function tzOffsetMs(at: Date): number {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(at);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
  return asUtc - at.getTime();
}

/** Parse an `<input type="datetime-local">` value as Cyprus wall-clock time → ISO (UTC). */
export function localInputToIso(v: string | null | undefined): string | null {
  if (!v) return null;
  const naive = new Date(v + (v.length === 16 ? ':00' : '') + 'Z');   // wall clock pretending UTC
  const guess = new Date(naive.getTime() - tzOffsetMs(naive));
  return new Date(naive.getTime() - tzOffsetMs(guess)).toISOString(); // second pass fixes DST edges
}

/** ISO (UTC) → value for `<input type="datetime-local">` shown as Cyprus wall-clock. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() + tzOffsetMs(d)).toISOString().slice(0, 16);
}
