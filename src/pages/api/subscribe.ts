export const prerender = false;

import type { APIRoute } from 'astro';
import { subscribe } from '../../lib/subscribe';

/** POST { email } from the form on /letter → { ok }. Tagged `letter` in Beehiiv. */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  const email = String(body?.email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false }, 400);
  const ok = await subscribe(email, { source: 'letter' });
  return json({ ok }, ok ? 200 : 502);
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
