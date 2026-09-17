/**
 * Rulebook tests — run with: npm run test:rules
 * (node --test with type stripping; no test framework needed)
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  committedTotal, expectedWinsPerDay, generateCampaign, periodCount, validateCampaign,
  type CampaignRuleInput, type ForecastStats, type GenerateOpts,
} from './campaign-rules.ts';

const base: CampaignRuleInput = {
  trigger: 'game_milestone', every_points: 10, chance_pct: '',
  fulfillment: 'pickup', quota_mode: 'total', quota_amount: 100, per_user_limit: 1,
  starts_at: null, ends_at: null, expiry_days: 30,
  min_age: '', max_age: '', min_kp: '', max_wins_per_day: '', codes_count: 0,
};

const stats: ForecastStats = { playsPerDay: 400, pointsPerPlay: 12, activeUsersPerDay: 150 };

test('valid baseline passes', () => {
  assert.deepEqual(validateCampaign(base).errors, []);
});

test('C1: per-user limit above quota blocks', () => {
  const r = validateCampaign({ ...base, per_user_limit: 200 });
  assert.equal(r.errors.length, 1);
});

test('C2: periodic quota requires a date window', () => {
  assert.ok(validateCampaign({ ...base, quota_mode: 'monthly' }).errors.length > 0);
  const ok = validateCampaign({ ...base, quota_mode: 'monthly', starts_at: '2026-10-01T00:00', ends_at: '2027-01-31T00:00' });
  assert.deepEqual(ok.errors, []);
});

test('C2: committed total = quota × periods (KFC: 50/μήνα × 4 μήνες = 200)', () => {
  const kfc = { ...base, quota_mode: 'monthly' as const, quota_amount: 50, starts_at: '2026-10-01T00:00', ends_at: '2027-01-31T00:00' };
  assert.equal(periodCount(kfc.quota_mode, kfc.starts_at, kfc.ends_at), 4);
  assert.equal(committedTotal(kfc), 200);
});

test('C3: code campaign with zero codes blocks; partial coverage warns', () => {
  assert.ok(validateCampaign({ ...base, fulfillment: 'code' }).errors.length > 0);
  const partial = validateCampaign({ ...base, fulfillment: 'code', codes_count: 40 });
  assert.deepEqual(partial.errors, []);
  assert.ok(partial.warnings.length > 0);
  const full = validateCampaign({ ...base, fulfillment: 'code', codes_count: 100 });
  assert.deepEqual(full.warnings, []);
});

test('C4: the win mechanic must be configured', () => {
  assert.ok(validateCampaign({ ...base, every_points: '' }).errors.length > 0);
  assert.ok(validateCampaign({ ...base, every_points: 4 }).errors.length > 0);
  assert.ok(validateCampaign({ ...base, trigger: 'game_drop', chance_pct: '' }).errors.length > 0);
  assert.ok(validateCampaign({ ...base, trigger: 'game_drop', chance_pct: 6 }).errors.length > 0);
  assert.deepEqual(validateCampaign({ ...base, trigger: 'game_drop', every_points: '', chance_pct: 3 }).errors, []);
});

test('C5: scarce pickup without expiry blocks; plentiful only warns', () => {
  assert.ok(validateCampaign({ ...base, quota_amount: 10, expiry_days: '' }).errors.length > 0);
  const plenty = validateCampaign({ ...base, quota_amount: 1000, expiry_days: '' });
  assert.deepEqual(plenty.errors, []);
  assert.ok(plenty.warnings.length > 0);
});

test('C6: window order + age sanity', () => {
  assert.ok(validateCampaign({ ...base, starts_at: '2026-10-05T00:00', ends_at: '2026-10-01T00:00' }).errors.length > 0);
  assert.ok(validateCampaign({ ...base, min_age: 8, max_age: 4 }).errors.length > 0);
  assert.ok(validateCampaign({ ...base, max_age: 14 }).errors.length > 0);
});

const genOpts = (over: Partial<GenerateOpts>): GenerateOpts => ({
  quota_amount: 100, quota_mode: 'total', starts_at: null, ends_at: null,
  fulfillment: 'pickup', codes_count: 0, stats, ...over,
});

test('Generate: 100 rolls per class, with and without stats, are all valid by construction', () => {
  for (const quota of [10, 150, 1000]) {
    for (const st of [stats, null]) {
      for (let i = 0; i < 100; i++) {
        const g = generateCampaign(genOpts({ quota_amount: quota, stats: st }));
        const r = validateCampaign({ ...base, ...g, quota_amount: quota });
        assert.deepEqual(r.errors, [], `quota=${quota} stats=${!!st} roll=${JSON.stringify(g)} → ${r.errors[0] ?? ''}`);
      }
    }
  }
});

test('Generate: forecast-aware — solved settings exhaust stock in a sane horizon', () => {
  // With real stats the roll should aim the stock at roughly its target window
  // (periodic: ~the period; totals: 14–60 days), never a same-day blowout.
  for (let i = 0; i < 200; i++) {
    const g = generateCampaign(genOpts({ quota_amount: 100 }));
    const wins = expectedWinsPerDay({ ...base, ...g, quota_amount: 100 }, stats);
    assert.ok(wins != null && wins > 0, `no rate for ${JSON.stringify(g)}`);
    const days = 100 / wins!;
    assert.ok(days >= 2, `stock gone in ${days.toFixed(1)} days: ${JSON.stringify(g)}`);
  }
});

test('Generate: monthly quota aims for ≈ one period', () => {
  for (let i = 0; i < 100; i++) {
    const g = generateCampaign(genOpts({
      quota_amount: 50, quota_mode: 'monthly', starts_at: '2026-10-01T00:00', ends_at: '2027-01-31T00:00',
    }));
    const wins = expectedWinsPerDay({ ...base, ...g, quota_amount: 50, quota_mode: 'monthly' }, stats);
    if (wins) {
      const days = 50 / wins;
      assert.ok(days >= 5, `monthly quota gone in ${days.toFixed(1)} days: ${JSON.stringify(g)}`);
    }
  }
});

test('Generate: scarce gifts are locked down — approved kid, fast expiry', () => {
  for (let i = 0; i < 100; i++) {
    const g = generateCampaign(genOpts({ quota_amount: 10 }));
    assert.equal(g.kid_approved, true);
    assert.ok(g.expiry_days <= 14);
    assert.equal(g.per_user_limit, 1);
    assert.equal(g.fulfillment, 'pickup');
  }
});

test('Generate: code fulfillment without codes falls back to pickup', () => {
  for (let i = 0; i < 50; i++) {
    assert.equal(generateCampaign(genOpts({ quota_amount: 1000, fulfillment: 'code' })).fulfillment, 'pickup');
    assert.equal(generateCampaign(genOpts({ quota_amount: 1000, fulfillment: 'code', codes_count: 500 })).fulfillment, 'code');
  }
});
