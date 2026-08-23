import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATS = [
  { label: 'Μέλη (γονείς)', value: '—' },
  { label: 'Παιδιά σε αναμονή έγκρισης', value: '—' },
  { label: 'Επερχόμενες εκδηλώσεις', value: '—' },
  { label: 'Εξαργυρώσεις σε αναμονή', value: '—' },
];

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Επισκόπηση</h1>
        <p className="text-sm text-muted-foreground">Τα στατιστικά θα ενεργοποιηθούν μόλις εφαρμοστεί το schema (Phase 1).</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
