import type { createClient } from '@/lib/supabase/server';
import type { ForecastStats } from '@/lib/campaign-rules';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Live inputs for the forecast line: trailing 14 days of game + login activity. */
export async function getForecastStats(supabase: Supabase): Promise<ForecastStats> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ count: plays }, { data: scores }, { count: logins }] = await Promise.all([
    supabase.from('game_scores').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.from('game_scores').select('score').gte('created_at', since).order('created_at', { ascending: false }).limit(1000),
    supabase.from('points_ledger').select('id', { count: 'exact', head: true }).eq('reason', 'daily_login').gte('created_at', since),
  ]);
  const sample = scores ?? [];
  const pointsPerPlay = sample.length
    ? sample.reduce((sum, r) => sum + (r.score ?? 0), 0) / sample.length
    : 10;
  return {
    playsPerDay: (plays ?? 0) / 14,
    pointsPerPlay,
    activeUsersPerDay: (logins ?? 0) / 14,
  };
}
