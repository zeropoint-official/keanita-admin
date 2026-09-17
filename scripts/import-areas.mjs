// Imports the legacy `areas` lookup (Cyprus districts/areas) into Supabase `areas`.
// Idempotent via old_import_id. Usage: node --env-file=.env.local scripts/import-areas.mjs "../Database (1).sql"
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const DUMP = process.argv[2] ?? '../Database (1).sql';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const sql = readFileSync(DUMP, 'utf8');
const start = sql.indexOf('INSERT INTO `areas`');
if (start < 0) throw new Error('areas INSERT not found');
const end = sql.indexOf(';\n', start);
const body = sql.slice(sql.indexOf('VALUES', start) + 6, end);

const rows = [];
const re = /\((\d+),\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)',\s*(NULL|\d+)\)/g;
let m;
while ((m = re.exec(body))) {
  const un = (s) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  rows.push({ old_import_id: +m[1], area_gr: un(m[2]), area_en: un(m[3]), district_gr: un(m[4]), district_en: un(m[5]) });
}
console.log(`parsed ${rows.length} areas`);
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await sb.from('areas').upsert(rows.slice(i, i + 500), { onConflict: 'old_import_id' });
  if (error) throw new Error(error.message);
}
console.log('done');
