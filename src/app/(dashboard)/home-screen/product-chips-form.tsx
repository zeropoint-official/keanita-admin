'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PairListEditor } from '@/components/shared/list-editor';
import { saveProductChips } from './actions';

type Chip = { emoji: string; label: string };

export function ProductChipsForm({ initial }: { initial: Chip[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chips, setChips] = useState<Chip[]>(initial);

  const save = () => start(async () => {
    const r = await saveProductChips(chips);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    router.refresh();
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Chips προϊόντων</CardTitle>
        <CardDescription>Μικρές ετικέτες (emoji + κείμενο) κάτω από τα προϊόντα στην αρχική. Απαιτεί ρόλο διαχειριστή.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <PairListEditor value={chips} onChange={setChips} keys={['emoji', 'label']} placeholders={['🍊', 'Χωρίς ζάχαρη']} />
        <Button onClick={save} disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </CardContent>
    </Card>
  );
}
