import { requireStaff } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/sonner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="flex min-h-screen bg-[#FAFAF7]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header staff={staff} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
