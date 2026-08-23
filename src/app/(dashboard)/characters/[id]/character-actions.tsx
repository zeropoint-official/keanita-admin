'use client';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteCharacter } from '../actions';

export function CharacterActions({ id }: { id: number }) {
  const router = useRouter();
  return (
    <ConfirmButton variant="destructive" title="Διαγραφή χαρακτήρα;" description="Δεν αναιρείται."
      onConfirm={async () => { const r = await deleteCharacter(id); if (r.ok) router.replace('/characters'); return r; }}>Διαγραφή</ConfirmButton>
  );
}
