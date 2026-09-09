import { addressLines, type Order } from './order';

/**
 * Two emails. HTML with a plain-text twin, so they read in anything.
 *
 * The design is the site's: black, one column, Ferryman where it can be had
 * (Adobe Fonts do not embed in email, so the stack falls to a system sans),
 * the mark from public/icon-192.png, a hairline, the print itself. No
 * buttons, no columns, no marketing. Same voice as the site: sentence case,
 * the facts, and a way to reply.
 */
const FROM  = 'Dylan DiBona <orders@send.dylandibona.com>';
const REPLY = 'dylan@dylandibona.com';
const site  = () => (import.meta.env.SITE_URL ?? 'https://dylandibona.com').replace(/\/$/, '');

async function send(to: string, subject: string, text: string, html: string) {
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, reply_to: REPLY, subject, text, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const frameText = (o: Order) => o.framed ? `Framed in ${o.frameLabel.toLowerCase()}` : 'Unframed, ships rolled in a tube';

/** The shell every email shares. Inline styles only; email clients strip the rest. */
function shell(body: string, preheader = '') {
  const s = site();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#000;color:#F2F0EC;font-family:ferryman,'Helvetica Neue',Helvetica,Arial,sans-serif;font-weight:300;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000"><tr><td align="center" style="padding:44px 20px 56px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
  <tr><td style="padding:0 0 30px">
    <a href="${s}" style="text-decoration:none"><img src="${s}/icon-192.png" width="36" height="36" alt="DD" style="display:block;border:0;border-radius:2px"></a>
  </td></tr>
  ${body}
  <tr><td style="padding:34px 0 0;border-top:1px solid rgba(242,240,236,.16)">
    <p style="margin:0;font-size:12px;line-height:1.9;color:rgba(242,240,236,.45)">
      Dylan James DiBona · New Orleans and Nice<br>
      <a href="${s}" style="color:rgba(242,240,236,.6);text-decoration:none">dylandibona.com</a> &nbsp;·&nbsp;
      <a href="mailto:${REPLY}" style="color:rgba(242,240,236,.6);text-decoration:none">${REPLY}</a>
    </p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

const p = (t: string, extra = '') =>
  `<p style="margin:0 0 1.1em;font-size:16px;line-height:1.6;color:rgba(242,240,236,.86);${extra}">${t}</p>`;
const label = (t: string) =>
  `<p style="margin:0 0 .5em;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(242,240,236,.42)">${esc(t)}</p>`;
const lines = (arr: string[]) =>
  `<p style="margin:0 0 1.6em;font-size:15px;line-height:1.7;color:rgba(242,240,236,.86)">${arr.map(esc).join('<br>')}</p>`;

/** The print: title, place, spec, price, and a picture of it. */
function printBlock(o: Order) {
  const s = site();
  const img = `${s}/prints/${o.slug}.jpg`;   // served from public/prints, see below
  return `
  <tr><td style="padding:0 0 26px">
    <a href="${s}/prints/${o.slug}" style="text-decoration:none">
      <img src="${img}" alt="${esc(o.title)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;background:#111">
    </a>
  </td></tr>
  <tr><td style="padding:0 0 22px">
    <p style="margin:0 0 .25em;font-size:22px;line-height:1.2;color:#F2F0EC">${esc(o.title)}</p>
    ${o.where ? `<p style="margin:0 0 1em;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(242,240,236,.5)">${esc(o.where)}</p>` : ''}
    <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(242,240,236,.86)">
      ${esc(o.sizeCm)} cm &nbsp;·&nbsp; ${esc(o.sizeIn)} in<br>${esc(frameText(o))}<br>${esc(o.amountText)}
    </p>
  </td></tr>`;
}

/* ─── To the buyer ────────────────────────────────────────────────────────── */
export async function sendReceipt(o: Order) {
  if (!o.email) return;
  const first = (o.name || '').trim().split(/\s+/)[0];
  const hello = first ? `${first}, thank you.` : 'Thank you.';
  const text =
`${hello}

${o.title}${o.where ? ', ' + o.where : ''}
${o.sizeCm} cm · ${o.sizeIn} in
${frameText(o)}
${o.amountText}

Shipping to
${addressLines(o).join('\n')}

Each print is made when it is ordered, by hand in London on Hahnemühle Photo Rag. Allow up to 10 days depending on your address. You'll get a note when it ships.

Your order: ${o.receiptUrl}

If anything about this is wrong, or you just want to say hello, reply to this email. It comes to me.

Dylan`;
  const html = shell(`
  <tr><td style="padding:0 0 22px">
    <p style="margin:0;font-size:26px;line-height:1.25;color:#F2F0EC">${esc(hello)}</p>
  </td></tr>
  ${printBlock(o)}
  <tr><td>${label('Shipping to')}${lines(addressLines(o))}</td></tr>
  <tr><td>
    ${p('Each print is made when it is ordered, by hand in London on Hahnemühle Photo Rag. Allow up to 10 days depending on your address. You\u2019ll get a note when it ships.')}
    ${p(`Your order is at <a href="${o.receiptUrl}" style="color:#F2F0EC;text-decoration:underline;text-decoration-color:rgba(242,240,236,.35)">dylandibona.com/orders/${esc(o.ref)}</a>.`)}
    ${p('If anything about this is wrong, or you just want to say hello, reply to this email. It comes to me.')}
    ${p('Dylan', 'margin-top:1.6em;color:rgba(242,240,236,.6)')}
  </td></tr>`, `${o.title}, ${o.sizeIn} in, ${frameText(o).toLowerCase()}. Up to 10 days.`);
  await send(o.email, `Your print: ${o.title}`, text, html);
}

/* ─── To Dylan ────────────────────────────────────────────────────────────── */
export async function sendNewOrder(o: Order, note = '') {
  const to = import.meta.env.ORDER_NOTIFY_EMAIL;
  if (!to) throw new Error('ORDER_NOTIFY_EMAIL is not set');
  const stripeUrl = `https://dashboard.stripe.com/payments/${o.paymentIntentId ?? ''}`;
  const ch = 'https://sell.creativehub.io';
  const text =
`Order ${o.ref}${note ? `\n${note}` : ''}

${o.title}${o.where ? ', ' + o.where : ''}
${o.sizeCm} cm · ${o.sizeIn} in
${frameText(o)}
${o.amountText}

Ship to
${addressLines(o).join('\n')}
${o.phone ? o.phone + '\n' : ''}${o.email}

Newsletter: ${o.optIn ? 'opted in' : 'opted out'}

Place it: ${ch}
Stripe: ${stripeUrl}
Receipt: ${o.receiptUrl}`;
  const html = shell(`
  <tr><td style="padding:0 0 22px">
    ${label('New order')}
    <p style="margin:0;font-size:26px;line-height:1.25;color:#F2F0EC">${esc(o.ref)}</p>
    ${note ? p(esc(note), 'margin-top:.6em;color:#E9B44C') : ''}
  </td></tr>
  ${printBlock(o)}
  <tr><td>${label('Ship to')}${lines([...addressLines(o), o.phone, o.email].filter(Boolean))}</td></tr>
  <tr><td>${label('Newsletter')}${lines([o.optIn ? 'Opted in' : 'Opted out'])}</td></tr>
  <tr><td>${label('Do')}
    <p style="margin:0 0 1.6em;font-size:15px;line-height:1.9">
      <a href="${ch}" style="color:#F2F0EC;text-decoration:underline;text-decoration-color:rgba(242,240,236,.35)">Place it on creativehub</a><br>
      <a href="${stripeUrl}" style="color:rgba(242,240,236,.7);text-decoration:none">Payment in Stripe</a><br>
      <a href="${o.receiptUrl}" style="color:rgba(242,240,236,.7);text-decoration:none">Receipt page</a>
    </p>
  </td></tr>`, `${o.title}, ${o.sizeCode}, ${frameText(o).toLowerCase()}, ${o.amountText}, to ${o.address.city}.`);
  await send(to, `Order ${o.ref}: ${o.title}, ${o.sizeCode}${o.framed ? ' framed ' + o.frameLabel.toLowerCase() : ' unframed'}`, text, html);
}
