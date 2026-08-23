// Seeds the database from the RN app's mock data via supabase-js (service role).
// Idempotent: skips tables that already have rows. Run: node --env-file=.env.local scripts/seed.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MOCK = resolve(import.meta.dirname, '../../nextjs-sample/data/mock');
function load(file, exportName) {
  let src = readFileSync(resolve(MOCK, file), 'utf8')
    .replace(/^import[^\n]*\n/gm, '')
    .replace(/export (interface|type) [\s\S]*?\n}\n/g, '')
    .replace(/export type [^\n]*\n/g, '')
    .replace(/require\(([^)]*)\)/g, (_, p) => p)
    .replace(/: ImageSourcePropType/g, '')
    .replace(/(: )?(Record<[^=]*>|[A-Za-z]+\[\])( =)/g, '$3')
    .replace(/export const/g, 'const');
  return new Function(src + `\n;return ${exportName};`)();
}
const img = (bucket, p) => `${bucket}/${p.split('/').pop()}`;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function seed(table, rows, opts = {}) {
  const { count } = await sb.from(table).select('*', { count: 'exact', head: true });
  if (count > 0 && !opts.upsert) return console.log(`${table}: ${count} rows exist, skipped`);
  const { error } = opts.upsert ? await sb.from(table).upsert(rows, { onConflict: opts.upsert }) : await sb.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: ${rows.length} rows`);
}

const products = load('products.ts', 'products');
const characters = load('characters.ts', 'characters');
const events = load('events.ts', 'events');
const gifts = load('gifts.ts', 'gifts');
const sliders = load('home-sliders.ts', 'homeSliders');
const { storeCategories, partnerStores } = load('kids-club.ts', '{storeCategories, partnerStores}');
const { onlinePuzzles, downloadActivities } = load('activities.ts', '{onlinePuzzles, downloadActivities}');
const termsGroups = load('../terms.ts', 'termsGroups');

await seed('store_categories', Object.entries(storeCategories).map(([id, name]) => ({ id: +id, name, old_import_id: +id })), { upsert: 'id' });

{
  const { count } = await sb.from('stores').select('*', { count: 'exact', head: true });
  if (count > 0) console.log(`stores: ${count} rows exist, skipped`);
  else {
    for (const s of partnerStores) {
      const { data, error } = await sb.from('stores').insert({ name: s.name, category_id: s.categoryId, phone: s.phone, website: s.website, description: s.description, logo_url: s.logo ? `stores/store-${s.id}.jpg` : null, old_import_id: s.id }).select('id').single();
      if (error) throw new Error(error.message);
      await sb.from('store_discounts').insert(s.discounts.map((d) => ({ store_id: data.id, value: d.value, description: d.description })));
    }
    console.log(`stores: ${partnerStores.length} rows (+discounts)`);
  }
}

await seed('products', products.map((p, i) => ({ name: p.name, category: p.category, tagline: p.tagline, description: p.description, image_url: img('products', p.image), accent_color: p.accentColor, bg_color: p.bgColor, serving_size: p.servingSize, highlights: p.highlights, ingredients: p.ingredients, nutrition: p.nutrition, sort_order: i, old_import_id: p.id })));
await seed('characters', characters.map((c, i) => ({ id: c.id, slug: c.slug, name: c.name, tagline: c.tagline, description: c.description, best_friend: c.bestFriend, power: c.power ?? null, favorite_juice: c.favoriteJuice, image_url: img('characters', c.image), accent_color: c.accentColor, bg_color: c.bgColor, sort_order: i })), { upsert: 'slug' });
await seed('events', events.map((e, i) => ({ type: e.type, title: e.title, description: e.description, date: e.date, time_label: e.time, location: e.location, image_url: img('events', e.image), accent_color: e.accentColor, bg_color: e.bgColor, status: 'published', sort_order: i, old_import_id: e.id })));
await seed('home_sliders', sliders.map((s, i) => ({ title: s.title, subtitle: s.subtitle, image_url: img('sliders', s.image), accent_color: s.accentColor, bg_color: s.bgColor, sort_order: i })));
await seed('activities', [
  ...onlinePuzzles.map((a, i) => ({ kind: 'puzzle', title: a.title, category: 'Χρωμοσελίδες', image_url: img('activities', a.image), file_url: a.pdfUrl, sort_order: i, old_import_id: a.id })),
  ...downloadActivities.map((a, i) => ({ kind: 'download', title: a.title, category: a.category, image_url: img('activities', a.image), file_url: a.pdfUrl, sort_order: i, old_import_id: a.id })),
]);
await seed('gifts', gifts.map((g, i) => ({ name: g.name, description: g.description, cost: g.cost, category: g.category, emoji: g.emoji, color: g.color, bg_color: g.bg, stock: g.inStock ? null : 0, requires_approval: g.requiresApproval, sort_order: i })));

await seed('reward_rules', [
  { key: 'daily_login', label: 'Ημερήσια σύνδεση', points: 5, config: {} },
  { key: 'streak_bonus', label: 'Μπόνους σερί', points: 10, config: { tiers: { 3: 10, 7: 30, 30: 100 } } },
  { key: 'game', label: 'Φρουτοτρέλα (ανά φρούτο)', points: 1, daily_cap: 150, config: { completion_bonus: 5 } },
  { key: 'event_rsvp', label: 'Δήλωση συμμετοχής σε εκδήλωση', points: 10, config: {} },
  { key: 'profile_complete', label: 'Συμπλήρωση προφίλ', points: 50, config: {} },
  { key: 'qr_scan', label: 'Σκανάρισμα QR προϊόντος', points: 20, config: {} },
  { key: 'birthday', label: 'Δώρο γενεθλίων', points: 50, config: {} },
  { key: 'gift_redeem', label: 'Εξαργύρωση δώρου', points: 0, config: {} },
  { key: 'refund', label: 'Επιστροφή πόντων', points: 0, config: {} },
  { key: 'manual', label: 'Χειροκίνητη προσαρμογή', points: 0, config: {} },
  { key: 'expiry', label: 'Λήξη πόντων', points: 0, config: {} },
], { upsert: 'key' });

const settings = {
  contact_email: ['keanita@keanltd.com.cy', 'Email επικοινωνίας'],
  contact_phone: ['80007090', 'Τηλέφωνο επικοινωνίας'],
  contact_address: ['Τ.Θ. 50300, 3603, Λεμεσός', 'Διεύθυνση'],
  contact_hours: ['Δευ–Πέμ 10:00–13:00 & 14:00–16:00, Παρ 10:00–13:30', 'Ώρες λειτουργίας'],
  emergency_phone: ['80007090', 'Αριθμός κουμπιού έκτακτης ανάγκης (αρχική οθόνη)'],
  social_facebook: ['https://www.facebook.com/keanita', 'Facebook'],
  social_instagram: ['https://www.instagram.com/keanitaofficial/', 'Instagram'],
  social_youtube: ['https://www.youtube.com/user/keansoftdrinks', 'YouTube'],
  kid_max_age: [11, 'Ηλικία λήξης μέλους Kids Club'],
  kid_auto_approve: [false, 'Αυτόματη έγκριση παιδιών'],
  points_expiry_months: [12, 'Μήνες μέχρι τη λήξη πόντων'],
  birthday_push_enabled: [true, 'Αποστολή ευχών γενεθλίων'],
  birthday_message: ['Χρόνια πολλά {name}! 🎂 Η Keanita σου εύχεται μια υπέροχη μέρα γεμάτη χυμό και χαμόγελα!', 'Μήνυμα γενεθλίων ({name} = όνομα παιδιού)'],
  birthday_points: [50, 'KP δώρο γενεθλίων'],
  birthday_video_url: ['', 'Βίντεο γενεθλίων'],
  intro_video_url: ['', 'Εισαγωγικό βίντεο'],
  event_reminder_days: [2, 'Ημέρες πριν την εκδήλωση για υπενθύμιση'],
  membership_tier_label: ['Χρυσό μέλος', 'Ετικέτα επιπέδου μέλους (προφίλ)'],
  home_product_chips: [[{ emoji: '🍊', label: '20% φυσικός χυμός' }, { emoji: '✨', label: 'Έξτρα βιταμίνη C' }, { emoji: '🌿', label: 'Χωρίς πρόσθετα' }], 'Chips προϊόντων στην αρχική'],
  home_quick_actions: [['rewards', 'gifts', 'discounts', 'products', 'activities', 'about'], 'Ενεργά κουμπιά γρήγορης πρόσβασης'],
  min_app_version: ['1.0.0', 'Ελάχιστη έκδοση εφαρμογής (force update)'],
  maintenance_mode: [false, 'Λειτουργία συντήρησης'],
};
await seed('app_settings', Object.entries(settings).map(([key, [value, description]]) => ({ key, value, description })), { upsert: 'key' });

const terms = termsGroups.map((g) => `# ${g.heading}\n\n` + g.sections.map((s) => (s.title ? `## ${s.title}\n\n` : '') + (s.paragraphs ?? []).join('\n\n') + (s.bullets?.length ? '\n\n' + s.bullets.map((b) => `- ${b}`).join('\n') : '')).join('\n\n')).join('\n\n');
await seed('pages', [
  { slug: 'terms', title: 'Όροι & Κανονισμοί', body_md: terms },
  { slug: 'about', title: 'Η ιστορία μας', body_md: '' },
  { slug: 'privacy', title: 'Πολιτική Απορρήτου', body_md: '' },
], { upsert: 'slug' });
console.log('✔ seed complete');
