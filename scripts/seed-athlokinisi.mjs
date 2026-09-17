/**
 * Seed the Αθλοκίνηση sponsor + basketball campaign (the first configured
 * campaign — closes the "basketball prize is never recorded" audit finding).
 * Idempotent: matches sponsor by name and campaign by title; re-running
 * updates nothing destructive and never duplicates.
 *
 * Usage: node --env-file=.env.local scripts/seed-athlokinisi.mjs
 */
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const LOGO_LOCAL = '../nextjs-sample/new-assets/athlokinish-logo.png';
const LOGO_PATH = 'sponsors/athlokinisi-logo.png';

// ── sponsor ──
let { data: sponsor } = await supabase.from('sponsors').select('id, logo_path').eq('name', 'Αθλοκίνηση').maybeSingle();
if (!sponsor) {
  const { data, error } = await supabase.from('sponsors')
    .insert({ name: 'Αθλοκίνηση', brand_color: '#1E63B5', status: 'active', logo_path: LOGO_PATH })
    .select('id, logo_path').single();
  if (error) throw error;
  sponsor = data;
  console.log('sponsor created:', sponsor.id);
} else {
  console.log('sponsor exists:', sponsor.id);
}

// ── logo upload (skip if already there) ──
const { data: existing } = await supabase.storage.from('sponsors').list('', { search: 'athlokinisi-logo.png' });
if (!existing?.length) {
  const file = await readFile(LOGO_LOCAL);
  const { error } = await supabase.storage.from('sponsors').upload('athlokinisi-logo.png', file, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  console.log('logo uploaded');
} else {
  console.log('logo already uploaded');
}
await supabase.from('sponsors').update({ logo_path: LOGO_PATH, status: 'active' }).eq('id', sponsor.id);

// ── campaign ──
const TITLE = 'Μπάλα μπάσκετ Αθλοκίνηση';
const { data: campaign } = await supabase.from('sponsor_campaigns').select('id, status').eq('sponsor_id', sponsor.id).eq('title', TITLE).maybeSingle();
if (!campaign) {
  const { data, error } = await supabase.from('sponsor_campaigns').insert({
    sponsor_id: sponsor.id,
    title: TITLE,
    profile_text: 'Κέρδισες μια μπάλα μπάσκετ από την Αθλοκίνηση! Πέρνα από το κατάστημα, δείξε τον αριθμό μέλους σου στο ταμείο και παράλαβέ την.',
    status: 'active',
    trigger: 'game_milestone',
    trigger_config: { every_points: 10 },
    fulfillment: 'pickup',
    quota_mode: 'total',
    quota_amount: 1000,
    per_user_limit: 1,
    requirements: {},
    expiry_days: 30,
  }).select('id').single();
  if (error) throw error;
  console.log('campaign created:', data.id);
} else {
  console.log('campaign exists:', campaign.id, '(status:', campaign.status + ')');
}
console.log('done — the basketball in Φρουτοτρέλα is now this campaign.');
