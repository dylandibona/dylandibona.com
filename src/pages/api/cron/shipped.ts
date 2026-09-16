export const prerender = false;

import type { APIRoute } from 'astro';
import { stripe, siteUrl } from '../../../lib/stripe';
import { orderFromSession } from '../../../lib/order';
import { getOrder } from '../../../lib/creativehub';
import { sendShipped } from '../../../lib/email';

/**
 * Daily, from vercel.json. The shipped email.
 *
 * creativehub has no webhooks yet and theprintspace support (16 Sep) said a daily
 * poll is the intended pattern. Stripe is the system of record, so the open
 * orders are PaymentIntents our checkout fulfilled over creativehub
 * (fulfilled_via = creativehub, creativehub_order_id set) with no shipped_at.
 * For each, GET /orders/{id}; when the order status is "dispatched", email the
 * buyer once and stamp shipped_at on the PaymentIntent so it never sends twice.
 *
 * Vercel sends Authorization: Bearer $CRON_SECRET. Without CRON_SECRET set
 * nothing runs. One log line per run.
 */
export const GET: APIRoute = async ({ request }) => {
  const secret = import.meta.env.CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    console.log('cron shipped: unauthorized', secret ? '' : '(CRON_SECRET is not set)');
    return new Response('unauthorized', { status: 401 });
  }

  const S = stripe();
  const tally = { open: 0, shipped: 0, waiting: 0, failed: 0 };
  const notes: string[] = [];

  // Search is eventually consistent by about a minute; a daily poll does not care.
  const found = S.paymentIntents.search({ query: `metadata['fulfilled_via']:'creativehub'`, limit: 100 });
  for await (const pi of found) {
    const md = pi.metadata ?? {};
    if (!md.creativehub_order_id || md.shipped_at) continue;
    tally.open++;
    try {
      const ch: any = await getOrder(md.creativehub_order_id);
      if (ch?.status !== 'dispatched') { tally.waiting++; continue; }

      const sessions = await S.checkout.sessions.list({ payment_intent: pi.id, limit: 1 });
      const session = sessions.data[0];
      if (!session) throw new Error('no checkout session');
      const order = orderFromSession(session, siteUrl());

      // Stamp first. A lost email is one Dylan can resend by hand; a missed
      // stamp would email the buyer again every morning.
      await S.paymentIntents.update(pi.id, { metadata: { ...md, shipped_at: new Date().toISOString() } });
      await sendShipped(order);
      tally.shipped++;
      notes.push(`${md.creativehub_order_number || md.creativehub_order_id} emailed`);
    } catch (e: any) {
      tally.failed++;
      notes.push(`${pi.id} ${String(e?.message ?? e).slice(0, 160)}`);
    }
  }

  const line = `cron shipped: ${tally.open} open, ${tally.shipped} emailed, ${tally.waiting} not yet dispatched, ${tally.failed} failed${notes.length ? ' | ' + notes.join('; ') : ''}`;
  console.log(line);
  return new Response(JSON.stringify({ ...tally, notes }), {
    status: tally.failed ? 500 : 200, headers: { 'Content-Type': 'application/json' },
  });
};
