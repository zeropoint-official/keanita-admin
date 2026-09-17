import Link from 'next/link';
import { CircleHelp } from 'lucide-react';

/** Small "?" button linking into a section of the guide page (/guide#<section>). */
export function HelpLink({ section, label = 'Οδηγός' }: { section: string; label?: string }) {
  return (
    <Link href={`/guide#${section}`}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
      <CircleHelp className="h-3.5 w-3.5" />{label}
    </Link>
  );
}
