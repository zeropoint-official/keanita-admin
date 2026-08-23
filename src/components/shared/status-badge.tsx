import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MAP: Record<string, { label: string; cls: string }> = {
  draft:      { label: 'Πρόχειρο',    cls: 'bg-gray-100 text-gray-700' },
  published:  { label: 'Δημοσιευμένο', cls: 'bg-green-100 text-green-800' },
  archived:   { label: 'Αρχείο',      cls: 'bg-amber-100 text-amber-800' },
  pending:    { label: 'Σε αναμονή',  cls: 'bg-amber-100 text-amber-800' },
  approved:   { label: 'Εγκρίθηκε',   cls: 'bg-green-100 text-green-800' },
  rejected:   { label: 'Απορρίφθηκε', cls: 'bg-red-100 text-red-800' },
  expired:    { label: 'Έληξε',       cls: 'bg-gray-100 text-gray-600' },
  requested:  { label: 'Αίτημα',      cls: 'bg-amber-100 text-amber-800' },
  shipped:    { label: 'Απεστάλη',    cls: 'bg-blue-100 text-blue-800' },
  delivered:  { label: 'Παραδόθηκε',  cls: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Ακυρώθηκε',   cls: 'bg-gray-100 text-gray-600' },
  scheduled:  { label: 'Προγραμματισμένο', cls: 'bg-blue-100 text-blue-800' },
  sending:    { label: 'Αποστέλλεται', cls: 'bg-blue-100 text-blue-800' },
  sent:       { label: 'Στάλθηκε',    cls: 'bg-green-100 text-green-800' },
  failed:     { label: 'Απέτυχε',     cls: 'bg-red-100 text-red-800' },
  new:        { label: 'Νέο',         cls: 'bg-amber-100 text-amber-800' },
  read:       { label: 'Διαβάστηκε',  cls: 'bg-gray-100 text-gray-700' },
  replied:    { label: 'Απαντήθηκε',  cls: 'bg-green-100 text-green-800' },
  event:      { label: 'Εκδήλωση',    cls: 'bg-red-100 text-red-800' },
  seminar:    { label: 'Σεμινάριο',   cls: 'bg-green-100 text-green-800' },
  announcement: { label: 'Ανακοίνωση', cls: 'bg-purple-100 text-purple-800' },
  juice:      { label: 'Χυμός',       cls: 'bg-orange-100 text-orange-800' },
  yogurt:     { label: 'Γιαούρτι',    cls: 'bg-sky-100 text-sky-800' },
  digital:    { label: 'Ψηφιακό',     cls: 'bg-sky-100 text-sky-800' },
  physical:   { label: 'Φυσικό',      cls: 'bg-orange-100 text-orange-800' },
  puzzle:     { label: 'Χρωμοσελίδα', cls: 'bg-purple-100 text-purple-800' },
  download:   { label: 'Λήψη PDF',    cls: 'bg-sky-100 text-sky-800' },
};

export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return null;
  const m = MAP[value] ?? { label: value, cls: 'bg-gray-100 text-gray-700' };
  return <Badge variant="secondary" className={cn('font-semibold border-0', m.cls, className)}>{m.label}</Badge>;
}
