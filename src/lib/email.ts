import { addressLines, type Order } from './order';

/**
 * Plain text. Sentence case. No marketing. Sent through Resend's REST API
 * directly so there is no SDK to keep current.
 */
const FROM = 'Dylan DiBona <orders@send.dylandibona.com>';
const REPLY = 'dylan@dylandibona.com';

async function send(to: string, subject: string, text: string) {
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY, subject, text }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

const spec = (o: Order) =>
  `${o.title}${o.where ? ', ' + o.where : ''}\n` +
  `${o.sizeCm} cm · ${o.sizeIn} in\n` +
  (o.framed ? `Framed in ${o.frameLabel.toLowerCase()}` : 'Unframed, ships rolled') + `\n` +
  `${o.amountText}`;

/** To the buyer. */
export async function sendReceipt(o: Order) {
  if (!o.email) return;
  const text =
`Thanks. Your print is on its way to being made.

${spec(o)}

Shipping to
${addressLines(o).join('\n')}

Every print is made to order and printed in London, so allow two to three weeks. I will send a note when it ships.

Your order: ${o.receiptUrl}

Anything at all, reply to this email.

Dylan`;
  await send(o.email, `Your print: ${o.title}`, text);
}

/** To Dylan. Everything needed to place the order by hand on creativehub. */
export async function sendNewOrder(o: Order, note = '') {
  const to = import.meta.env.ORDER_NOTIFY_EMAIL;
  if (!to) throw new Error('ORDER_NOTIFY_EMAIL is not set');
  const text =
`New print order ${o.ref}${note ? `\n${note}` : ''}

${spec(o)}

Ship to
${addressLines(o).join('\n')}
${o.phone ? o.phone + '\n' : ''}${o.email}

Newsletter: ${o.optIn ? 'opted in' : 'opted out'}

Stripe: https://dashboard.stripe.com/payments/${o.paymentIntentId ?? ''}
Receipt: ${o.receiptUrl}
Session: ${o.sessionId}`;
  await send(to, `Order ${o.ref}: ${o.title}, ${o.sizeCode}${o.framed ? ' framed ' + o.frameLabel.toLowerCase() : ' unframed'}`, text);
}
