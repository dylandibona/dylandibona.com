import type { Order } from './order';
import { sendNewOrder } from './email';

/**
 * One call. Two implementations, eventually.
 *
 *   manual      emails Dylan the full order and he places it by hand.
 *   creativehub places the order over the API (not built: access pending).
 *
 * manual is the permanent fallback, not a stopgap: if creativehub ever
 * throws, the order still reaches Dylan. Nothing here may throw upward.
 */
export type FulfilResult = { via: 'manual' | 'creativehub'; ok: boolean; detail?: string };

export async function fulfil(order: Order): Promise<FulfilResult> {
  // When creativehub lands:
  //   if (import.meta.env.CREATIVEHUB_TOKEN) { try { return await viaCreativehub(order); } catch (e) { note = ... } }
  try {
    await sendNewOrder(order);
    return { via: 'manual', ok: true };
  } catch (e: any) {
    console.error('fulfil manual', e?.message ?? e);
    return { via: 'manual', ok: false, detail: e?.message };
  }
}
