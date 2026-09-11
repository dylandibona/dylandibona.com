/**
 * Add a buyer to The Letter. Beehiiv, when it exists; until then this is a
 * no-op that logs. Never throws: a list failure must not touch an order.
 */
export async function subscribe(email: string, opts: { source: string; slug?: string }): Promise<boolean> {
  const key = import.meta.env.BEEHIIV_API_KEY, pub = import.meta.env.BEEHIIV_PUBLICATION_ID;
  if (!email) return false;
  if (!key || !pub) { console.log('subscribe (beehiiv not configured)', email, opts); return false; }
  try {
    const r = await fetch(`https://api.beehiiv.com/v2/publications/${pub}/subscriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: false,
        utm_source: opts.source,
        utm_medium: opts.slug ? 'buyer' : 'form',
        utm_campaign: opts.slug ?? 'letter',
      }),
    });
    if (!r.ok) { console.warn('subscribe', r.status, await r.text()); return false; }
    return true;
  } catch (e: any) { console.warn('subscribe', e?.message ?? e); return false; }
}
