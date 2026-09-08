import Stripe from 'stripe';

// One client per process. Vercel functions are short-lived, so this is cheap.
let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = import.meta.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return (client ??= new Stripe(key));
}

// Where we ship. Shipping is in the price, so the list is the only gate.
export const SHIP_TO = ['US','CA','GB','FR','DE','NL','BE','ES','IT','CH','DK','SE','NO','IE'] as const;

export const siteUrl = () =>
  (import.meta.env.SITE_URL ?? 'https://dylandibona.com').replace(/\/$/, '');
