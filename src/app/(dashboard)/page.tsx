import Link from 'next/link';
import { Users, Baby, CalendarDays, Gift, Star, Cake, Bell, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtDate, fmtNum, ageOf, todayLocal } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const sb = await createClient();
  const today = todayLocal();
  const monthStart = today.slice(0, 8) + '01';
  const in30 = new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10);

  const [parents, kids, pendingKids, upcoming, regsMonth, pendingRedemptions, earnedMonth, spentMonth, newParents, newContacts, scheduledPush, approvedKids, recentKids] = await Promise.all([
    sb.from('profiles').select('*', { count: 'exact', head: true }),
    sb.from('kids').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    sb.from('kids').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('events').select('id, title, date, time_label, type, event_registrations(count)').eq('status', 'published').gte('date', today).order('date').limit(5),
    sb.from('event_registrations').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    sb.from('redemptions').select('*', { count: 'exact', head: true }).eq('status', 'requested'),
    pagedSum(sb, monthStart, true),
    pagedSum(sb, monthStart, false),
    sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    sb.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    sb.from('push_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    pagedKids(sb),
    sb.from('kids').select('id, first_name, last_name, dob, created_at, parent:profiles(id, firstname, lastname)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
  ]);

  const earned = earnedMonth;
  const spent = -spentMonth;
  const startOfToday = new Date(today + 'T00:00:00');
  const end = new Date(startOfToday.getTime() + 7 * 86400e3);
  const birthdays = approvedKids.map((k) => { const d = new Date(k.dob); const b = new Date(startOfToday.getFullYear(), d.getMonth(), d.getDate()); if (b < startOfToday) b.setFullYear(b.getFullYear() + 1); return { ...k, next: b }; })
    .filter((k) => k.next <= end).sort((a, b) => a.next.getTime() - b.next.getTime()).slice(0, 8);

  const stats = [
    { label: 'Γονείς', value: fmtNum(parents.count), sub: `+${fmtNum(newParents.count)} αυτόν τον μήνα`, icon: Users, href: '/members' },
    { label: 'Ενεργά παιδιά', value: fmtNum(kids.count), sub: `${fmtNum(pendingKids.count)} σε αναμονή έγκρισης`, icon: Baby, href: '/members/kids', alert: !!pendingKids.count },
    { label: 'Συμμετοχές (μήνας)', value: fmtNum(regsMonth.count), sub: `${upcoming.data?.length ?? 0} επερχόμενες εκδηλώσεις`, icon: CalendarDays, href: '/events' },
    { label: 'KP μήνα', value: `+${fmtNum(earned)}`, sub: `${fmtNum(spent)} εξαργυρώθηκαν`, icon: Star, href: '/rewards' },
    { label: 'Εξαργυρώσεις σε αναμονή', value: fmtNum(pendingRedemptions.count), sub: 'προς έγκριση/αποστολή', icon: Gift, href: '/gifts', alert: !!pendingRedemptions.count },
    { label: 'Νέα μηνύματα', value: fmtNum(newContacts.count), sub: `${fmtNum(scheduledPush.count)} push προγραμματισμένα`, icon: MessageSquare, href: '/notifications', alert: !!newContacts.count },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Επισκόπηση</h1><p className="text-sm text-muted-foreground">{fmtDate(today, 'EEEE d MMMM yyyy')}</p></div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className={`hover:shadow-md transition-shadow ${s.alert ? 'border-[#E60C10]/40' : ''}`}>
              <CardHeader className="pb-1 flex flex-row items-center justify-between"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</CardTitle><s.icon className={`h-4 w-4 ${s.alert ? 'text-[#E60C10]' : 'text-muted-foreground'}`} /></CardHeader>
              <CardContent><p className="text-3xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground mt-1">{s.sub}</p></CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4" />Επερχόμενες εκδηλώσεις</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {upcoming.data?.length ? upcoming.data.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/50 -mx-2 px-2 rounded">
                <div><p className="font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{fmtDate(e.date)} {e.time_label}</p></div>
                <div className="text-right"><StatusBadge value={e.type} /><p className="text-xs text-muted-foreground mt-1">{(e.event_registrations as unknown as { count: number }[])[0]?.count ?? 0} συμμ.</p></div>
              </Link>
            )) : <p className="text-sm text-muted-foreground py-4">Καμία προγραμματισμένη εκδήλωση.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4" />Νέα αιτήματα παιδιών</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {recentKids.data?.length ? recentKids.data.map((k) => { const par = k.parent as unknown as { id: string; firstname: string | null; lastname: string | null } | null; return (
              <Link key={k.id} href={`/members/${par?.id ?? ''}`} className="flex items-center justify-between py-2.5 text-sm hover:bg-muted/50 -mx-2 px-2 rounded">
                <div><p className="font-medium">{k.first_name} {k.last_name}</p><p className="text-xs text-muted-foreground">{ageOf(k.dob)} ετών · {par?.firstname} {par?.lastname}</p></div>
                <span className="text-xs text-muted-foreground">{fmtDate(k.created_at)}</span>
              </Link>); })
              : <p className="text-sm text-muted-foreground py-4">Δεν υπάρχουν εκκρεμή αιτήματα.</p>}
            {!!pendingKids.count && pendingKids.count > 5 && <Link href="/members/kids" className="block pt-3 text-xs font-semibold text-[#E60C10]">Δες και τα {pendingKids.count - 5} υπόλοιπα →</Link>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Cake className="h-4 w-4" />Γενέθλια (7 ημέρες)</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {birthdays.length ? birthdays.map((k, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm"><p className="font-medium">🎂 {k.first_name}</p><span className="text-xs text-muted-foreground">{fmtDate(k.next, 'EEE d MMM')} · γίνεται {ageOf(k.dob)! + 1}</span></div>
            )) : <p className="text-sm text-muted-foreground py-4">Κανένα γενέθλιο αυτή την εβδομάδα.</p>}
            <Link href="/members/kids?view=birthdays" className="block pt-3 text-xs font-semibold text-[#E60C10]">Όλα τα γενέθλια (30 ημ.) →</Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

async function pagedSum(sb: Awaited<ReturnType<typeof createClient>>, since: string, positive: boolean): Promise<number> {
  let total = 0;
  for (let from = 0; ; from += 1000) {
    let q = sb.from('points_ledger').select('amount').gte('created_at', since).order('id').range(from, from + 999);
    q = positive ? q.gt('amount', 0) : q.lt('amount', 0);
    const { data } = await q;
    total += (data ?? []).reduce((s, r) => s + r.amount, 0);
    if (!data || data.length < 1000) break;
  }
  return total;
}

async function pagedKids(sb: Awaited<ReturnType<typeof createClient>>): Promise<{ first_name: string; dob: string }[]> {
  const out: { first_name: string; dob: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('kids').select('first_name, dob').eq('status', 'approved').order('id').range(from, from + 999);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}
