// Cyprus Post address lookup — type a 4-digit postcode, get the district,
// community and the streets in it, so parents pick their address instead of
// typing it wrong.
//
// This is a PROXY on purpose: the Cyprus Post bearer token must never ship
// inside the mobile app, where anyone can pull it out of the bundle. Set it
// once with:
//   supabase secrets set CYPRUS_POST_TOKEN='<token>'
//
// Call:  POST /postcode-lookup  { "postal_code": "3116" }
// Reply: { postal_code, district, community, streets: [{ id, name, limits }] }
//
// Note the upstream host: cypruspost.post 301-redirects to www.cypruspost.post
// and the redirect drops the Authorization header on some clients, so always
// call the www host directly.

const UPSTREAM = 'https://www.cypruspost.post/api/postal-codes/addresses';
const TOKEN = Deno.env.get('CYPRUS_POST_TOKEN') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
  });

interface UpstreamItem { uuid?: number; name?: string; street_limits?: string | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!TOKEN) return json({ error: 'lookup not configured' }, 503);

  let postalCode = '';
  try {
    postalCode = String(((await req.json()) ?? {}).postal_code ?? '').trim();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }
  // Cyprus postcodes are exactly 4 digits; reject anything else before we
  // spend an upstream call on it.
  if (!/^\d{4}$/.test(postalCode)) return json({ error: 'invalid postal code' }, 400);

  try {
    const url = `${UPSTREAM}?postal_code=${postalCode}&lng=&page_token=`;
    const res = await fetch(url, {
      headers: { Authorization: TOKEN, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`cyprus post HTTP ${res.status} for ${postalCode}`);
      return json({ error: 'lookup unavailable' }, 502);
    }

    const body = await res.json();
    if (body?.status_code !== 200) {
      // Unknown postcode is a normal outcome, not an error.
      return json({ postal_code: postalCode, district: null, community: null, streets: [] });
    }

    const d = body.data ?? {};
    const items: UpstreamItem[] = d.addresses?.items ?? [];
    return json({
      postal_code: postalCode,
      district: d.district?.name ?? null,
      community: d.community?.name ?? null,
      streets: items
        .filter((s) => s?.name)
        .map((s) => ({ id: s.uuid ?? null, name: s.name!, limits: s.street_limits ?? null })),
    });
  } catch (e) {
    console.error('cyprus post lookup failed', e);
    return json({ error: 'lookup unavailable' }, 502);
  }
});
