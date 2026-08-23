'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { fmtDateTime } from '@/lib/format';
import { mediaUrl } from '@/lib/storage';
import { SliderSheet, type SliderRow, type LinkOption } from './slider-sheet';
import { swapSliderOrder } from './actions';

const LINK_LABEL: Record<string, string> = { event: 'Εκδήλωση', product: 'Προϊόν', screen: 'Οθόνη', url: 'Σύνδεσμος' };

export function SlidersTab({ rows, events, products }: { rows: SliderRow[]; events: LinkOption[]; products: LinkOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<SliderRow | null | undefined>(undefined); // undefined = closed, null = new

  const move = (i: number, dir: -1 | 1) => start(async () => {
    const other = rows[i + dir];
    if (!other) return;
    const r = await swapSliderOrder(rows[i].id, other.id);
    if (!r.ok) { toast.error(r.error); return; }
    router.refresh();
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing(null)} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέο slide</Button>
      </div>
      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Δεν υπάρχουν slides ακόμη.</Card>}
      {rows.map((s, i) => (
        <Card key={s.id} className="flex flex-row items-center gap-4 p-3">
          <div className="flex flex-col">
            <Button variant="ghost" size="icon-sm" disabled={pending || i === 0} onClick={() => move(i, -1)} aria-label="Πάνω"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon-sm" disabled={pending || i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Κάτω"><ArrowDown className="h-4 w-4" /></Button>
          </div>
          {s.image_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={mediaUrl(s.image_url)} alt="" className="h-14 w-24 rounded object-cover shrink-0" />
            : <div className="h-14 w-24 rounded shrink-0" style={{ background: s.bg_color }} />}
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{s.title}</p>
            {s.subtitle && <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {s.link_type ? `${LINK_LABEL[s.link_type] ?? s.link_type}: ${s.link_target ?? '—'}` : 'Χωρίς σύνδεσμο'}
            </p>
          </div>
          <div className="hidden sm:block text-xs text-muted-foreground text-right">
            <p>Από: {s.starts_at ? fmtDateTime(s.starts_at) : '—'}</p>
            <p>Έως: {s.ends_at ? fmtDateTime(s.ends_at) : '—'}</p>
          </div>
          <StatusBadge value={s.status} />
          <Button variant="outline" size="sm" onClick={() => setEditing(s)}><Pencil className="h-3.5 w-3.5 mr-1" />Επεξεργασία</Button>
        </Card>
      ))}
      <SliderSheet open={editing !== undefined} onClose={() => setEditing(undefined)} slider={editing ?? null} events={events} products={products} />
    </div>
  );
}
