import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GiftsTable } from './gifts-table';
import { RedemptionsTable, type RedemptionRow } from './redemptions-table';

export default async function GiftsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const [{ data: gifts }, { data: redemptions }] = await Promise.all([
    supabase.from('gifts').select('id, name, cost, category, emoji, image_url, stock, requires_approval, status, sort_order').order('sort_order').order('name'),
    supabase.from('redemptions')
      .select('id, status, cost, note, created_at, handled_at, gift:gifts(name, category, emoji), profile:profiles(firstname, lastname, mobile, email), kid:kids(first_name)')
      .order('created_at', { ascending: false }).limit(500),
  ]);
  const pendingCount = (redemptions ?? []).filter((r) => r.status === 'requested').length;

  return (
    <div>
      <PageHeader title="Δώρα & Εξαργυρώσεις" description="Κατάλογος δώρων που εξαργυρώνουν τα μέλη με πόντους KP και διαχείριση αιτημάτων.">
        <Button render={<Link href="/gifts/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέο δώρο</Button>
      </PageHeader>
      <Tabs defaultValue={tab === 'redemptions' ? 'redemptions' : 'catalog'}>
        <TabsList className="mb-4">
          <TabsTrigger value="catalog">Κατάλογος</TabsTrigger>
          <TabsTrigger value="redemptions">Εξαργυρώσεις{pendingCount ? ` (${pendingCount})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog"><GiftsTable rows={gifts ?? []} /></TabsContent>
        <TabsContent value="redemptions"><RedemptionsTable rows={(redemptions ?? []) as unknown as RedemptionRow[]} /></TabsContent>
      </Tabs>
    </div>
  );
}
