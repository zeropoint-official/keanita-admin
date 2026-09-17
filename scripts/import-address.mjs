// Backfills parent addresses (zipcode, city, area, street_address, building_name, household_number)
// from the legacy MySQL dump into profiles, matched by legacy_id. Only fills columns that are still NULL.
// Usage: node --env-file=.env.local scripts/import-address.mjs "../Database (1).sql"
import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const DUMP = process.argv[2] ?? '../Database (1).sql';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function* parseTuples(stmt) {
  let i = 0; const n = stmt.length;
  while (i < n) {
    while (i < n && stmt[i] !== '(') i++;
    if (i >= n) return;
    i++;
    const vals = []; let cur = ''; let inStr = false;
    while (i < n) {
      const ch = stmt[i];
      if (inStr) {
        if (ch === '\\') { cur += stmt[i + 1] === 'n' ? '\n' : stmt[i + 1] === 'r' ? '\r' : stmt[i + 1]; i += 2; continue; }
        if (ch === "'") { if (stmt[i + 1] === "'") { cur += "'"; i += 2; continue; } inStr = false; i++; continue; }
        cur += ch; i++; continue;
      }
      if (ch === "'") { inStr = true; i++; continue; }
      if (ch === ',') { vals.push(cur.trim()); cur = ''; i++; continue; }
      if (ch === ')') { vals.push(cur.trim()); i++; break; }
      cur += ch; i++;
    }
    yield vals;
  }
}
async function loadTable(table) {
  const rows = []; let cols = null;
  const rl = createInterface({ input: createReadStream(DUMP), crlfDelay: Infinity });
  let buffer = null;
  const flush = (stmt) => {
    if (!cols) cols = [...stmt.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).slice(1);
    for (const t of parseTuples(stmt.slice(stmt.indexOf('VALUES') + 6))) {
      if (t.length !== cols.length) continue;
      const o = {}; cols.forEach((c, i) => { o[c] = t[i] === 'NULL' ? null : t[i]; }); rows.push(o);
    }
  };
  for await (const line of rl) {
    if (buffer !== null) { buffer += '\n' + line; if (line.trimEnd().endsWith(';')) { flush(buffer); buffer = null; } continue; }
    if (line.startsWith(`INSERT INTO \`${table}\``)) { if (line.trimEnd().endsWith(';')) flush(line); else buffer = line; }
  }
  return rows;
}

const clean = (v) => { const s = (v ?? '').trim(); return s && s !== '0' ? s : null; };

const users = await loadTable('users');
const parents = new Map(users.filter((u) => u.user_type === '202').map((u) => [String(u.id), u]));
console.log(`dump parents: ${parents.size}`);

let scanned = 0, updated = 0;
const t0 = Date.now();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('profiles')
    .select('id, legacy_id, zipcode, city, area, street_address, building_name, household_number')
    .not('legacy_id', 'is', null).range(from, from + 999);
  if (error) throw error;
  const batch = [];
  for (const p of data) {
    scanned++;
    const u = parents.get(String(p.legacy_id));
    if (!u) continue;
    const row = {
      id: p.id,
      zipcode: p.zipcode ?? clean(u.zipcode),
      city: p.city ?? clean(u.city),
      area: p.area ?? clean(u.area),
      street_address: p.street_address ?? clean(u.street_address),
      building_name: p.building_name ?? clean(u.building_name),
      household_number: p.household_number ?? clean(u.household_number),
    };
    const changed = ['zipcode','city','area','street_address','building_name','household_number'].some((k) => row[k] !== (p[k] ?? null));
    if (changed) batch.push(row);
  }
  // bulk update via upsert on id (only the listed columns are touched)
  for (let i = 0; i < batch.length; i += 500) {
    const { error: e } = await sb.from('profiles').upsert(batch.slice(i, i + 500), { onConflict: 'id' });
    if (e) throw e;
    updated += Math.min(500, batch.length - i);
  }
  console.log(`…${scanned} scanned, ${updated} updated (${Math.round((Date.now() - t0) / 1000)}s)`);
  if (data.length < 1000) break;
}
console.log(`profiles scanned: ${scanned}, updated: ${updated}`);
