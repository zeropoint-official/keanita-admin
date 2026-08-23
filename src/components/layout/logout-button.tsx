'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button variant="ghost" size="icon" title="Αποσύνδεση" onClick={async () => {
      await createClient().auth.signOut();
      router.replace('/login');
      router.refresh();
    }}>
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
