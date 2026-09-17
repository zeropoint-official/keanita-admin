import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { PageHeader } from '@/components/shared/page-header';
import { HelpLink } from '@/components/shared/help-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DailyBars, DualLines } from './charts';

export const dynamic = 'force-dynamic';

interface ActivityRow { day: string; active_users: number; game_plays: number; avg_score: number | null; kp_earned: number; kp_spent: number; signups: number }
interface EventRow { day: string; name: string; count: number; users: number }
interface Summary { dau: number; wau: number; mau: number; total_members: number; new_members_30d: number }

const SCREEN_LABEL: Record<string, string> = {
  '(tabs)/index': 'Αρχική', '(tabs)/games': 'Παιχνίδι', '(tabs)/characters': 'Χαρακτήρες',
  '(tabs)/events': 'Εκδηλώσεις', '(tabs)/profile': 'Προφίλ', gifts: 'Δώρα (κατάλογος KP)',
  'gifts-won': 'Τα δώρα μου', rewards: 'Ιστορικό πόντων', 'kids-club': 'Kids Club',
  products: 'Προϊόντα', 'product/[id]': 'Σελίδα προϊόντος', 'event/[id]': 'Σελίδα εκδήλωσης',
  seminars: 'Σεμινάρια', discounts: 'Εκπτώσεις', activities: 'Δραστηριότητες',
  character: 'Σελίδα χαρακτήρα', notifications: 'Ειδοποιήσεις', contact: 'Επικοινωνία',
  'edit-profile': 'Επεξεργασία προφίλ', about: 'Η ιστορία μας', terms: 'Όροι', register: 'Εγγραφή', login: 'Σύνδεση',
};
const EVENT_LABEL: Record<string, string> = { game_start: 'Έναρξη παιχνιδιού' };

const fmt = (n: number) => n.toLocaleString('el-GR');

async function loadData() {
  const supabase = await createClient();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  return Promise.all([
    supabase.rpc('analytics_summary').single(),
    supabase.rpc('analytics_activity', { p_days: 30 }),
    supabase.rpc('analytics_events', { p_days: 30 }),
    supabase.from('awards').select('id', { count: 'exact', head: true }).gte('won_at', since30),
    supabase.from('awards').select('id', { count: 'exact', head: true }).eq('status', 'redeemed').gte('won_at', since30),
    supabase.from('awards').select('id', { count: 'exact', head: true }).eq('status', 'expired').gte('won_at', since30),
  ]);
}

