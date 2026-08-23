'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { saveQuickActions } from './actions';

const LABELS: [string, string][] = [
  ['rewards', 'Ανταμοιβές'], ['gifts', 'Δώρα'], ['discounts', 'Εκπτώσεις'],
  ['products', 'Προϊόντα'], ['activities', 'Δραστηριότητες'], ['about', 'Η ιστορία μας'],
];

export function QuickActionsForm({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [keys, setKeys] = useState<string[]>(initial);

  const toggle = (k: string, on: boolean) => setKeys((prev) => {
    const next = prev.filter((x) => x !== k);
    // Keep canonical order so the app renders consistently.
    return on ? LABELS.map(([key]) => key).filter((key) => key === k || next.includes(key)) : next;
  });

  const save = () => start(async () => {
    const r = await saveQuickActions(keys);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Αποθηκεύτηκε');
    router.refresh();
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Γρήγορη πρόσβαση</CardTitle>
        <CardDescription>Ποιες συντομεύσεις εμφανίζονται στην αρχική οθόνη. Απαιτεί ρόλο διαχειριστή.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {LABELS.map(([k, l]) => (
          <div key={k} className="flex items-center justify-between">
            <span className="text-sm">{l}</span>
            <Switch checked={keys.includes(k)} onCheckedChange={(on) => toggle(k, on)} />
          </div>
        ))}
        <Button onClick={save} disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{pending ? 'Αποθήκευση…' : 'Αποθήκευση'}</Button>
      </CardContent>
    </Card>
  );
}
