/**
 * The campaign rulebook — single source of truth used by:
 *  - the campaign form (live errors/warnings + forecast line),
 *  - the Generate button (valid-by-construction, forecast-aware rolls),
 *  - the save action (server-side guard; the SQL RPC enforces the rest).
 * All messages are plain Greek, written for Kean — not for developers.
 *
 * Trigger model: campaigns are won IN THE GAME, one of two ways —
 * a points milestone or a random drop. Everything else (loyalty, age,
 * approval, daily caps) is a REQUIREMENT layered on top. The DB enum
 * still carries the legacy trigger values; the dashboard no longer
 * offers them.
 */

export type Trigger = 'game_milestone' | 'game_drop';
export type QuotaMode = 'total' | 'monthly' | 'weekly';
export type Fulfillment = 'pickup' | 'code';

/** Normalized (numeric) form values — '' means "not set". */
export interface CampaignRuleInput {
  trigger: Trigger;
  every_points: number | '';
  chance_pct: number | '';
  fulfillment: Fulfillment;
  quota_mode: QuotaMode;
  quota_amount: number;
  per_user_limit: number;
  starts_at: string | null;  // datetime-local values (comparable as strings)
  ends_at: string | null;
  expiry_days: number | '';
  min_age: number | '';
  max_age: number | '';
  min_kp: number | '';
  max_wins_per_day: number | '';
  codes_count: number;       // uploaded coupon codes (0 for new campaigns)
}

export interface RuleResult {
  /** Block publishing (status: active) while any of these exist. */
  errors: string[];
  /** Shown, never blocking. */
  warnings: string[];
}

const MS_PER_DAY = 86_400_000;

/**
 * How many monthly/weekly periods the date window touches — CALENDAR periods
 * (months / ISO weeks), matching how the win_campaign_gift RPC counts stock.
 */
export function periodCount(mode: QuotaMode, starts?: string | null, ends?: string | null): number | null {
  if (mode === 'total' || !starts || !ends) return null;
  const s = new Date(starts);
  const e = new Date(ends);
  if (!(e.getTime() > s.getTime())) return null;
  if (mode === 'monthly') {
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  }
  const monday = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  };
  return Math.round((monday(e).getTime() - monday(s).getTime()) / (7 * MS_PER_DAY)) + 1;
}

/** Total gifts the campaign commits to hand out over its lifetime. */
export function committedTotal(input: Pick<CampaignRuleInput, 'quota_mode' | 'quota_amount' | 'starts_at' | 'ends_at'>): number {
  const periods = periodCount(input.quota_mode, input.starts_at, input.ends_at);
  return periods ? periods * input.quota_amount : input.quota_amount;
}

export function validateCampaign(v: CampaignRuleInput): RuleResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const total = committedTotal(v);

  // 1. per-user limit vs quota
  if (v.per_user_limit > v.quota_amount) {
    errors.push('Το όριο ανά μέλος δεν μπορεί να ξεπερνά την ποσότητα των δώρων.');
  }

  // 2. periodic quota needs a date window
  if (v.quota_mode !== 'total' && (!v.starts_at || !v.ends_at)) {
    errors.push('Η περιοδική ποσόστωση (ανά μήνα/εβδομάδα) χρειάζεται ημερομηνία έναρξης και λήξης.');
  }

  // 3. code campaigns are bounded by uploaded codes
  if (v.fulfillment === 'code') {
    if (v.codes_count === 0) {
      errors.push('Ανέβασε κωδικούς κουπονιών πριν δημοσιεύσεις — χωρίς κωδικούς δεν καταγράφονται νίκες.');
    } else if (v.codes_count < total) {
      warnings.push(`Οι κωδικοί (${v.codes_count}) δεν καλύπτουν όλα τα δεσμευμένα δώρα (${total}) — οι νίκες θα σταματήσουν όταν εξαντληθούν.`);
    }
  }

  // 4. the win mechanic must be configured
  if (v.trigger === 'game_milestone' && (v.every_points === '' || v.every_points < 5)) {
    errors.push('Το ορόσημο του παιχνιδιού πρέπει να είναι τουλάχιστον 5 πόντοι.');
  }
  if (v.trigger === 'game_drop' && (v.chance_pct === '' || v.chance_pct <= 0 || v.chance_pct > 5)) {
    errors.push('Η πιθανότητα εμφάνισης πρέπει να είναι από 0,1% έως 5%.');
  }

  // 5. expiry: required for scarce pickups, recommended otherwise
  if (v.fulfillment === 'pickup' && v.expiry_days === '') {
    if (total <= 25) {
      errors.push('Με τόσο λίγα δώρα, όρισε λήξη (π.χ. 14–30 ημέρες) ώστε όσα δεν παραλαμβάνονται να επιστρέφουν στο απόθεμα.');
    } else {
      warnings.push('Χωρίς λήξη, τα δώρα που δεν παραλαμβάνονται δεσμεύουν το απόθεμα για πάντα — προτείνεται λήξη 30 ημερών.');
    }
  }

  // 6. sane window + age range
  if (v.starts_at && v.ends_at && v.ends_at <= v.starts_at) {
    errors.push('Η λήξη της καμπάνιας πρέπει να είναι μετά την έναρξη.');
  }
  const ageOk = (a: number | '') => a === '' || (a >= 0 && a <= 11);
  if (!ageOk(v.min_age) || !ageOk(v.max_age)) {
    errors.push('Η ηλικία πρέπει να είναι από 0 έως 11 ετών.');
  }
  if (v.min_age !== '' && v.max_age !== '' && v.min_age > v.max_age) {
    errors.push('Το εύρος ηλικίας δεν είναι σωστό (από > έως).');
  }

  return { errors, warnings };
}

