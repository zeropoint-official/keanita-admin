'use client';
import { useState, useTransition } from 'react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/shared/form-field';
import { inviteSponsorUser } from '../actions';

export function SponsorInvite({ sponsorId }: { sponsorId: string }) {
  const [email, setEmail] = useState('');
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const r = await inviteSponsorUser(sponsorId, email);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success('Η πρόσκληση στάλθηκε — ο χορηγός θα ορίσει κωδικό από το email');
    setEmail('');
  });

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Πύλη χορηγού</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Ο χρήστης του χορηγού βλέπει ΜΟΝΟ τα δώρα των δικών του καμπανιών (αριθμός μέλους + μικρό όνομα
          παιδιού) και μπορεί να τα εξαργυρώνει στο ταμείο — τίποτα άλλο. Μόνο διαχειριστές στέλνουν προσκλήσεις.
        </p>
        <div className="flex gap-2 items-end max-w-md">
          <Field label="Email χρήστη χορηγού" className="flex-1">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@sponsor.com" />
          </Field>
          <Button type="button" disabled={pending || !email.trim()} onClick={submit} className="bg-[#E60C10] hover:bg-[#c50a0d]">
            <Send className="h-4 w-4 mr-1" />{pending ? 'Αποστολή…' : 'Πρόσκληση'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
