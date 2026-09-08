export const prerender = false;

import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { findPrint } from '../../lib/prints';
import { SIZES, FRAMES, priceOf, type FrameCode } from '../../lib/pricing';
import { stripe, SHIP_TO, siteUrl } from '../../lib/stripe';

/**
 * POST { slug, size, frame } → { url }
 *
 * Creates a hosted Checkout Session. The price is recomputed here from
 * pricing.ts; nothing the browser sends is trusted beyond which print, which
 * size and which frame. Stripe collects card and shipping address on its own
 * page. slug/size/frame ride in metadata so the webhook can fulfil.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); } catch { return bad('Bad JSON'); }

  const print = findPrint(String(body?.slug ?? ''));
  const size  = SIZES.find((s) => s.code === body?.size);
  const frame = FRAMES.find((f) => f.code === body?.frame);
  if (!print || !size || !frame) return bad('Unknown print, size or frame');

  const amount = priceOf(size, frame.code as FrameCode);
  const framed = frame.code !== 'none';
  const desc = `${size.cm} cm · ${size.inches} in · ${framed ? `framed in ${frame.label.toLowerCase()}` : 'unframed, ships rolled'}`;

  // A 1200px JPEG for the line item. Stripe needs an absolute, public URL,
  // so there is no image in dev, and a failure here must never block a sale.
  let images: string[] = [];
  try {
    const img = await getImage({ src: print.image, width: 1200, format: 'jpeg', quality: 80 });
    const url = new URL(img.src, siteUrl()).href;
    if (!/localhost|127\.0\.0\.1/.test(url)) images = [url];
  } catch (e) { console.warn('checkout image', e); }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: print.title,
            description: desc,
            ...(images.length ? { images } : {}),
          },
        },
      }],
      metadata: { slug: print.slug, size: size.code, frame: frame.code },
      payment_intent_data: { metadata: { slug: print.slug, size: size.code, frame: frame.code } },
      shipping_address_collection: { allowed_countries: [...SHIP_TO] },
      phone_number_collection: { enabled: true },
      consent_collection: { promotions: 'auto' },
      success_url: `${siteUrl()}/orders/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/prints/${print.slug}`,
    });
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('checkout', err?.message ?? err);
    return bad(err?.message ?? 'Stripe error', 502);
  }
};

const bad = (msg: string, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