// ─── Forecast: plain arithmetic on live data ───

export interface ForecastStats {
  /** Φρουτοτρέλα runs per day (trailing 14 days). */
  playsPerDay: number;
  /** Average fruits (score) per run. */
  pointsPerPlay: number;
  /** Users with a daily login per day (trailing 14 days). */
  activeUsersPerDay: number;
}

const fmt = (n: number) => Math.round(n).toLocaleString('el-GR');
/** Random drops: objects spawned per run ≈ double the fruits actually caught. */
const spawnsPerPlay = (s: ForecastStats) => Math.max(20, s.pointsPerPlay * 2);

/** Expected wins/day for a configured campaign; null when the knob is unset or stats are empty. */
export function expectedWinsPerDay(v: CampaignRuleInput, s: ForecastStats): number | null {
  if (s.playsPerDay <= 0) return null;
  const cap = v.max_wins_per_day === '' ? 1 : v.max_wins_per_day;
  if (v.trigger === 'game_milestone' && v.every_points !== '' && v.every_points > 0) {
    const perPlay = Math.min(s.pointsPerPlay / v.every_points, cap);
    return Math.min(s.playsPerDay * perPlay, s.activeUsersPerDay * cap);
  }
  if (v.trigger === 'game_drop' && v.chance_pct !== '' && v.chance_pct > 0) {
    return Math.min(s.playsPerDay * spawnsPerPlay(s) * (v.chance_pct / 100), s.activeUsersPerDay * cap);
  }
  return null;
}

/** One Greek sentence: how fast the stock will run out. Null when there is nothing useful to say. */
export function forecastLine(v: CampaignRuleInput, stats: ForecastStats | null): string | null {
  if (!stats || v.quota_amount <= 0) return null;
  const winsPerDay = expectedWinsPerDay(v, stats);
  if (winsPerDay == null) return null;
  const players = `Με ~${fmt(stats.activeUsersPerDay)} ενεργούς παίκτες/μέρα`;
  if (winsPerDay < 0.05) {
    return `${players}, με αυτές τις ρυθμίσεις τα δώρα θα εξαντλούνται πολύ αργά (λιγότερο από 1 νίκη/20 μέρες).`;
  }
  const days = Math.max(1, Math.ceil(v.quota_amount / winsPerDay));
  if (v.quota_mode === 'total') {
    return `${players}, τα ${fmt(v.quota_amount)} δώρα θα εξαντληθούν σε ~${fmt(days)} μέρες.`;
  }
  const period = v.quota_mode === 'monthly' ? 'μηνιαία' : 'εβδομαδιαία';
  return `${players}, η ${period} ποσόστωση (${fmt(v.quota_amount)}) θα εξαντλείται σε ~${fmt(days)} μέρες.`;
}

// ─── Generate: forecast-aware rolls, randomized within constraints ───

export type ScarcityClass = 'scarce' | 'medium' | 'mass';

export function classifyScarcity(total: number): ScarcityClass {
  if (total <= 25) return 'scarce';
  if (total <= 300) return 'medium';
  return 'mass';
}

export interface GenerateOpts {
  quota_amount: number;
  quota_mode: QuotaMode;
  starts_at: string | null;
  ends_at: string | null;
  fulfillment: Fulfillment;
  codes_count: number;
  stats: ForecastStats | null;
}

/** The fields Generate fills in; everything else (title, dates, ages…) stays as Kean set it. */
export interface GeneratedConfig {
  trigger: Trigger;
  every_points: number | '';
  chance_pct: number | '';
  fulfillment: Fulfillment;
  per_user_limit: number;
  expiry_days: number;
  kid_approved: boolean;
  min_kp: number | '';
  max_wins_per_day: number;
}

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
const chanceOf = (p: number) => Math.random() < p;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Roll a campaign mechanic + requirements. Forecast-aware: when live stats
 * exist, the milestone/chance is SOLVED so the stock lasts a sensible target
 * horizon (≈ one period for periodic quotas, scarcity-scaled otherwise) and
 * then jittered; without stats it falls back to static ranges. Requirements
 * scale with scarcity — rare gifts go to approved, loyal members and expire
 * fast so no-shows return stock. Age range is deliberately NOT rolled: it is
 * prize-specific, not a dial. Every output passes validateCampaign by
 * construction (given quota ≥ 1).
 */
