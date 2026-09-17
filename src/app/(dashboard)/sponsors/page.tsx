import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SponsorsTable } from './sponsors-table';
import { CampaignsTable } from './campaigns-table';
import { AwardsTable, type AwardRow } from './awards-table';

export default async function SponsorsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const [{ data: sponsors }, { data: campaigns }, { data: awards }] = await Promise.all([
    supabase.from('sponsors').select('id, name, logo_path, brand_color, status, contact_name, contact_email').order('name'),
    supabase.from('sponsor_campaigns')
      .select('id, title, status, trigger, fulfillment, quota_mode, quota_amount, per_user_limit, starts_at, ends_at, expiry_days, sponsor:sponsors(name, logo_path)')
      .order('created_at', { ascending: false }),
    supabase.from('awards')
      .select('id, status, won_at, expires_at, redeemed_at, campaign:sponsor_campaigns(title, fulfillment, sponsor:sponsors(name)), profile:profiles(firstname, lastname, mobile, email), kid:kids(first_name, member_id), code:campaign_codes!awards_code_id_fkey(code)')
      .order('won_at', { ascending: false }).limit(500),
  ]);
  const campaignRows = await Promise.all((campaigns ?? []).map(async (c) => {
    const { data: remaining } = await supabase.rpc('campaign_stock', { p_campaign: c.id });
    return { ...c, remaining: remaining ?? 0 };
  }));
  const activeCount = (awards ?? []).filter((a) => a.status === 'won').length;

  return (
    <div>
      <PageHeader title="Χορηγοί & Δώρα" description="Χορηγίες ως περιεχόμενο: καμπάνιες με απόθεμα, κανόνες νίκης και οδηγίες παραλαβής — χωρίς νέα έκδοση της εφαρμογής.">
        <Button variant="outline" render={<Link href="/sponsors/campaigns/new" />}><Plus className="h-4 w-4 mr-1" />Νέα καμπάνια</Button>
        <Button render={<Link href="/sponsors/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέος χορηγός</Button>
      </PageHeader>
      <Tabs defaultValue={tab === 'awards' ? 'awards' : tab === 'campaigns' ? 'campaigns' : 'sponsors'}>
        <TabsList className="mb-4">
          <TabsTrigger value="sponsors">Χορηγοί</TabsTrigger>
          <TabsTrigger value="campaigns">Καμπάνιες</TabsTrigger>
          <TabsTrigger value="awards">Δώρα μελών{activeCount ? ` (${activeCount})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value="sponsors"><SponsorsTable rows={sponsors ?? []} /></TabsContent>
        <TabsContent value="campaigns"><CampaignsTable rows={campaignRows} /></TabsContent>
        <TabsContent value="awards"><AwardsTable rows={(awards ?? []) as AwardRow[]} /></TabsContent>
      </Tabs>
    </div>
  );
}
