import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtDate } from '@/lib/format';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventForm } from '../event-form';
import { EventActions } from './event-actions';
import { RegistrationsTable } from './registrations-table';
import type { EventInput } from '../actions';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: event }, { data: regs }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).maybeSingle(),
    supabase.from('event_registrations').select('id, created_at, checked_in_at, kid:kids(first_name, last_name, dob, member_id), parent:profiles(firstname, lastname, mobile, email)').eq('event_id', id).order('created_at'),
  ]);
  if (!event) notFound();

  const initial: Partial<EventInput> = {
    ...event,
    highlights: (event.highlights as { emoji: string; label: string }[]) ?? [],
    time_label: event.time_label ?? '', location: event.location ?? '',
  };

  return (
    <div>
      <PageHeader title={event.title} description={`${fmtDate(event.date)} · ${event.location ?? ''}`}>
        <StatusBadge value={event.status} />
        <EventActions id={id} status={event.status} />
      </PageHeader>
      <Tabs defaultValue="edit">
        <TabsList className="mb-4"><TabsTrigger value="edit">Επεξεργασία</TabsTrigger><TabsTrigger value="regs">Συμμετοχές ({regs?.length ?? 0})</TabsTrigger></TabsList>
        <TabsContent value="edit"><EventForm id={id} initial={initial} /></TabsContent>
        <TabsContent value="regs"><RegistrationsTable eventTitle={event.title} rows={(regs ?? []) as never} /></TabsContent>
      </Tabs>
    </div>
  );
}
