'use client';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteCampaign } from '../../actions';

export function CampaignActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton variant="destructive" title="Διαγραφή καμπάνιας;" description="Θα διαγραφούν και όλα τα δώρα που έχουν κερδηθεί σε αυτήν. Αν έχει τρέξει ήδη, προτίμησε κατάσταση «Ολοκληρώθηκε»."
      onConfirm={async () => { const r = await deleteCampaign(id); if (r.ok) router.replace('/sponsors?tab=campaigns'); return r; }}>Διαγραφή</ConfirmButton>
  );
}
