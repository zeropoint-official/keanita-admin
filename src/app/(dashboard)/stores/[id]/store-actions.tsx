'use client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteStore, setStoreStatus } from '../actions';

export function StoreActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const change = async (s: 'draft' | 'published' | 'archived') => {
    const r = await setStoreStatus(id, s);
    if (r.ok) { toast.success('Ενημερώθηκε'); router.refresh(); } else toast.error(r.error);
  };
  return (
    <>
      {status !== 'published' && <Button variant="outline" onClick={() => change('published')}>Δημοσίευση</Button>}
      {status === 'published' && <Button variant="outline" onClick={() => change('draft')}>Απόσυρση</Button>}
      {status !== 'archived' && <Button variant="outline" onClick={() => change('archived')}>Αρχειοθέτηση</Button>}
      <ConfirmButton variant="destructive" title="Διαγραφή καταστήματος;" description="Θα διαγραφούν και οι εκπτώσεις του. Δεν αναιρείται."
        onConfirm={async () => { const r = await deleteStore(id); if (r.ok) router.replace('/stores'); return r; }}>Διαγραφή</ConfirmButton>
    </>
  );
}
