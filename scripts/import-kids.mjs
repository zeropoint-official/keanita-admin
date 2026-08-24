// Imports kids (child sub-profiles), legacy events and event registrations from the old
// MySQL dump into Supabase. Idempotent via old_import_id.
// Usage: node --env-file=.env.local scripts/import-kids.mjs "../Database (1).sql"
import { createClient } from '@supabase/supabase-js';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const DUMP = process.argv[2] ?? '../Database (1).sql';
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ── tiny SQL tuple parser ──────────────────────────────────────────
function* parseTuples(stmt) {
  // stmt: everything after VALUES — sequence of (a,b,'c',...),(...)
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
      if (ch === "'") { inStr = true; cur = cur === 'NULLSTR' ? '' : cur; i++; continue; }
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
  for await (const line of rl) {
    if (buffer !== null) {
      buffer += '\n' + line;
      if (line.trimEnd().endsWith(';')) { flush(buffer); buffer = null; }
      continue;
    }
    if (line.startsWith(`INSERT INTO \`${table}\``)) {
      if (line.trimEnd().endsWith(';')) flush(line); else buffer = line;
    }
  }
  function flush(stmt) {
    if (!cols) cols = [...stmt.matchAll(/`([a-z_]+)`/g)].map((m) => m[1]).slice(1);
    const values = stmt.slice(stmt.indexOf('VALUES') + 6);
    for (const t of parseTuples(values)) {
      if (t.length !== cols.length) continue;
      const o = {};
      cols.forEach((c, i) => { o[c] = t[i] === 'NULL' ? null : t[i]; });
      rows.push(o);
    }
  }
  return rows;
}

const cleanDate = (d) => (!d || d.startsWith('0000') ? null : d.slice(0, 10));
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

// ── 1. parent legacy_id → uuid map ────────────────────────────────
const parentMap = new Map();
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('profiles').select('id, legacy_id').not('legacy_id', 'is', null).range(from, from + 999);
  if (error) throw error;
  data.forEach((p) => parentMap.set(String(p.legacy_id), p.id));
  if (data.length < 1000) break;
}
console.log(`parents with legacy_id: ${parentMap.size}`);

// ── 2. kids ────────────────────────────────────────────────────────
const users = await loadTable('users');
console.log(`dump users: ${users.length}`);
const kidsRaw = users.filter((u) => u.user_type === '201' && u.parent_id);
async function allRows(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
const existing = await allRows(sb.from('kids').select('old_import_id').not('old_import_id', 'is', null).order('old_import_id'));
const seen = new Set(existing.map((k) => k.old_import_id));
let skippedNoParent = 0, skippedNoDob = 0;
const kids = [];
for (const u of kidsRaw) {
  if (seen.has(Number(u.id))) continue;
  const parent = parentMap.get(u.parent_id);
  if (!parent) { skippedNoParent++; continue; }
  const dob = cleanDate(u.dob);
  if (!dob) { skippedNoDob++; continue; }
  const status = u.is_expired === '1' ? 'expired' : u.account_status === '402' ? 'approved' : u.account_status === '403' ? 'rejected' : 'pending';
  kids.push({
    parent_id: parent, first_name: u.firstname || '—', last_name: u.lastname || null, dob,
    gender: u.gender === '301' ? 'boy' : u.gender === '302' ? 'girl' : null,
    status, member_id: u.member_id || null, reject_reason: u.reject_info || null,
    approved_at: status === 'approved' ? (cleanDate(u.registered_at) ?? cleanDate(u.created_at)) : null,
    expired_at: status === 'expired' ? new Date().toISOString() : null,
    old_import_id: Number(u.id), created_at: cleanDate(u.created_at) ?? undefined,
  });
}
console.log(`kids to import: ${kids.length} (skipped: ${skippedNoParent} without parent, ${skippedNoDob} without dob, ${seen.size} already imported)`);
let imported = 0, dupMember = 0;
for (const batch of chunk(kids, 500)) {
  const { error } = await sb.from('kids').insert(batch);
  if (error) {
    // fall back row-by-row for constraint collisions (duplicate member_id)
    for (const k of batch) {
      const { error: e2 } = await sb.from('kids').insert(k);
      if (e2 && e2.message.includes('member_id')) { const { error: e3 } = await sb.from('kids').insert({ ...k, member_id: null }); if (e3) console.error('kid', k.old_import_id, e3.message); else { imported++; dupMember++; } }
      else if (e2) console.error('kid', k.old_import_id, e2.message);
      else imported++;
    }
  } else imported += batch.length;
  process.stdout.write(`\rimported ${imported}/${kids.length}`);
}
console.log(`\nkids imported: ${imported} (${dupMember} με διπλό member_id → κενό)`);

// ── 3. legacy events (archived) + registrations ───────────────────
const oldEvents = await loadTable('events');
const { data: exEv } = await sb.from('events').select('id, old_import_id').not('old_import_id', 'is', null);
const evMap = new Map((exEv ?? []).map((e) => [e.old_import_id, e.id]));
const newEvents = oldEvents.filter((e) => !evMap.has(Number(e.id)));
for (const e of newEvents) {
  const { data, error } = await sb.from('events').insert({
    type: e.event_type === '2' ? 'seminar' : 'event', title: e.event_title?.slice(0, 480) || 'Εκδήλωση',
    description: e.event_desc ?? '', date: cleanDate(e.event_date) ?? cleanDate(e.created_at) ?? '2022-01-01',
    location: e.event_location || null, status: 'archived', old_import_id: Number(e.id),
    show_on_home: false, allow_registration: false,
  }).select('id').single();
  if (error) { console.error('event', e.id, error.message); continue; }
  evMap.set(Number(e.id), data.id);
}
console.log(`legacy events: ${oldEvents.length} in dump, ${newEvents.length} newly imported (archived)`);

const regs = await loadTable('event_registrations');
const kidRows = await allRows(sb.from('kids').select('id, parent_id, old_import_id').not('old_import_id', 'is', null).order('old_import_id'));
const kidMap = new Map(kidRows.map((k) => [k.old_import_id, k]));
const exReg = await allRows(sb.from('event_registrations').select('event_id, kid_id').order('created_at'));
const regSeen = new Set(exReg.map((r) => `${r.event_id}:${r.kid_id}`));
const regRows = [];
for (const r of regs) {
  const ev = evMap.get(Number(r.event_id)); const kid = kidMap.get(Number(r.kid_id));
  if (!ev || !kid || regSeen.has(`${ev}:${kid.id}`)) continue;
  regSeen.add(`${ev}:${kid.id}`);
  regRows.push({ event_id: ev, kid_id: kid.id, parent_id: kid.parent_id, created_at: cleanDate(r.created_at) ?? undefined });
}
for (const batch of chunk(regRows, 500)) {
  const { error } = await sb.from('event_registrations').insert(batch);
  if (error) console.error('regs batch:', error.message);
}
console.log(`registrations: ${regs.length} in dump, ${regRows.length} imported`);
console.log('✔ import complete');
