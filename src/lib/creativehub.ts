/**
 * creativehub (theprintspace) v1 API. Docs: https://sell.creativehub.io/api-docs
 * Bearer token from Settings → API access. Access is enabled per account.
 * No sandbox: every order here is real and bills the saved card.
 */
const BASE = 'https://escher-v2.creativehub.io/v1';

export type Quote = {
  currency: string; total_incl_vat: number; total_excl_vat: number; total_vat: number;
  production_cost: number; delivery_cost: number; addon_cost: number; ddp_total: number;
};
export type PlacedOrder = { order_id: string; order_number: string; currency: string; total_incl_vat: number; lines: any[] };

function token() {
  const t = import.meta.env.CREATIVEHUB_TOKEN ?? process.env.CREATIVEHUB_TOKEN;
  if (!t) throw new Error('CREATIVEHUB_TOKEN is not set');
  return t;
}

export async function ch<T = any>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
    ...(init.idempotencyKey ? { 'Idempotency-Key': init.idempotencyKey } : {}),
  };
  const r = await fetch(BASE + path, { ...init, headers });
  const text = await r.text();
  if (!r.ok) throw new Error(`creativehub ${init.method ?? 'GET'} ${path} → ${r.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : (null as T);
}

export const quote = (variant_id: string, country: string) =>
  ch<Quote>('/orders/quote', { method: 'POST', body: JSON.stringify({ items: [{ variant_id, quantity: 1 }], delivery_country_code: country }) });

export const placeOrder = (body: Record<string, unknown>, idempotencyKey: string) =>
  ch<PlacedOrder>('/orders', { method: 'POST', body: JSON.stringify(body), idempotencyKey });

export const getOrder = (id: string) => ch(`/orders/${id}`);
