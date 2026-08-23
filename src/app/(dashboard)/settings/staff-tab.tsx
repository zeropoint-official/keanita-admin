'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/components/shared/form-field';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { fmtDate } from '@/lib/format';
import { removeStaff, setStaffRole } from './actions';

export interface StaffRow { id: string; full_name: string | null; role: 'admin' | 'editor' | 'viewer'; created_at: string }
const ROLE_LABEL: Record<StaffRow['role'], string> = { admin: 'Διαχειριστής', editor: 'Συντάκτης', viewer: 'Προβολή' };

export function StaffTab({ rows, me, isAdmin }: { rows: StaffRow[]; me: { id: string; email: string }; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const changeRole = (id: string, role: StaffRow['role']) => start(async () => {
    const r = await setStaffRole(id, role);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Ενημερώθηκε');
    router.refresh();
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <Card>
        <CardHeader>
          <CardTitle>Προσωπικό</CardTitle>
          <CardDescription>Χρήστες με πρόσβαση στο dashboard. Νέο προσωπικό προστίθεται από το Supabase (auth user + γραμμή στον πίνακα staff).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Όνομα</TableHead><TableHead>Ρόλος</TableHead><TableHead>Από</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.full_name ?? '—'}{s.id === me.id && <span className="ml-2 text-xs text-muted-foreground">(εσύ · {me.email})</span>}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{s.id}</p>
                  </TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Select value={s.role} onValueChange={(v) => changeRole(s.id, v as StaffRow['role'])} disabled={pending}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{(Object.keys(ROLE_LABEL) as StaffRow['role'][]).map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : ROLE_LABEL[s.role]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(s.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {isAdmin && s.id !== me.id && (
                      <ConfirmButton variant="ghost" size="sm" title="Αφαίρεση από το προσωπικό;" description="Ο χρήστης θα χάσει την πρόσβαση στο dashboard. Ο λογαριασμός του δεν διαγράφεται."
                        onConfirm={async () => { const r = await removeStaff(s.id); if (r.ok) router.refresh(); return r; }}>Αφαίρεση</ConfirmButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Κανένα μέλος προσωπικού.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ChangePasswordCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error('Τουλάχιστον 8 χαρακτήρες');
    if (pw !== pw2) return toast.error('Οι κωδικοί δεν ταιριάζουν');
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Ο κωδικός άλλαξε');
    setPw(''); setPw2('');
  };

  return (
    <Card>
      <CardHeader><CardTitle>Αλλαγή κωδικού</CardTitle><CardDescription>Για τον δικό σου λογαριασμό.</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Νέος κωδικός"><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Field label="Επιβεβαίωση"><Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          <Button type="submit" disabled={busy} className="w-full bg-[#E60C10] hover:bg-[#c50a0d]">{busy ? 'Αποθήκευση…' : 'Αλλαγή κωδικού'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
