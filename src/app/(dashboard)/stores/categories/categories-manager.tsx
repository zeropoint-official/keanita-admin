'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { deleteCategory, saveCategory } from '../actions';

interface Row { id: number; name: string; sort_order: number; count: number }

export function CategoriesManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: number; name: string; sort_order: number } | null>(null);

  const create = () => start(async () => {
    const r = await saveCategory(null, { name: newName, sort_order: rows.length });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Προστέθηκε'); setNewName(''); router.refresh();
  });
  const update = () => start(async () => {
    if (!editing) return;
    const r = await saveCategory(editing.id, { name: editing.name, sort_order: editing.sort_order });
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Ενημερώθηκε'); setEditing(null); router.refresh();
  });

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Νέα κατηγορία</CardTitle></CardHeader>
        <CardContent>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newName.trim()) create(); }}>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="π.χ. Παιχνίδια" />
            <Button type="submit" disabled={pending || !newName.trim()} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Προσθήκη</Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-white divide-y">
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Δεν υπάρχουν κατηγορίες.</p>}
        {rows.map((c) => (
          <div key={c.id} className="flex items-center gap-2 p-3">
            {editing?.id === c.id ? (
              <>
                <Input type="number" className="w-20" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                <Input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); update(); } if (e.key === 'Escape') setEditing(null); }} />
                <Button size="icon" variant="ghost" disabled={pending} onClick={update}><Check className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
              </>
            ) : (
              <>
                <span className="w-20 text-xs text-muted-foreground tabular-nums">#{c.sort_order}</span>
                <span className="flex-1 font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.count} καταστήματα</span>
                <Button size="icon" variant="ghost" onClick={() => setEditing({ id: c.id, name: c.name, sort_order: c.sort_order })}><Pencil className="h-4 w-4" /></Button>
                <ConfirmButton variant="ghost" size="sm" className="text-destructive" title={`Διαγραφή «${c.name}»;`}
                  description={c.count ? `${c.count} καταστήματα θα μείνουν χωρίς κατηγορία.` : 'Δεν αναιρείται.'}
                  onConfirm={async () => { const r = await deleteCategory(c.id); if (r.ok) router.refresh(); return r; }}>Διαγραφή</ConfirmButton>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
