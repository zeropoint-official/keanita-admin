'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteProductCategory, saveProductCategory } from '../actions';

interface Row { key: string; name: string; plural_name: string; emoji: string | null; sort_order: number; count: number }
type Draft = { name: string; plural_name: string; emoji: string; sort_order: number };

const EMPTY: Draft = { name: '', plural_name: '', emoji: '', sort_order: 0 };

export function ProductCategoriesManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState<({ key: string } & Draft) | null>(null);

  const create = () => start(async () => {
    const r = await saveProductCategory(null, { ...draft, sort_order: rows.length });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Προστέθηκε'); setDraft(EMPTY); router.refresh();
  });
  const update = () => start(async () => {
    if (!editing) return;
    const { key, ...values } = editing;
    const r = await saveProductCategory(key, values);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Ενημερώθηκε'); setEditing(null); router.refresh();
  });

  const canCreate = draft.name.trim() && draft.plural_name.trim();

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Νέα κατηγορία</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-2 sm:grid-cols-[1fr_1fr_80px_auto]" onSubmit={(e) => { e.preventDefault(); if (canCreate) create(); }}>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ενικός, π.χ. Γάλα" />
            <Input value={draft.plural_name} onChange={(e) => setDraft({ ...draft, plural_name: e.target.value })} placeholder="Πληθυντικός, π.χ. Γάλατα" />
            <Input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="🥛" />
            <Button type="submit" disabled={pending || !canCreate} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Προσθήκη</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Ο ενικός εμφανίζεται στο προϊόν, ο πληθυντικός στο φίλτρο της λίστας.</p>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white divide-y">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Δεν υπάρχουν κατηγορίες.</p>}
        {rows.map((c) => (
          <div key={c.key} className="flex items-center gap-2 p-3">
            {editing?.key === c.key ? (
              <>
                <Input type="number" className="w-16" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                <Input className="w-14" value={editing.emoji} onChange={(e) => setEditing({ ...editing, emoji: e.target.value })} />
                <Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <Input value={editing.plural_name} onChange={(e) => setEditing({ ...editing, plural_name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); update(); } if (e.key === 'Escape') setEditing(null); }} />
                <Button size="icon" variant="ghost" disabled={pending} onClick={update}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <span className="w-16 text-xs text-muted-foreground tabular-nums">#{c.sort_order}</span>
                <span className="w-8 text-lg">{c.emoji}</span>
                <span className="flex-1 font-medium">{c.name} <span className="text-muted-foreground font-normal">· {c.plural_name}</span></span>
                <span className="text-xs text-muted-foreground">{c.count} προϊόντα</span>
                <Button size="icon" variant="ghost" onClick={() => setEditing({ key: c.key, name: c.name, plural_name: c.plural_name, emoji: c.emoji ?? '', sort_order: c.sort_order })}><Pencil className="h-4 w-4" /></Button>
                <ConfirmButton variant="ghost" size="sm" className="text-destructive" title={`Διαγραφή «${c.name}»;`}
                  description={c.count ? `Έχει ${c.count} προϊόντα — μετάφερέ τα πρώτα σε άλλη κατηγορία.` : 'Δεν αναιρείται.'}
                  onConfirm={async () => { const r = await deleteProductCategory(c.key); if (r.ok) router.refresh(); return r; }}>Διαγραφή</ConfirmButton>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
