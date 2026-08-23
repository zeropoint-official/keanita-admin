import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtDate, fmtDateTime, fmtNum } from '@/lib/format';
import { ParentActions, ParentForm, PointsAdjust } from './parent-panels';
import { KidsPanel } from './kids-panel';

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: p }, { data: kids }, { data: ledger }, { data: regs }, { data: redemptions }, { data: notifs }, { data: devices }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('kids').select('*').eq('parent_id', id).order('dob'),
    supabase.from('points_ledger').select('id, amount, reason, label, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('event_registrations').select('id, created_at, checked_in_at, events(title, date), kids(first_name)').eq('parent_id', id).order('created_at', { ascending: false }),
    supabase.from('redemptions').select('id, status, cost, created_at, gifts(name, emoji)').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('notifications').select('id, title, type, read_at, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(30),
    supabase.from('device_tokens').select('platform, last_seen_at').eq('user_id', id),
  ]);
  if (!p) notFound();
  const balance = (ledger ?? []).reduce((s, l) => s + l.amount, 0);

  return (
    <div>
      <PageHeader title={`${p.firstname ?? ''} ${p.lastname ?? ''}`.trim() || p.email || 'Μέλος'} description={`${p.email ?? ''} · ${p.mobile ?? ''} · μέλος από ${fmtDate(p.created_at)}`}>
        {!p.is_active && <Badge variant="destructive">Ανενεργός λογαριασμός</Badge>}
        <ParentActions id={id} isActive={p.is_active} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        {[['Παιδιά', kids?.length ?? 0], ['Υπόλοιπο KP', fmtNum(balance)], ['Συμμετοχές', regs?.length ?? 0], ['Συσκευές', devices?.length ?? 0]].map(([l, v]) => (
          <Card key={l as string}><CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground">{l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{v}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="kids">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="kids">Παιδιά</TabsTrigger><TabsTrigger value="profile">Στοιχεία</TabsTrigger><TabsTrigger value="points">Πόντοι</TabsTrigger>
          <TabsTrigger value="events">Εκδηλώσεις</TabsTrigger><TabsTrigger value="gifts">Δώρα</TabsTrigger><TabsTrigger value="notifs">Ειδοποιήσεις</TabsTrigger>
        </TabsList>
        <TabsContent value="kids"><KidsPanel parentId={id} kids={kids ?? []} /></TabsContent>
        <TabsContent value="profile"><ParentForm id={id} initial={{ firstname: p.firstname ?? '', lastname: p.lastname ?? '', mobile: p.mobile ?? '', district: p.district ?? '', city: p.city ?? '' }} legacyId={p.legacy_id} /></TabsContent>
        <TabsContent value="points">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card><CardHeader><CardTitle>Πρόσφατες κινήσεις</CardTitle></CardHeader><CardContent className="divide-y">
              {ledger?.length ? ledger.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 text-sm"><div><p>{l.label}</p><p className="text-xs text-muted-foreground">{fmtDateTime(l.created_at)} · {l.reason}</p></div>
                  <span className={`font-bold ${l.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>{l.amount > 0 ? '+' : ''}{l.amount}</span></div>
              )) : <p className="text-sm text-muted-foreground py-4">Καμία κίνηση.</p>}
            </CardContent></Card>
            <PointsAdjust id={id} />
          </div>
        </TabsContent>
        <TabsContent value="events">
          <Card><CardContent className="divide-y pt-4">
            {regs?.length ? regs.map((r) => { const ev = r.events as unknown as { title: string; date: string } | null; const kid = r.kids as unknown as { first_name: string } | null; return (
              <div key={r.id} className="flex items-center justify-between py-2 text-sm"><div><p className="font-medium">{ev?.title}</p><p className="text-xs text-muted-foreground">{fmtDate(ev?.date)} · {kid?.first_name ?? '—'}</p></div>{r.checked_in_at && <Badge variant="secondary">Check-in</Badge>}</div>); })
              : <p className="text-sm text-muted-foreground py-4">Καμία συμμετοχή.</p>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="gifts">
          <Card><CardContent className="divide-y pt-4">
            {redemptions?.length ? redemptions.map((r) => { const g = r.gifts as unknown as { name: string; emoji: string | null } | null; return (
              <div key={r.id} className="flex items-center justify-between py-2 text-sm"><div><p className="font-medium">{g?.emoji} {g?.name}</p><p className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)} · {r.cost} KP</p></div><StatusBadge value={r.status} /></div>); })
              : <p className="text-sm text-muted-foreground py-4">Καμία εξαργύρωση.</p>}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="notifs">
          <Card><CardContent className="divide-y pt-4">
            {notifs?.length ? notifs.map((n) => (
              <div key={n.id} className="flex items-center justify-between py-2 text-sm"><div><p className={n.read_at ? '' : 'font-semibold'}>{n.title}</p><p className="text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</p></div><StatusBadge value={n.type} /></div>
            )) : <p className="text-sm text-muted-foreground py-4">Καμία ειδοποίηση.</p>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
