import Link from 'next/link';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { mediaUrl } from '@/lib/storage';

export default async function CharactersPage() {
  const supabase = await createClient();
  const { data: characters } = await supabase
    .from('characters')
    .select('id, name, slug, tagline, image_url, status, bg_color')
    .order('sort_order').order('name');

  return (
    <div>
      <PageHeader title="Χαρακτήρες" description="Οι ήρωες της Keanita που γνωρίζουν τα παιδιά στην εφαρμογή.">
        <Button render={<Link href="/characters/new" />} className="bg-[#E60C10] hover:bg-[#c50a0d]"><Plus className="h-4 w-4 mr-1" />Νέος χαρακτήρας</Button>
      </PageHeader>
      {!characters?.length ? (
        <p className="text-sm text-muted-foreground">Δεν υπάρχουν χαρακτήρες ακόμα.</p>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {characters.map((c) => (
            <Link key={c.id} href={`/characters/${c.id}`} className="group rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square grid place-items-center" style={{ background: c.bg_color }}>
                {c.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={mediaUrl(c.image_url)} alt={c.name} className="h-full w-full object-contain p-3 group-hover:scale-105 transition-transform" />
                  : <span className="text-xs text-muted-foreground">Χωρίς εικόνα</span>}
              </div>
              <div className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{c.name}</p>
                  <StatusBadge value={c.status} className="shrink-0 text-[10px]" />
                </div>
                {c.tagline && <p className="text-xs text-muted-foreground line-clamp-2">{c.tagline}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
