'use client';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-screen grid place-items-center bg-[#FFF5F5] p-6">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-[#E60C10] grid place-items-center text-white text-xl font-black">!</div>
        <h1 className="text-xl font-bold">Κάτι πήγε στραβά</h1>
        <p className="text-sm text-muted-foreground mt-2">Η ενέργεια δεν ολοκληρώθηκε. Δοκίμασε ξανά — αν συνεχίζεται, κάνε ανανέωση της σελίδας.</p>
        {error.digest && <p className="text-xs text-muted-foreground/60 mt-2 font-mono">{error.digest}</p>}
        <Button onClick={reset} className="mt-5 bg-[#E60C10] hover:bg-[#c50a0d]">Δοκίμασε ξανά</Button>
      </div>
    </main>
  );
}
