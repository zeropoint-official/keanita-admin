// Sends queued push_campaigns via the Expo Push API and writes per-user inbox rows.
// Invoked by pg_cron every minute through invoke_send_push() (0030_push_dispatch_secret.sql),
// which sends the shared secret in the `x-dispatch-secret` header. Manual run:
//   curl -X POST https://<ref>.functions.supabase.co/send-push -H "Authorization: Bearer <secret API key>"
// Deployed with verify_jwt = false: the project uses the new (non-JWT) API keys, so the
// function does its own check below and rejects everything else with 403.
// Env (function secrets): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY are injected automatically;
// PUSH_DISPATCH_SECRET must equal the vault secret `push_dispatch_secret`.
// EXPO_ACCESS_TOKEN is optional (higher rate limits / security if push security is enabled on the Expo account).
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Audience = {
  all?: boolean; user_ids?: string[]; districts?: string[];
  kid_min_age?: number; kid_max_age?: number; kid_status?: string; kid_id?: string;
};

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// `.in('id', [...])` puts every id in the request URL (~37 chars each). 100 ids
// keeps the URL ~4 KB, well under the API gateway limit; 500 (~18 KB) could be
// rejected and silently drop recipients on large broadcasts.
const ID_CHUNK = 100;

async function resolveRecipients(a: Audience): Promise<string[]> {
  if (a.user_ids?.length) return a.user_ids;
  let ids: Set<string> | null = null;
  const intersect = (list: string[]) => { const s = new Set(list); ids = ids === null ? s : new Set([...ids].filter((x) => s.has(x))); };

  if (a.kid_min_age != null || a.kid_max_age != null || (a.kid_status && a.kid_status !== 'any')) {
    let q = sb.from('kids').select('parent_id, dob, status');
    if (a.kid_status && a.kid_status !== 'any') q = q.eq('status', a.kid_status);
    const today = new Date();
    if (a.kid_min_age != null) q = q.lte('dob', new Date(today.getFullYear() - a.kid_min_age, today.getMonth(), today.getDate()).toISOString().slice(0, 10));
    if (a.kid_max_age != null) q = q.gte('dob', new Date(today.getFullYear() - a.kid_max_age - 1, today.getMonth(), today.getDate() + 1).toISOString().slice(0, 10));
    const rows: { parent_id: string }[] = [];
    for (let from = 0; ; from += 1000) { const { data } = await q.range(from, from + 999); rows.push(...(data ?? [])); if (!data || data.length < 1000) break; }
    intersect(rows.map((r) => r.parent_id));
  }
  if (a.districts?.length) {
    const rows: { id: string }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('profiles').select('id').eq('is_active', true).in('district', a.districts).range(from, from + 999);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    intersect(rows.map((r) => r.id));
  }
  if (ids !== null) {
    // targeted audiences must still respect deactivated accounts
    const list = [...ids]; const active: string[] = [];
    for (let i = 0; i < list.length; i += ID_CHUNK) {
      const { data } = await sb.from('profiles').select('id').eq('is_active', true).in('id', list.slice(i, i + ID_CHUNK));
      active.push(...(data ?? []).map((r) => r.id));
    }
    return active;
  }
  // all users
  const out: string[] = [];
  for (let from = 0; ; from += 1000) { const { data } = await sb.from('profiles').select('id').eq('is_active', true).range(from, from + 999); out.push(...(data ?? []).map((r) => r.id)); if (!data || data.length < 1000) break; }
  return out;
}

/** Constant-time string comparison (empty never matches). */
function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Only the cron dispatcher (shared secret) or someone holding the secret API key may trigger sends. */
function authorized(req: Request) {
  const dispatch = req.headers.get('x-dispatch-secret') ?? '';
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  return safeEqual(dispatch, Deno.env.get('PUSH_DISPATCH_SECRET') ?? '') ||
    safeEqual(bearer, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
}

Deno.serve(async (req) => {
  if (!authorized(req)) {
    return new Response('forbidden', { status: 403 });
  }
  const { data: due } = await sb.from('push_campaigns').select('*').eq('status', 'scheduled').lte('scheduled_at', new Date().toISOString()).limit(5);
  const results = [];
  for (const c of due ?? []) {
    // claim
    const { data: claimed } = await sb.from('push_campaigns').update({ status: 'sending' }).eq('id', c.id).eq('status', 'scheduled').select('id');
    if (!claimed?.length) continue;
    try {
      const users = await resolveRecipients((c.audience ?? { all: true }) as Audience);
      // inbox rows
      const inbox = users.map((u) => ({ user_id: u, campaign_id: c.id, title: c.title, body: c.body, type: c.type, link_type: c.link_type, link_target: c.link_target, kid_id: (c.audience as Audience)?.kid_id ?? null }));
      for (let i = 0; i < inbox.length; i += 500) await sb.from('notifications').insert(inbox.slice(i, i + 500));
      // device tokens
      const tokens: string[] = [];
      for (let i = 0; i < users.length; i += ID_CHUNK) {
        const { data, error } = await sb.from('device_tokens').select('token').in('user_id', users.slice(i, i + ID_CHUNK));
        if (error) throw new Error(`device_tokens lookup: ${error.message}`);
        tokens.push(...(data ?? []).map((t) => t.token));
      }
      // expo push (chunks of 100)
      let sent = 0, failed = 0;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
      if (expoToken) headers.Authorization = `Bearer ${expoToken}`;
      for (let i = 0; i < tokens.length; i += 100) {
        const messages = tokens.slice(i, i + 100).map((to) => ({ to, title: c.title, body: c.body, sound: 'default', data: { link_type: c.link_type, link_target: c.link_target, campaign_id: c.id } }));
        const res = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers, body: JSON.stringify(messages) });
        if (res.ok) {
          const j = await res.json();
          for (const t of j.data ?? []) t.status === 'ok' ? sent++ : failed++;
        } else failed += messages.length;
      }
      await sb.from('push_campaigns').update({ status: 'sent', sent_at: new Date().toISOString(), stats: { targeted: users.length, tokens: tokens.length, sent, failed } }).eq('id', c.id);
      results.push({ id: c.id, targeted: users.length, sent, failed });
    } catch (e) {
      await sb.from('push_campaigns').update({ status: 'failed', stats: { error: String(e) } }).eq('id', c.id);
      results.push({ id: c.id, error: String(e) });
    }
  }
  return Response.json({ processed: results.length, results });
});
