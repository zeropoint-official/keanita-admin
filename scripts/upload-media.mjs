// Uploads the RN app's bundled images into Supabase Storage so seeded image_url paths resolve.
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local. Run: node --env-file=.env.local scripts/upload-media.mjs
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const ASSETS = resolve(import.meta.dirname, '../../nextjs-sample/assets/images');
const MAP = { products: 'products', characters: 'characters', events: 'events', stores: 'stores',
              puzzles: 'activities', activities: 'activities', brand: 'sliders' };
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
let n = 0;
for (const [dir, bucket] of Object.entries(MAP)) {
  let files = [];
  try { files = readdirSync(resolve(ASSETS, dir)); } catch { continue; }
  for (const f of files) {
    const type = MIME[extname(f).toLowerCase()]; if (!type) continue;
    const { error } = await sb.storage.from(bucket).upload(f, readFileSync(resolve(ASSETS, dir, f)), { contentType: type, upsert: true });
    if (error) console.error(bucket, f, error.message); else n++;
  }
}
// events also used as slider images
for (const f of ['event-riverland.jpg', 'event-easter.jpg']) {
  await sb.storage.from('sliders').upload(f, readFileSync(resolve(ASSETS, 'events', f)), { contentType: 'image/jpeg', upsert: true });
}
console.log(`uploaded ${n} files`);
