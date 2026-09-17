import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtNum, isoToLocalInput } from '@/lib/format';
import { CampaignForm } from '../campaign-form';
import { CampaignActions } from './campaign-actions';
import { CodesPanel } from './codes-panel';
import { getForecastStats } from '../../stats';
import type { CampaignInput } from '../../actions';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: campaign }, { data: sponsors }, stats] = await Promise.all([
    supabase.from('sponsor_campaigns').select('*, sponsor:sponsors(name)').eq('id', id).maybeSingle(),
    supabase.from('sponsors').select('id, name').order('name'),
    getForecastStats(supabase),
  ]);
  if (!campaign) notFound();

  const count = (status: 'won' | 'redeemed' | 'expired') => supabase.from('awards').select('id', { count: 'exact', head: true }).eq('campaign_id', id).eq('status', status);
  const [{ data: remaining }, { count: won }, { count: redeemed }, { count: expired }, { count: codesTotal }, { count: codesAssigned }] = await Promise.all([
    supabase.rpc('campaign_stock', { p_campaign: id }), count('won'), count('redeemed'), count('expired'),
    supabase.from('campaign_codes').select('id', { count: 'exact', head: true }).eq('campaign_id', id),
    supabase.from('campaign_codes').select('id', { count: 'exact', head: true }).eq('campaign_id', id).not('award_id', 'is', null),
  ]);

  const tc = (campaign.trigger_config ?? {}) as Record<string, number>;
  const req = (campaign.requirements ?? {}) as Record<string, number | boolean>;
  const initial: Partial<CampaignInput> = {
    sponsor_id: campaign.sponsor_id, title: campaign.title, prize_image_path: campaign.prize_image_path,
    profile_text: campaign.profile_text, redeem_link: campaign.redeem_link ?? '', status: campaign.status,
    starts_at: isoToLocalInput(campaign.starts_at), ends_at: isoToLocalInput(campaign.ends_at),
    // Legacy trigger values (kp_claim/streak/…) are no longer offered; editing such a row re-saves it as a milestone.
    trigger: campaign.trigger === 'game_drop' ? 'game_drop' : 'game_milestone',
    fulfillment: campaign.fulfillment,
    every_points: tc.every_points ?? '', chance_pct: tc.chance != null ? Math.round(tc.chance * 10000) / 100 : '',
    quota_mode: campaign.quota_mode, quota_amount: campaign.quota_amount, per_user_limit: campaign.per_user_limit,
    kid_approved: !!req.kid_approved, min_age: (req.min_age as number | undefined) ?? '', max_age: (req.max_age as number | undefined) ?? '',
    min_kp: (req.min_kp as number | undefined) ?? '', max_wins_per_day: (req.max_wins_per_day as number | undefined) ?? '',
    expiry_days: campaign.expiry_days ?? '',
  };

  return (
    <div>
      <PageHeader title={campaign.title}
        description={`${campaign.sponsor?.name ?? ''} · Απόθεμα: ${fmtNum(remaining ?? 0)} διαθέσιμα · ${fmtNum(won ?? 0)} ενεργά · ${fmtNum(redeemed ?? 0)} εξαργυρωμένα · ${fmtNum(expired ?? 0)} ληγμένα`}>
        <StatusBadge value={campaign.status} />
        <CampaignActions id={id} />
      </PageHeader>
      <CampaignForm id={id} sponsors={sponsors ?? []} initial={initial} stats={stats} codesCount={codesTotal ?? 0} />
      {campaign.fulfillment === 'code' && (
        <CodesPanel campaignId={id} total={codesTotal ?? 0} assigned={codesAssigned ?? 0} />
      )}
    </div>
  );
}
