import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface SectionTab { href: string; label: string; badge?: number }

/** Link-based tabs for switching between related pages of one section. */
export function SectionTabs({ tabs, active }: { tabs: SectionTab[]; active: string }) {
  return (
    <div className="flex gap-1 border-b mb-5">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href}
          className={cn('px-4 py-2 -mb-px text-sm font-semibold border-b-2 transition-colors inline-flex items-center gap-2',
            active === t.href ? 'border-[#E60C10] text-[#E60C10]' : 'border-transparent text-muted-foreground hover:text-foreground')}>
          {t.label}
          {!!t.badge && <span className="rounded-full bg-[#E60C10] text-white text-[11px] font-bold px-1.5 py-0.5 leading-none">{t.badge}</span>}
        </Link>
      ))}
    </div>
  );
}
