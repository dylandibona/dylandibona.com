# dylandibona.com: reference

Reference material moved out of `CLAUDE.md` on 2026-11-05, verbatim. Rules and architecture stay in `CLAUDE.md`. Current state and history live in `STATUS.md`.

---

## Environment variables

Stripe needs `STRIPE_SECRET_KEY`, `PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
`SITE_URL`. Email needs `RESEND_API_KEY` (sending from `orders@send.dylandibona.com`) and
`ORDER_NOTIFY_EMAIL`. The shipped cron needs `CRON_SECRET` (Vercel sends it as a Bearer token;
unset, the route answers 401 to everything). Newsletter needs `BEEHIIV_API_KEY`, `BEEHIIV_PUBLICATION_ID`; absent,
subscribe is a logged no-op. Local webhooks: `stripe listen --forward-to localhost:4321/api/stripe/webhook`.

Spotify needs `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
in Vercel. Locally it returns 500 without them; `/listening` degrades to a message
rather than an empty list.

---

## Analytics: the tracker path

The tracker does not load from `/_vercel/insights` on the live site. It loads from a
project-specific path, `/c0ba99a13bdc0070/script.js`, and page views POST to
`/c0ba99a13bdc0070/view`. The package takes that path from a variable Vercel sets during
its build (`PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG`) and only falls back to
`/_vercel/insights/script.js` without it, as in a local build. The old URL still answers
but the page never requests it. To check analytics is live, look for
`script[data-sdkn="@vercel/analytics/astro"]` in the page, not for `_vercel/insights`.

---

## Shipped email (built 16 Sep)

**Shipped email (built 16 Sep).** `src/pages/api/cron/shipped.ts`, daily at 15:00 UTC from
`vercel.json`. It searches PaymentIntents with `fulfilled_via = creativehub`, skips any without a
`creativehub_order_id` or with `shipped_at`, and calls `GET /v1/orders/{id}`. When the
order's top-level `status` is `"dispatched"` it stamps `shipped_at` on the PaymentIntent, then
sends `sendShipped` (subject "Your print is on its way"). Stamp before send, so it never sends
twice. Any failure in a run (an API error, or a stamped order whose email failed) sends one
alert to `ORDER_NOTIFY_EMAIL` listing what to do by hand. One log line per run
(`cron shipped: N open, N emailed, …`). Manual orders (placed by hand) are not polled.
Manual run: `curl -H "Authorization: Bearer $CRON_SECRET" https://dylandibona.com/api/cron/shipped`.

---

## What theprintspace support told us, 16 Sep

- Routing: US addresses print at their US studio and ship UPS; everything else prints in the UK.
  C-Type prints are the exception (UK only). Photo Rag is not C-Type, so US orders go US.
- The API returns no tracking number. The email offers it on reply instead.
- Webhooks are not delivered yet, even with `webhook_uri` set. The daily poll is the intended
  pattern. `/api/creativehub/webhook` stays as a logger in case they start.

---

## creativehub API (theprintspace)

Reference: https://sell.creativehub.io/api-docs. It is a React page; the spec is
inlined in the JS bundle, not fetchable as text. Support: support@theprintspace.co.uk.

**Everything older in these notes about `Authorization: ApiKey`, embryonic and
confirmed orders, PascalCase fields, or a sandbox at `api.sandbox.tps-test.io` is the
legacy API and is dead. Do not build against it.** Any doc that shows snake_case
`shipping_address` / `print_size: "A3"` / `paper_type` strings is invented. Ignore it.

- Base URL `https://escher-v2.creativehub.io/v1`.
- Auth `Authorization: Bearer <token>`. Tokens at sell.creativehub.io → Settings → API
  access. Shown once. API access is enabled per account by support (403 = not enabled).
  Account needs a saved card and a country of residence; API orders bill to the card on
  the merchant rollup.
- Rate limits 120 reads/min, 30 writes/min. Errors are `{"detail": "reason"}`.
- No sandbox. No webhooks yet (`webhook_uri` on a token is accepted, delivery "coming").
- Papers: `photo-rag` (Hahnemühle Photo Rag) is the default and the one we use.

### Catalogue model
upload → drop → product → variants. One-time sync script, not per order.

1. `POST /uploads/ref {url, image_type:"artwork", name}`. `url` must be a public https
   URL; it is fetched once. **Use the full-resolution master, not the 2500px web file**:
   the print file is composed from this upload at order time.
2. `POST /drops {title}`. One drop for the whole shop is fine.
3. `POST /drops/{drop_id}/products {upload_id, title, edition_size, is_limited_edition,
   coa_type}`. Defaults are limited edition of 50; set explicitly.
4. `PUT /drops/{drop_id}/products/{product_id}/variants {variants:[…]}`. PUT replaces the
   whole list every time. Each variant: `size_label`, `print_width_mm`,
   `print_height_mm`, `price_gbp` (required, irrelevant for API orders), `is_framed`,
   `frame_color: oak|black|white`, `mount_board_size: none|small|large`,
   `border: none|small|large` (default small), `paper_id`, `signature`, `numbering`.
   Same size+frame identity twice → 422 `duplicate_variants`.
5. There is no variants listing endpoint. Read variant ids from `GET /drops/{drop_id}`
   (the `data` blob). The sync script writes `variant_id` per size and frame back into
   `src/content/prints/<slug>.json`. That id is the SKU.


### Ordering
- `POST /orders/quote {items:[{variant_id, quantity}], delivery_country_code}` →
  `{currency, total_incl_vat, total_excl_vat, total_vat, production_cost,
  delivery_cost, addon_cost, ddp_total}`. Always quote first and store it against the
  order so margin against `pricing.ts` is visible.
- `POST /orders {items, delivery_name, delivery_line1, delivery_line2?, delivery_city,
  delivery_postcode, delivery_country_code, delivery_email?, delivery_phone?,
  delivery_county?}` with an `Idempotency-Key` header (use the Stripe session id) →
  201 `{order_id, order_number, currency, total_incl_vat, lines}`.
- `GET /orders`, `GET /orders/{order_id}` (items with per-item production status),
  `GET /invoices`.
