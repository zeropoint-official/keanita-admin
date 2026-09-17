import { requireSponsor } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { fmtNum } from '@/lib/format';
import { mediaUrl } from '@/lib/storage';
import { QUOTA_LABEL } from '../(dashboard)/sponsors/constants';
import { PortalAwards, type PortalAwardRow } from './portal-awards';

export default async function PortalPage() {
  const sponsorUser = await requireSponsor();
  const supabase = await createClient();

  const [{ data: sponsor }, { data: campaigns }, { data: awards }] = await Promise.all([
    supabase.from('sponsors').select('name, logo_path').eq('id', sponsorUser.sponsor_id).maybeSingle(),
    supabase.from('sponsor_campaigns').select('id, title, status, quota_mode, quota_amount').eq('sponsor_id', sponsorUser.sponsor_id).order('created_at', { ascending: false }),
    supabase.from('sponsor_award_view').select('*').order('won_at', { ascending: false }).limit(2000),
  ]);
  const gauges = await Promise.all((campaigns ?? []).map(async (c) => {
    const { data: remaining } = await supabase.rpc('campaign_stock', { p_campaign: c.id });
    return { ...c, remaining: remaining ?? 0 };
  }));
  const rows = (awards ?? []) as PortalAwardRow[];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {sponsor?.logo_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(sponsor.logo_path)} alt="" className="h-12 w-20 rounded border bg-white object-contain p-1" />
        ) : null}
        <div>
          <h1 className="text-2xl font-bold">{sponsor?.name ?? 'Χορηγός'}</h1>
          <p className="text-sm text-muted-foreground">Δώρα των καμπανιών σου — αναζήτησε με αριθμό μέλους και επιβεβαίωσε την παράδοση.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {gauges.map((c) => (
          <Card key={c.id}>
            <CardContent className="pt-5">
              <p className="font-medium truncate" title={c.title}>{c.title}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                {fmtNum(c.remaining)}
                <span className="text-sm font-normal text-muted-foreground"> / {fmtNum(c.quota_amount)} {QUOTA_LABEL[c.quota_mode]} διαθέσιμα</span>
              </p>
            </CardContent>
          </Card>
        ))}
        {gauges.length === 0 && <p className="text-sm text-muted-foreground">Δεν υπάρχουν καμπάνιες ακόμη.</p>}
      </div>

      <PortalAwards rows={rows} />
    </div>
  );
}
