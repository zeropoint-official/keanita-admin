'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { cancelCampaign, deleteCampaign } from '../actions';

export function CampaignActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <>
      {status === 'scheduled' && (
        <Button variant="outline" onClick={async () => { const r = await cancelCampaign(id); if (r.ok) { toast.success('Ακυρώθηκε'); router.refresh(); } else toast.error(r.error); }}>Ακύρωση αποστολής</Button>
      )}
      {status !== 'sending' && (
        <ConfirmButton variant="destructive" title="Διαγραφή καμπάνιας;" description="Δεν αναιρείται. Οι ειδοποιήσεις που έχουν ήδη σταλεί παραμένουν στα inbox των χρηστών."
          onConfirm={async () => { const r = await deleteCampaign(id); if (r.ok) router.replace('/notifications'); return r; }}>Διαγραφή</ConfirmButton>
      )}
    </>
  );
}
