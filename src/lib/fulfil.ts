import type { Order } from './order';
import { sendNewOrder } from './email';
import { findPrint } from './prints';
import { quote, placeOrder } from './creativehub';

/**
 * One call. Two paths.
 *
 *   creativehub  quote, then place the order over the API. The Stripe session id
 *                is the Idempotency-Key, so a webhook retry can never order twice.
 *   manual       email Dylan the full order and he places it by hand.
 *
 * creativehub runs when a token exists and the print has a variant id for this
 * size and frame. Anything else, and any failure at all, falls through to manual
 * with the reason on the email. manual is the permanent floor, not a stopgap.
 * Nothing here may throw upward.
 */
export type FulfilResult = {
  via: 'manual' | 'creativehub'; ok: boolean; detail?: string;
  chOrderId?: string; chOrderNumber?: string; chCost?: number; chCurrency?: string;
};

export async function fulfil(order: Order): Promise<FulfilResult> {
  let note = '';

  if (import.meta.env.CREATIVEHUB_TOKEN) {
    try {
      const r = await viaCreativehub(order);
      // Dylan still gets the email, now saying it is already placed.
      await sendNewOrder(order, `Placed on creativehub: order ${r.chOrderNumber} (cost ${r.chCurrency} ${r.chCost}).`).catch((e) => console.warn('notify', e?.message));
      return r;
    } catch (e: any) {
      note = `creativehub failed, place by hand: ${String(e?.message ?? e).slice(0, 300)}`;
      console.error('fulfil creativehub', note);
    }
  } else {
    note = 'creativehub not configured, place by hand.';
  }

  try {
    await sendNewOrder(order, note);
    return { via: 'manual', ok: true, detail: note };
  } catch (e: any) {
    console.error('fulfil manual', e?.message ?? e);
    return { via: 'manual', ok: false, detail: e?.message };
  }
}

async function viaCreativehub(o: Order): Promise<FulfilResult> {
  const print: any = findPrint(o.slug);
  const key = `${o.sizeCode}|${o.frameCode === 'none' ? 'none' : o.frameCode}`;
  const variantId: string | undefined = print?.creativehub?.variants?.[key];
  if (!variantId) throw new Error(`no creativehub variant for ${o.slug} ${key}`);
  if (!o.address.line1 || !o.address.city || !o.address.country) throw new Error('incomplete address');

  // Quote first so the cost is on record; a wild number stops the order.
  // o.amount is the session's amount_total, so a promo-code order is checked
  // against what was actually paid, not the list price. That is deliberate:
  // a discount that puts the order underwater should land on the manual email.
  // Quotes come back in the account currency (USD), not the delivery country's,
  // so this compares like with like for any destination.
  const q = await quote(variantId, o.address.country);
  if (q.total_incl_vat > o.amount / 100) {
    throw new Error(`quote ${q.currency} ${q.total_incl_vat} exceeds the ${o.amountText} the buyer paid`);
  }

  const placed = await placeOrder({
    items: [{ variant_id: variantId, quantity: 1 }],
    delivery_name: o.name || o.email,
    delivery_line1: o.address.line1,
    ...(o.address.line2 ? { delivery_line2: o.address.line2 } : {}),
    delivery_city: o.address.city,
    ...(o.address.postal ? { delivery_postcode: o.address.postal } : {}),
    ...(o.address.state ? { delivery_county: o.address.state } : {}),
    delivery_country_code: o.address.country,
    ...(o.email ? { delivery_email: o.email } : {}),
    ...(o.phone ? { delivery_phone: o.phone } : {}),
  }, o.sessionId);

  return {
    via: 'creativehub', ok: true,
    chOrderId: placed.order_id, chOrderNumber: placed.order_number,
    chCost: q.total_incl_vat, chCurrency: q.currency,
  };
}
