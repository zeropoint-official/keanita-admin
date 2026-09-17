'use client';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteSponsor } from '../actions';

export function SponsorActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmButton variant="destructive" title="Διαγραφή χορηγού;" description="Θα διαγραφούν και όλες οι καμπάνιες και τα δώρα του. Αν υπάρχουν κερδισμένα δώρα, προτίμησε αρχειοθέτηση."
      onConfirm={async () => { const r = await deleteSponsor(id); if (r.ok) router.replace('/sponsors'); return r; }}>Διαγραφή</ConfirmButton>
  );
}
