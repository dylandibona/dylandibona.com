export const prerender = false;

import type { APIRoute } from 'astro';
import { stripe, siteUrl } from '../../../lib/stripe';
import { orderFromSession } from '../../../lib/order';
import { fulfil } from '../../../lib/fulfil';
import { sendReceipt } from '../../../lib/email';
import { subscribe } from '../../../lib/subscribe';

/**
 * checkout.session.completed → fulfil, receipt, subscribe.
 *
 * Stripe retries on anything but a 2xx, and can deliver twice. The guard is
 * fulfilled_at in the PaymentIntent's metadata: set once, checked first, so
 * a retry never places or emails a second time.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.STRIPE_WEBHOOK_SECRET;
  const sig = request.headers.get('stripe-signature') ?? '';
  const raw = await request.text();               // raw body, or the signature will not verify

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (e: any) {
    return new Response(`Bad signature: ${e.message}`, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') return new Response('ignored', { status: 200 });

  const S = stripe();
  const session = await S.checkout.sessions.retrieve((event.data.object as any).id, {
    expand: ['payment_intent'],
  });
  if (session.payment_status !== 'paid') return new Response('unpaid', { status: 200 });

  const pi = session.payment_intent as any;
  if (pi?.metadata?.fulfilled_at) return new Response('already', { status: 200 });

  const order = orderFromSession(session, siteUrl());
  const result = await fulfil(order);

  // Only stamp when the order actually reached Dylan; otherwise let Stripe retry.
  if (!result.ok) return new Response('fulfil failed', { status: 500 });

  if (pi?.id) {
    await S.paymentIntents.update(pi.id, {
      metadata: { ...pi.metadata, fulfilled_at: new Date().toISOString(), fulfilled_via: result.via },
    }).catch((e) => console.warn('stamp', e?.message));
  }

  await sendReceipt(order).catch((e) => console.warn('receipt', e?.message));
  if (order.optIn) await subscribe(order.email, { source: 'print', slug: order.slug });

  return new Response('ok', { status: 200 });
};
