import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SlidersTab } from './sliders-tab';
import { QuickActionsForm } from './quick-actions-form';
import { ProductChipsForm } from './product-chips-form';

export default async function HomeScreenPage() {
  const supabase = await createClient();
  const [{ data: sliders }, { data: events }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from('home_sliders').select('*').order('sort_order'),
    supabase.from('events').select('id, title').eq('status', 'published').order('date', { ascending: false }),
    supabase.from('products').select('id, name').eq('status', 'published').order('sort_order'),
    supabase.from('app_settings').select('key, value').in('key', ['home_quick_actions', 'home_product_chips']),
  ]);

  const setting = (k: string) => settings?.find((s) => s.key === k)?.value;
  const quickActions = Array.isArray(setting('home_quick_actions')) ? (setting('home_quick_actions') as string[]) : [];
  const chips = Array.isArray(setting('home_product_chips')) ? (setting('home_product_chips') as { emoji: string; label: string }[]) : [];

  return (
    <div>
      <PageHeader title="Αρχική οθόνη" description="Slider, γρήγορη πρόσβαση και chips προϊόντων που βλέπουν τα μέλη στην αρχική της εφαρμογής." />
      <Tabs defaultValue="sliders">
        <TabsList className="mb-4">
          <TabsTrigger value="sliders">Hero slider</TabsTrigger>
          <TabsTrigger value="quick">Γρήγορη πρόσβαση</TabsTrigger>
          <TabsTrigger value="chips">Chips προϊόντων</TabsTrigger>
        </TabsList>
        <TabsContent value="sliders">
          <SlidersTab rows={sliders ?? []} events={events ?? []} products={(products ?? []).map((p) => ({ id: p.id, title: p.name }))} />
        </TabsContent>
        <TabsContent value="quick"><QuickActionsForm initial={quickActions} /></TabsContent>
        <TabsContent value="chips"><ProductChipsForm initial={chips} /></TabsContent>
      </Tabs>
    </div>
  );
}
