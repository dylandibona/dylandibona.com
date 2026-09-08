import type Stripe from 'stripe';
import { findPrint } from './prints';
import { SIZES, FRAMES, money } from './pricing';

/** One order, normalised from a Checkout Session. Everything downstream reads this. */
export type Order = {
  sessionId: string;
  paymentIntentId: string | null;
  ref: string;                 // short, human: last 8 of the session id
  slug: string;
  title: string;
  where: string;
  sizeCode: string;
  sizeCm: string;
  sizeIn: string;
  frameCode: string;
  frameLabel: string;
  framed: boolean;
  amount: number;              // cents
  amountText: string;
  email: string;
  name: string;
  phone: string;
  address: { line1: string; line2: string; city: string; state: string; postal: string; country: string };
  optIn: boolean;              // newsletter consent from Checkout
  receiptUrl: string;
};

export function orderFromSession(s: Stripe.Checkout.Session, siteUrl: string): Order {
  const md = s.metadata ?? {};
  const print = findPrint(md.slug ?? '');
  const size = SIZES.find((x) => x.code === md.size);
  const frame = FRAMES.find((x) => x.code === md.frame);
  const ship: any = (s as any).shipping_details ?? (s as any).collected_information?.shipping_details ?? {};
  const a = ship.address ?? {};
  return {
    sessionId: s.id,
    paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null,
    ref: s.id.slice(-8).toUpperCase(),
    slug: md.slug ?? '',
    title: print?.title ?? md.slug ?? 'Print',
    where: print?.where ?? '',
    sizeCode: size?.code ?? md.size ?? '',
    sizeCm: size?.cm ?? '',
    sizeIn: size?.inches ?? '',
    frameCode: frame?.code ?? md.frame ?? '',
    frameLabel: frame?.label ?? '',
    framed: (frame?.code ?? 'none') !== 'none',
    amount: s.amount_total ?? 0,
    amountText: money(s.amount_total ?? 0),
    email: s.customer_details?.email ?? '',
    name: ship.name ?? s.customer_details?.name ?? '',
    phone: s.customer_details?.phone ?? '',
    address: {
      line1: a.line1 ?? '', line2: a.line2 ?? '', city: a.city ?? '',
      state: a.state ?? '', postal: a.postal_code ?? '', country: a.country ?? '',
    },
    optIn: s.consent?.promotions !== 'opt_out',
    receiptUrl: `${siteUrl}/orders/${s.id}`,
  };
}

export const addressLines = (o: Order) =>
  [o.name, o.address.line1, o.address.line2,
   [o.address.city, o.address.state].filter(Boolean).join(', ') + (o.address.postal ? ' ' + o.address.postal : ''),
   o.address.country].filter(Boolean);
