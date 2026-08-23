'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteEvent, setEventStatus } from '../actions';

export function EventActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const change = async (s: 'draft' | 'published' | 'archived') => {
    const r = await setEventStatus(id, s);
    if (r.ok) { toast.success('Ενημερώθηκε'); router.refresh(); } else toast.error(r.error);
  };
  return (
    <>
      {status !== 'published' && <Button variant="outline" onClick={() => change('published')}>Δημοσίευση</Button>}
      {status === 'published' && <Button variant="outline" onClick={() => change('draft')}>Απόσυρση</Button>}
      {status !== 'archived' && <Button variant="outline" onClick={() => change('archived')}>Αρχειοθέτηση</Button>}
      <ConfirmButton variant="destructive" title="Διαγραφή εκδήλωσης;" description="Θα διαγραφούν και όλες οι συμμετοχές. Δεν αναιρείται."
        onConfirm={async () => { const r = await deleteEvent(id); if (r.ok) router.replace('/events'); return r; }}>Διαγραφή</ConfirmButton>
    </>
  );
}
