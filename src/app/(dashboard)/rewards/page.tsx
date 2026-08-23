import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RulesEditor } from './rules-editor';
import { Leaderboard } from './leaderboard';
import { LedgerTable } from './ledger-table';
import { QrBatches, type QrBatch } from './qr-batches';

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const [{ data: rules }, { data: byBalance }, { data: byLifetime }, { data: ledger }, { data: products }] = await Promise.all([
    supabase.from('reward_rules').select('*').order('key'),
    supabase.from('points_balances').select('user_id, balance, lifetime_earned, profiles(firstname, lastname)').order('balance', { ascending: false }).limit(50),
    supabase.from('points_balances').select('user_id, balance, lifetime_earned, profiles(firstname, lastname)').order('lifetime_earned', { ascending: false }).limit(50),
    supabase.from('points_ledger').select('id, amount, reason, label, created_at, profiles(firstname, lastname)').order('created_at', { ascending: false }).limit(200),
    supabase.from('products').select('id, name').order('sort_order'),
  ]);

  // Group QR codes by batch (paged: PostgREST caps a request at 1000 rows).
  const codes: { batch: string; points: number; max_uses: number; uses: number; expires_at: string | null; created_at: string; product_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('qr_codes').select('batch, points, max_uses, uses, expires_at, created_at, product_id').range(from, from + 999);
    codes.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const productName = new Map((products ?? []).map((p) => [p.id, p.name]));
  const batches = new Map<string, QrBatch>();
  for (const c of codes) {
    const b = batches.get(c.batch) ?? { batch: c.batch, count: 0, used: 0, scans: 0, points: c.points, max_uses: c.max_uses, product: c.product_id ? productName.get(c.product_id) ?? null : null, expires_at: c.expires_at, created_at: c.created_at };
    b.count += 1; b.scans += c.uses; if (c.uses > 0) b.used += 1;
    if (c.created_at < b.created_at) b.created_at = c.created_at;
    batches.set(c.batch, b);
  }
  const batchRows = [...batches.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      <PageHeader title="Πόντοι KP" description="Κανόνες απονομής πόντων, κατάταξη μελών, ιστορικό και QR κωδικοί συσκευασίας." />
      <Tabs defaultValue={['rules', 'leaderboard', 'ledger', 'qr'].includes(tab ?? '') ? tab : 'rules'}>
        <TabsList className="mb-4">
          <TabsTrigger value="rules">Κανόνες</TabsTrigger>
          <TabsTrigger value="leaderboard">Κατάταξη</TabsTrigger>
          <TabsTrigger value="ledger">Ιστορικό</TabsTrigger>
          <TabsTrigger value="qr">QR κωδικοί</TabsTrigger>
        </TabsList>
        <TabsContent value="rules"><RulesEditor rules={(rules ?? []).map((r) => ({ ...r, config: (r.config ?? {}) as Record<string, unknown> }))} /></TabsContent>
        <TabsContent value="leaderboard"><Leaderboard byBalance={byBalance ?? []} byLifetime={byLifetime ?? []} /></TabsContent>
        <TabsContent value="ledger"><LedgerTable rows={ledger ?? []} /></TabsContent>
        <TabsContent value="qr"><QrBatches rows={batchRows} products={products ?? []} /></TabsContent>
      </Tabs>
    </div>
  );
}
