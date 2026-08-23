import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { CharacterForm } from '../character-form';
import { CharacterActions } from './character-actions';
import type { CharacterInput } from '../actions';

export default async function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) notFound();
  const supabase = await createClient();
  const { data: character } = await supabase.from('characters').select('*').eq('id', id).maybeSingle();
  if (!character) notFound();

  const initial: Partial<CharacterInput> = {
    ...character,
    tagline: character.tagline ?? '', description: character.description ?? '', best_friend: character.best_friend ?? '',
    power: character.power ?? '', favorite_juice: character.favorite_juice ?? '',
  };

  return (
    <div>
      <PageHeader title={character.name} description={character.tagline ?? undefined}>
        <StatusBadge value={character.status} />
        <CharacterActions id={id} />
      </PageHeader>
      <CharacterForm id={id} initial={initial} />
    </div>
  );
}