export default async function AnalyticsPage() {
  await requireStaff('viewer');
  const [summaryR, activityR, eventsR, wonR, redeemedR, expiredR] = await loadData();

  const rpcMissing = !!summaryR.error || !!activityR.error;
  const summary = (summaryR.data ?? { dau: 0, wau: 0, mau: 0, total_members: 0, new_members_30d: 0 }) as Summary;
  const activity = (activityR.data ?? []) as ActivityRow[];
  const events = (eventsR.data ?? []) as EventRow[];

  // Aggregate the per-day event rows: screens (name 'screen:…') vs the rest.
  const byName = new Map<string, { count: number; peakUsers: number }>();
  for (const e of events) {
    const cur = byName.get(e.name) ?? { count: 0, peakUsers: 0 };
    byName.set(e.name, { count: cur.count + e.count, peakUsers: Math.max(cur.peakUsers, e.users) });
  }
  const screens = [...byName.entries()].filter(([n]) => n.startsWith('screen:'))
    .map(([n, v]) => ({ key: n.slice(7), ...v })).sort((a, b) => b.count - a.count).slice(0, 15);
  const others = [...byName.entries()].filter(([n]) => !n.startsWith('screen:'))
    .map(([n, v]) => ({ key: n, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);

  const kpis: { label: string; value: number; hint?: string }[] = [
    { label: 'Ενεργοί σήμερα', value: summary.dau },
    { label: 'Ενεργοί 7 ημερών', value: summary.wau },
    { label: 'Ενεργοί 30 ημερών', value: summary.mau },
    { label: 'Νέα μέλη (30ημ)', value: summary.new_members_30d },
    { label: 'Σύνολο μελών', value: summary.total_members },
  ];
  const funnel = [
    { label: 'Κερδήθηκαν', value: wonR.count ?? 0 },
    { label: 'Εξαργυρώθηκαν', value: redeemedR.count ?? 0 },
    { label: 'Έληξαν', value: expiredR.count ?? 0 },
  ];

  return (
    <div>
      <PageHeader title="Αναλυτικά" description="Ενεργά μέλη, δραστηριότητα στο παιχνίδι, ροή πόντων και χρήση οθονών — τελευταίες 30 ημέρες. «Ενεργός» = άνοιξε την εφαρμογή συνδεδεμένος.">
        <HelpLink section="analytics" />
      </PageHeader>

      {rpcMissing && (
        <Card className="mb-6 border-amber-300/60"><CardContent className="py-3 text-sm text-muted-foreground">
          Οι συναρτήσεις αναλυτικών δεν υπάρχουν ακόμα στη βάση — τρέξε το migration <code className="font-mono">0020_analytics.sql</code> (<code className="font-mono">npm run db:push</code>).
        </CardContent></Card>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold">{fmt(k.value)}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ενεργά μέλη ανά ημέρα</CardTitle><CardDescription>Μοναδικά μέλη που άνοιξαν την εφαρμογή.</CardDescription></CardHeader>
          <CardContent><DailyBars valueLabel="μέλη" data={activity.map((r) => ({ day: r.day, value: r.active_users }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Παρτίδες παιχνιδιού</CardTitle><CardDescription>Πόσες φορές παίχτηκε το παιχνίδι κάθε μέρα.</CardDescription></CardHeader>
          <CardContent><DailyBars valueLabel="παρτίδες" data={activity.map((r) => ({ day: r.day, value: r.game_plays, extra: r.avg_score != null ? `μ.ό. σκορ ${r.avg_score}` : undefined }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Πόντοι KP ανά ημέρα</CardTitle><CardDescription>Πόντοι που κερδήθηκαν και ξοδεύτηκαν.</CardDescription></CardHeader>
          <CardContent><DualLines aLabel="Κερδήθηκαν" bLabel="Ξοδεύτηκαν" data={activity.map((r) => ({ day: r.day, a: r.kp_earned, b: r.kp_spent }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Νέες εγγραφές</CardTitle><CardDescription>Νέοι λογαριασμοί γονέων ανά ημέρα.</CardDescription></CardHeader>
          <CardContent><DailyBars valueLabel="εγγραφές" data={activity.map((r) => ({ day: r.day, value: r.signups }))} /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <Card>
          <CardHeader>
            <CardTitle>Οθόνες της εφαρμογής</CardTitle>
            <CardDescription>Τι ανοίγουν τα μέλη (30 ημέρες). «Μέλη/ημέρα» = τα περισσότερα μοναδικά μέλη σε μία ημέρα.</CardDescription>
          </CardHeader>
          <CardContent>
            {screens.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Δεν υπάρχουν ακόμα δεδομένα οθονών — θα εμφανιστούν μόλις κυκλοφορήσει η έκδοση της εφαρμογής με ενεργή καταγραφή.
              </p>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Οθόνη</TableHead><TableHead className="text-right">Προβολές</TableHead><TableHead className="text-right">Μέλη/ημέρα</TableHead></TableRow></TableHeader>
                <TableBody>
                  {screens.map((s) => (
                    <TableRow key={s.key}>
                      <TableCell className="font-medium">{SCREEN_LABEL[s.key] ?? s.key}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(s.count)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{fmt(s.peakUsers)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Δώρα χορηγών (30ημ)</CardTitle><CardDescription>Πορεία των δώρων που κερδήθηκαν.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              {funnel.map((f) => (
                <div key={f.label} className="rounded-lg border px-2 py-3">
                  <p className="text-xl font-bold tabular-nums">{fmt(f.value)}</p>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          {others.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Ενέργειες</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {others.map((o) => (
                      <TableRow key={o.key}>
                        <TableCell className="font-medium">{EVENT_LABEL[o.key] ?? o.key}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(o.count)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
