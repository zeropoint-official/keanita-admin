import { isoToLocalInput } from '@/lib/format';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { fmtDateTime, fmtNum } from '@/lib/format';
import { CampaignForm } from '../campaign-form';
import { SourceBadge } from '../campaigns-table';
import { audienceSummary } from '../campaign-utils';
import { CampaignActions } from './campaign-actions';
import type { Audience, CampaignInput } from '../actions';
import { loadLinkOptions } from '../link-options';


export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: c }, opts] = await Promise.all([supabase.from('push_campaigns').select('*').eq('id', id).maybeSingle(), loadLinkOptions()]);
  if (!c) notFound();

  const a = (c.audience ?? {}) as Audience;
  const editable = ['draft', 'scheduled', 'cancelled', 'failed'].includes(c.status) && c.source === 'manual';
  const initial: Partial<CampaignInput> = {
    title: c.title, body: c.body, type: c.type === 'birthday' ? 'system' : c.type,
    link_type: (c.link_type as CampaignInput['link_type']) ?? 'none', link_target: c.link_target,
    audience_mode: a.user_ids?.length ? 'test' : a.all && !a.kid_min_age && !a.kid_max_age ? 'all' : 'targeted',
    kid_min_age: a.kid_min_age ?? null, kid_max_age: a.kid_max_age ?? null, kid_status: a.kid_status ?? 'any',
    districts: (a.districts ?? []).join(', '),
    schedule_mode: c.scheduled_at && c.status !== 'sent' && new Date(c.scheduled_at) > new Date() ? 'later' : 'now',
    scheduled_at: isoToLocalInput(c.scheduled_at),
  };
  const stats = (c.stats ?? {}) as Record<string, number>;

  return (
    <div>
      <PageHeader title={c.title} description={`${audienceSummary(a)} · ${c.sent_at ? `στάλθηκε ${fmtDateTime(c.sent_at)}` : c.scheduled_at ? `προγραμματισμένο για ${fmtDateTime(c.scheduled_at)}` : 'χωρίς προγραμματισμό'}`}>
        <SourceBadge value={c.source} />
        <StatusBadge value={c.status} />
        <CampaignActions id={id} status={c.status} />
      </PageHeader>
      {(c.status === 'sent' || c.status === 'sending') && (
        <Card className="mb-6">
          <CardContent className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-5">
            {([['targeted', 'Στόχος'], ['sent', 'Στάλθηκαν'], ['delivered', 'Παραδόθηκαν'], ['opened', 'Άνοιξαν'], ['failed', 'Απέτυχαν']] as const).map(([k, l]) => (
              <div key={k}><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l}</p><p className="text-2xl font-bold tabular-nums">{fmtNum(stats[k])}</p></div>
            ))}
          </CardContent>
        </Card>
      )}
      {!editable && <p className="mb-4 text-sm text-muted-foreground">{c.source !== 'manual' ? 'Αυτόματη καμπάνια — προβολή μόνο.' : 'Η καμπάνια έχει σταλεί — προβολή μόνο.'}</p>}
      <CampaignForm id={id} initial={initial} readOnly={!editable} {...opts} />
    </div>
  );
}
