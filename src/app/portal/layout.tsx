import { Toaster } from '@/components/ui/sonner';
import { LogoutButton } from '@/components/layout/logout-button';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#E60C10]" />
          <span className="font-bold">Keanita</span>
          <span className="text-muted-foreground text-sm">· Πύλη Χορηγών</span>
        </div>
        <LogoutButton />
      </header>
      <main className="p-6 md:p-8 max-w-5xl mx-auto">{children}</main>
      <Toaster />
    </div>
  );
}
