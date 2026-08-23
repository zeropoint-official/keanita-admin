import type { Audience } from './actions';

export const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  manual: { label: 'Χειροκίνητη', cls: 'bg-gray-100 text-gray-700' },
  birthday: { label: 'Γενέθλια', cls: 'bg-pink-100 text-pink-800' },
  event_reminder: { label: 'Υπενθύμιση εκδήλωσης', cls: 'bg-blue-100 text-blue-800' },
  event_announce: { label: 'Ανακοίνωση εκδήλωσης', cls: 'bg-purple-100 text-purple-800' },
};

export const TYPE_LABEL: Record<string, string> = { event: 'Εκδήλωση', reward: 'Ανταμοιβή', gift: 'Δώρο', system: 'Σύστημα', birthday: 'Γενέθλια' };

export const SCREENS: [string, string][] = [
  ['home', 'Αρχική'], ['events', 'Εκδηλώσεις'], ['seminars', 'Σεμινάρια'], ['games', 'Παιχνίδια'], ['characters', 'Χαρακτήρες'],
  ['rewards', 'Ανταμοιβές'], ['gifts', 'Δώρα'], ['products', 'Προϊόντα'], ['discounts', 'Εκπτώσεις'], ['activities', 'Δραστηριότητες'],
  ['kids-club', 'Kids Club'], ['notifications', 'Ειδοποιήσεις'], ['profile', 'Προφίλ'], ['contact', 'Επικοινωνία'],
];

const STATUS_GR: Record<string, string> = { approved: 'εγκεκριμένα', pending: 'σε αναμονή' };

/** Greek one-liner for an audience JSON, e.g. "Όλοι · ηλικία 5–9". */
export function audienceSummary(a: Audience | Record<string, unknown> | null | undefined): string {
  if (!a || typeof a !== 'object') return 'Όλοι';
  const x = a as Audience & { kid_id?: string };
  if (x.user_ids?.length) return x.kid_id ? '1 γονέας (γενέθλια)' : `${x.user_ids.length} συγκεκριμένοι χρήστες`;
  const parts: string[] = [];
  const min = x.kid_min_age, max = x.kid_max_age;
  if (min != null && max != null) parts.push(`ηλικία ${min}–${max}`);
  else if (min != null) parts.push(`ηλικία ${min}+`);
  else if (max != null) parts.push(`ηλικία έως ${max}`);
  if (x.kid_status && x.kid_status !== 'any') parts.push(`παιδιά ${STATUS_GR[x.kid_status] ?? x.kid_status}`);
  if (x.districts?.length) parts.push(x.districts.join(', '));
  return parts.length ? `Όλοι · ${parts.join(' · ')}` : 'Όλοι';
}