export function generateCampaign(o: GenerateOpts): GeneratedConfig {
  const total = committedTotal({ quota_mode: o.quota_mode, quota_amount: o.quota_amount, starts_at: o.starts_at, ends_at: o.ends_at });
  const cls = classifyScarcity(total);
  const s = o.stats && o.stats.playsPerDay >= 1 && o.stats.pointsPerPlay > 0 ? o.stats : null;

  // Target horizon: periodic quotas should last ≈ their period; totals scale with scarcity.
  const periodDays = o.quota_mode === 'monthly' ? 30 : o.quota_mode === 'weekly' ? 7 : null;
  const targetDays = periodDays
    ? Math.max(3, Math.round(periodDays * (0.8 + Math.random() * 0.3)))
    : cls === 'scarce' ? randInt(30, 60) : cls === 'medium' ? randInt(21, 45) : randInt(14, 30);
  const neededPerDay = Math.max(0.05, o.quota_amount / targetDays);

  // Solve BOTH mechanics for the needed win rate, then pick: rare stock
  // prefers the controlled milestone, plentiful stock can afford luck — but
  // a mechanic whose clamped range can't get near the target loses to the
  // one that can (e.g. heavy traffic + small monthly quota needs a low-chance
  // drop; no reachable milestone slows wins that much).
  const milestoneWeight = cls === 'scarce' ? 0.85 : cls === 'medium' ? 0.7 : 0.5;
  let trigger: Trigger;
  let every_points: number | '' = '';
  let chance_pct: number | '' = '';
  if (!s) {
    trigger = chanceOf(milestoneWeight) ? 'game_milestone' : 'game_drop';
    if (trigger === 'game_milestone') {
      every_points = cls === 'scarce' ? randInt(30, 60) : cls === 'medium' ? randInt(15, 30) : randInt(8, 15);
    } else {
      chance_pct = cls === 'scarce' ? randInt(1, 5) / 10 : cls === 'medium' ? randInt(5, 15) / 10 : randInt(10, 30) / 10;
    }
  } else {
    const every = clamp(Math.round((s.pointsPerPlay * s.playsPerDay) / neededPerDay) + randInt(-2, 2), 5, 100);
    const chance = clamp(Math.round(((100 * neededPerDay) / (s.playsPerDay * spawnsPerPlay(s))) * 10) / 10, 0.1, 5);
    // Achieved rates under the same model the forecast uses (daily cap 1).
    const rateOf = (r: number) => Math.min(r, s.activeUsersPerDay);
    const mRate = rateOf(s.playsPerDay * Math.min(s.pointsPerPlay / every, 1));
    const dRate = rateOf(s.playsPerDay * spawnsPerPlay(s) * (chance / 100));
    const err = (rate: number) => Math.max(rate, neededPerDay) / Math.min(rate, neededPerDay);
    const mFits = err(mRate) <= 3;
    const dFits = err(dRate) <= 3;
    trigger = mFits && dFits ? (chanceOf(milestoneWeight) ? 'game_milestone' : 'game_drop')
      : mFits ? 'game_milestone'
      : dFits ? 'game_drop'
      : err(mRate) <= err(dRate) ? 'game_milestone' : 'game_drop';
    if (trigger === 'game_milestone') every_points = every; else chance_pct = chance;
  }

  // Requirements, scaled by scarcity.
  const kid_approved = cls === 'scarce' ? true : chanceOf(cls === 'medium' ? 0.67 : 0.4);
  const min_kp: number | '' =
    cls === 'scarce' ? (chanceOf(0.75) ? pick([100, 150, 200, 300] as const) : '')
    : cls === 'medium' ? (chanceOf(0.4) ? pick([50, 100, 150] as const) : '')
    : chanceOf(0.15) ? pick([50, 100] as const) : '';
  const max_wins_per_day = cls === 'mass' && trigger === 'game_drop' && chanceOf(0.2) ? 2 : 1;
  const per_user_limit = clamp(cls === 'mass' && chanceOf(0.25) ? 2 : 1, 1, Math.max(1, o.quota_amount));
  const expiry_days =
    cls === 'scarce' ? pick([7, 10, 14] as const)
    : cls === 'medium' ? pick([14, 21, 30] as const)
    : pick([30, 45] as const);

  // A code fulfillment without uploaded codes cannot publish — fall back to pickup.
  const fulfillment: Fulfillment = o.fulfillment === 'code' && o.codes_count > 0 ? 'code' : 'pickup';

  return { trigger, every_points, chance_pct, fulfillment, per_user_limit, expiry_days, kid_approved, min_kp, max_wins_per_day };
}
