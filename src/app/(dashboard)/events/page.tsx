import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { EventsTable } from './events-table';

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('id, type, title, date, time_label, location, image_url, status, show_on_home, notify_on, notified_at, event_registrations(count)')
    .order('date', { ascending: false });

  const rows = (events ?? []).map((e) => ({ ...e, registrations: (e.event_registrations as unknown as { count: number }[])[0]?.count ?? 0 }));

  return (
    <div>
      <PageHeader title="Εκδηλώσεις & Σεμινάρια" description="Εκδηλώσεις, σεμινάρια και ανακοινώσεις που βλέπουν τα μέλη στην εφαρμογή.">
        <Button render={<Link href="/events/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέα εκδήλωση</Button>
      </PageHeader>
      <EventsTable rows={rows} />
    </div>
  );
}
