'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { fmtDate, ageOf } from '@/lib/format';
import { deleteKid, saveKid, setKidStatus } from '../actions';

export interface Kid { id: string; first_name: string; last_name: string | null; dob: string; gender: 'boy' | 'girl' | 'other' | null; status: string; member_id: string | null; reject_reason: string | null; approved_at: string | null }
type KidValues = { first_name: string; last_name: string; dob: string; gender: 'boy' | 'girl' | 'other' | null };

export function KidsPanel({ parentId, kids }: { parentId: string; kids: Kid[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string | null; values: KidValues } | null>(null);
  const [pending, start] = useTransition();
  const [reason, setReason] = useState('');

  const status = (kid: Kid, s: 'approved' | 'rejected' | 'expired' | 'pending') => async () => {
    const r = await setKidStatus(kid.id, s, s === 'rejected' ? reason : undefined); router.refresh(); setReason(''); return r;
  };

  return (
    <div className="space-y-3">
      {kids.map((k) => (
        <Card key={k.id}><CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="h-11 w-11 rounded-full grid place-items-center text-xl" style={{ background: k.gender === 'girl' ? '#FFECEA' : '#E1F5FD' }}>{k.gender === 'girl' ? '👧' : '👦'}</div>
          <div className="flex-1 min-w-40">
            <p className="font-semibold">{k.first_name} {k.last_name} <span className="text-muted-foreground font-normal text-sm">· {ageOf(k.dob)} ετών</span></p>
            <p className="text-xs text-muted-foreground">Γενέθλια {fmtDate(k.dob)} {k.member_id && `· ${k.member_id}`} {k.reject_reason && `· Λόγος: ${k.reject_reason}`}</p>
          </div>
          <StatusBadge value={k.status} />
          <div className="flex gap-1 flex-wrap">
            {k.status === 'pending' && <>
              <ConfirmButton size="sm" title="Έγκριση παιδιού;" description="Θα αποδοθεί αριθμός μέλους και θα ενεργοποιηθεί η κάρτα." onConfirm={status(k, 'approved')} successMessage="Εγκρίθηκε">Έγκριση</ConfirmButton>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Λόγος απόρριψης" className="h-8 w-40 text-xs" />
              <ConfirmButton size="sm" variant="outline" title="Απόρριψη;" onConfirm={status(k, 'rejected')}>Απόρριψη</ConfirmButton>
            </>}
            {k.status === 'approved' && <ConfirmButton size="sm" variant="outline" title="Λήξη μέλους;" onConfirm={status(k, 'expired')}>Λήξη</ConfirmButton>}
            {(k.status === 'rejected' || k.status === 'expired') && <ConfirmButton size="sm" variant="outline" title="Επαναφορά σε αναμονή;" onConfirm={status(k, 'pending')}>Επαναφορά</ConfirmButton>}
            <Button size="sm" variant="ghost" onClick={() => setEditing({ id: k.id, values: { first_name: k.first_name, last_name: k.last_name ?? '', dob: k.dob, gender: k.gender } })}>Επεξεργασία</Button>
            <ConfirmButton size="sm" variant="ghost" title="Διαγραφή παιδιού;" description="Δεν αναιρείται." onConfirm={async () => { const r = await deleteKid(parentId, k.id); router.refresh(); return r; }}>Διαγραφή</ConfirmButton>
          </div>
        </CardContent></Card>
      ))}
      {!kids.length && <p className="text-sm text-muted-foreground">Δεν έχουν καταχωρηθεί παιδιά.</p>}
      <Button variant="outline" onClick={() => setEditing({ id: null, values: { first_name: '', last_name: '', dob: '', gender: null } })}><Plus className="h-4 w-4 mr-1" />Προσθήκη παιδιού</Button>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? 'Επεξεργασία παιδιού' : 'Νέο παιδί'}</DialogTitle></DialogHeader>
          {editing && (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); start(async () => {
              const r = await saveKid(parentId, editing.id, editing.values);
              if (r.ok) { toast.success('Αποθηκεύτηκε'); setEditing(null); router.refresh(); } else toast.error(r.error);
            }); }}>
              <Field label="Όνομα" required><Input value={editing.values.first_name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, first_name: e.target.value } })} required /></Field>
              <Field label="Επώνυμο"><Input value={editing.values.last_name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, last_name: e.target.value } })} /></Field>
              <Field label="Ημ. γέννησης" required><Input type="date" value={editing.values.dob} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, dob: e.target.value } })} required /></Field>
              <Field label="Φύλο">
                <Select value={editing.values.gender ?? ''} onValueChange={(v) => setEditing({ ...editing, values: { ...editing.values, gender: (v || null) as KidValues['gender'] } })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="boy">Αγόρι</SelectItem><SelectItem value="girl">Κορίτσι</SelectItem><SelectItem value="other">Άλλο</SelectItem></SelectContent>
                </Select>
              </Field>
              <Button type="submit" disabled={pending} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">Αποθήκευση</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
