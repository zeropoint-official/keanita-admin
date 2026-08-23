import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignsTable, type CampaignRow } from './campaigns-table';
import { InboxTable, type ContactRow } from './inbox-table';
import { DevicesStats } from './devices-stats';

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const [{ data: campaigns }, { data: messages }, { count: tokensTotal }, { count: tokensIos }, { count: tokensAndroid }, { count: tokensWeb }, { count: tokensRecent }] = await Promise.all([
    supabase.from('push_campaigns').select('id, title, type, source, audience, scheduled_at, sent_at, status, stats, created_at').order('created_at', { ascending: false }).limit(500),
    supabase.from('contact_messages').select('id, name, email, subject, message, status, created_at, user_id').order('created_at', { ascending: false }).limit(500),
    supabase.from('device_tokens').select('token', { count: 'exact', head: true }),
    supabase.from('device_tokens').select('token', { count: 'exact', head: true }).eq('platform', 'ios'),
    supabase.from('device_tokens').select('token', { count: 'exact', head: true }).eq('platform', 'android'),
    supabase.from('device_tokens').select('token', { count: 'exact', head: true }).eq('platform', 'web'),
    supabase.from('device_tokens').select('token', { count: 'exact', head: true }).gte('last_seen_at', since),
  ]);

  const rows: CampaignRow[] = (campaigns ?? []).map((c) => {
    const s = (c.stats ?? {}) as { sent?: number; opened?: number; targeted?: number };
    return { ...c, audience: c.audience as Record<string, unknown>, sent: s.sent ?? null, opened: s.opened ?? null, targeted: s.targeted ?? null };
  });
  const newMessages = (messages ?? []).filter((m) => m.status === 'new').length;

  return (
    <div>
      <PageHeader title="Ειδοποιήσεις" description="Push καμπάνιες, μηνύματα επικοινωνίας και εγγεγραμμένες συσκευές.">
        <Button render={<Link href="/notifications/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέα καμπάνια</Button>
      </PageHeader>
      <Tabs defaultValue={tab === 'inbox' || tab === 'devices' ? tab : 'campaigns'}>
        <TabsList className="mb-4">
          <TabsTrigger value="campaigns">Καμπάνιες</TabsTrigger>
          <TabsTrigger value="inbox">Εισερχόμενα (επικοινωνία){newMessages ? <span className="ml-1.5 rounded-full bg-[#E60C10] px-1.5 text-[10px] font-bold text-white">{newMessages}</span> : null}</TabsTrigger>
          <TabsTrigger value="devices">Συσκευές</TabsTrigger>
        </TabsList>
        <TabsContent value="campaigns"><CampaignsTable rows={rows} /></TabsContent>
        <TabsContent value="inbox"><InboxTable rows={(messages ?? []) as ContactRow[]} /></TabsContent>
        <TabsContent value="devices">
          <DevicesStats total={tokensTotal ?? 0} ios={tokensIos ?? 0} android={tokensAndroid ?? 0} web={tokensWeb ?? 0} recent={tokensRecent ?? 0} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
