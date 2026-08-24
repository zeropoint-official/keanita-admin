'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NAV } from './nav';

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}><Menu className="h-5 w-5" /></SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 overflow-y-auto">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="h-7 w-7 rounded-lg bg-[#E60C10] grid place-items-center text-white font-black text-sm">K</span>
            Keanita Admin
          </SheetTitle>
        </SheetHeader>
        <nav className="p-3 space-y-5">
          {NAV.map((g) => (
            <div key={g.title}>
              <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
              {g.items.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className={cn('flex items-center gap-2.5 rounded-md px-2 py-2.5 text-sm transition-colors',
                      active ? 'bg-[#FFECEA] text-[#E60C10] font-semibold' : 'text-foreground/80 hover:bg-muted')}>
                    <item.icon className="h-4 w-4" />{item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
