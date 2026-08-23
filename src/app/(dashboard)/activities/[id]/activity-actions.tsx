'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteActivity, setActivityStatus } from '../actions';

export function ActivityActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const change = async (s: 'draft' | 'published' | 'archived') => {
    const r = await setActivityStatus(id, s);
    if (r.ok) { toast.success('Ενημερώθηκε'); router.refresh(); } else toast.error(r.error);
  };
  return (
    <>
      {status !== 'published' && <Button variant="outline" onClick={() => change('published')}>Δημοσίευση</Button>}
      {status === 'published' && <Button variant="outline" onClick={() => change('draft')}>Απόσυρση</Button>}
      {status !== 'archived' && <Button variant="outline" onClick={() => change('archived')}>Αρχειοθέτηση</Button>}
      <ConfirmButton variant="destructive" title="Διαγραφή δραστηριότητας;" description="Δεν αναιρείται."
        onConfirm={async () => { const r = await deleteActivity(id); if (r.ok) router.replace('/activities'); return r; }}>Διαγραφή</ConfirmButton>
    </>
  );
}
