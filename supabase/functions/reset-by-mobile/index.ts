// Forgot password — by MOBILE number (launch checklist A8).
//
// Migrated parents often don't know which email their account uses, only
// their mobile. This finds the account(s) for the number (server-side, via
// the service-role-only `emails_for_mobile` RPC, which also rate-limits to
// 3 requests / number / hour) and asks Supabase Auth to send the normal
// reset-password email to each. The reply only carries MASKED addresses
// ("a***s@gmail.com") so the parent knows which inbox to check.
//
// Call:  POST /reset-by-mobile  { "mobile": "99123456" }
// Reply: { sent: number, hints: string[] }     (sent = 0 → no account found)
//        { error: "too_many_attempts" } 429

import { createClient } from 'npm:@supabase/supabase-js@2.49.4';

const URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const REDIRECT = 'keanita://reset-password';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** "antreas@gmail.com" → "a*****s@gmail.com" */
function mask(email: string) {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  const shown = user.length <= 2 ? user[0] + '*' : user[0] + '*'.repeat(Math.min(user.length - 2, 6)) + user[user.length - 1];
  return `${shown}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let mobile = '';
  try {
    mobile = String((await req.json())?.mobile ?? '');
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const digits = mobile.replace(/\D/g, '').slice(-8);
  if (digits.length !== 8) return json({ error: 'invalid_mobile' }, 400);

  const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('emails_for_mobile', { p_mobile: digits });
  if (error) {
    if (error.message.includes('too_many_attempts')) return json({ error: 'too_many_attempts' }, 429);
    console.error('[reset-by-mobile] lookup', error);
    return json({ error: 'server_error' }, 500);
  }

  const emails = (data ?? []) as string[];
  const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const hints: string[] = [];
  for (const email of emails) {
    const { error: sendErr } = await anon.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT });
    if (sendErr) console.error('[reset-by-mobile] send', sendErr.message);
    else hints.push(mask(email));
  }
  // Account exists but no email could be sent (e.g. email rate limit / SMTP) —
  // say so, instead of "no account found".
  if (emails.length > 0 && hints.length === 0) return json({ error: 'send_failed' }, 502);
  return json({ sent: hints.length, hints });
});
