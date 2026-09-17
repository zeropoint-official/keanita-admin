'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Ready = 'checking' | 'ok' | 'expired';

export function SetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState<Ready>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Invite/recovery links land here with tokens in the URL fragment; adopt
  // them as the session, then let the user pick a password.
  useEffect(() => {
    const supabase = createClient();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    (async () => {
      if (hash.get('error') || hash.get('error_description')) {
        setReady('expired');
        return;
      }
      const at = hash.get('access_token');
      const rt = hash.get('refresh_token');
      if (at && rt) {
        const { error: e } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
        if (!e) {
          window.history.replaceState(null, '', window.location.pathname);
          setReady('ok');
          return;
        }
      }
      // The client may have already consumed the URL itself — poll briefly.
      for (let i = 0; i < 6; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) { setReady('ok'); return; }
        await new Promise((r) => setTimeout(r, 500));
      }
      setReady('expired');
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.');
    if (password !== confirm) return setError('Οι κωδικοί δεν ταιριάζουν.');
    setSaving(true);
    setError(undefined);
    const { error: e2 } = await createClient().auth.updateUser({ password });
    if (e2) {
      setSaving(false);
      return setError('Κάτι πήγε στραβά — δοκίμασε ξανά.');
    }
    // The server routes the account from '/' (staff → dashboard, sponsor → /portal).
    router.replace('/');
    router.refresh();
  }

  if (ready === 'checking') {
    return <Card><CardContent className="pt-6 text-center text-sm text-muted-foreground">Έλεγχος πρόσκλησης…</CardContent></Card>;
  }
  if (ready === 'expired') {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3 text-center">
          <p className="text-sm">Ο σύνδεσμος έχει λήξει ή χρησιμοποιήθηκε ήδη.</p>
          <p className="text-sm text-muted-foreground">Ζήτησε νέα πρόσκληση από τον διαχειριστή — το νέο email θα δουλέψει κανονικά.</p>
          <Button render={<Link href="/login" />} variant="outline" className="w-full">Σύνδεση</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Νέος κωδικός</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Επιβεβαίωση κωδικού</Label>
            <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full bg-[#E60C10] hover:bg-[#c50a0d]" disabled={saving}>
            {saving ? 'Αποθήκευση…' : 'Ορισμός κωδικού'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
