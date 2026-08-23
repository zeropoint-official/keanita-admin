'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAV } from './nav';

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r bg-white">
      <div className="flex items-center gap-2 px-5 h-16 border-b">
        <div className="h-8 w-8 rounded-lg bg-[#E60C10] grid place-items-center text-white font-black">K</div>
        <span className="font-bold">Keanita Admin</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {NAV.map((g) => (
          <div key={g.title}>
            <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</p>
            {g.items.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors',
                    active ? 'bg-[#FFECEA] text-[#E60C10] font-semibold' : 'text-foreground/80 hover:bg-muted',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
