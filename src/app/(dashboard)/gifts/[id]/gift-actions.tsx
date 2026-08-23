'use client';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteGift } from '../actions';

export function GiftActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton variant="destructive" title="Διαγραφή δώρου;" description="Θα διαγραφεί οριστικά. Αν υπάρχουν εξαργυρώσεις για το δώρο, η διαγραφή θα αποτύχει — προτίμησε αρχειοθέτηση."
      onConfirm={async () => { const r = await deleteGift(id); if (r.ok) router.replace('/gifts'); return r; }}>Διαγραφή</ConfirmButton>
  );
}
