# dylandibona.com — Development Notes

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6.x, Vercel adapter |
| CMS | Keystatic (`storage: local`, dev only) |
| UI | React 19 (peer dep for Keystatic only — no React components ship) |
| Type | Area, from Adobe Fonts kit `yfz0paf` |
| Styles | One stylesheet, `src/styles/site.css` |

---

## The shape of the site

One photograph fills the viewport. Everything else is an index in the bottom left.
Opening a section never takes the photograph off screen: `ClientRouter` swaps the
document while `transition:persist` keeps `.stage`, `.track` and the loader alive.
Real URLs throughout, because a print needs an address someone can type off a wall.

`body[data-open]` drives every open/closed state in CSS. Home sets `false`, every
other route sets `true` via the layout's `open` prop. There is no JS toggling classes.

### Layout props
```astro
<Site title="…" description="…" open />
```

---

## The stage (8 Sep 2026)

The homepage photograph is a WebGL canvas in `.stage`, not an `<img>`. One fragment
shader does two things. The water: two slow layers of simplex noise bend the texture
lookup by a few thousandths, and a broader, slower swell magnifies by about a percent as
it passes, so the print looks like it sits under a still sheet of water. The arrival: a new
photograph comes in as 96px blocks that shrink to sharp (2.2s, eased, log spaced); the
current one breaks back into blocks (0.55s) before the next. The water only runs on the
homepage; behind the veil the frame loop stops. No WebGL → plain 2D draw, no flow.
Reduced motion → sharp at once, no flow. Dials: `MAX`, `IN`, `OUT` in the `pix` module;
in the shader, `.0035` is bend amplitude, `.012` is swell magnification, the `t *` factors
are speed.

## Prints

**One image plus one JSON file makes a print.** Both are keyed by slug:

- `src/assets/prints/<slug>.jpg` — the photograph, 2500px on the long edge, with the
  printed white border baked in (53px). The border is intentional and should show
  inside the frame. Do not crop it, and do not draw a second one in CSS.
- `src/content/prints/<slug>.json` — title, where, orientation, published, hero

`src/lib/prints.ts` joins them with `import.meta.glob` and **throws at build time**
if a JSON file has no matching image. A missing pair fails the build rather than
shipping a hole.

- `published: false` hides a print everywhere.
- `hero: true` lets a photograph fill the homepage. **Landscape only** — portraits
  crop badly full-bleed.
- `where: ""` renders nothing. Leave it blank rather than guessing.

Prices live in `SIZES` in `src/lib/prints.ts`, in pence. **They are invented** and
must be replaced with real CreativeHub cost plus margin before launch.

---

## Gotchas that cost real time

### The loader must be taken out of the layout, not just faded
It is `transition:persist`, but a route entered directly still ships its own copy of
the markup. Without the `window.__booted` guard adding `.gone` (`display:none`), that
fresh copy sits there as an opaque black sheet swallowing every click on the page.

### The hero controller is a singleton on `window.__hero`
Because the stage is persisted, re-running the initialiser on each navigation would
stack rotation timers. It builds once and exposes `sync()`, called on `astro:after-swap`.

### Adobe Fonts is loaded non-blocking, on purpose
A render-blocking stylesheet also blocks the inline scripts under it. If Adobe is slow,
a plain `<link rel=stylesheet>` leaves the loader unable to paint — a black screen for
as long as the request hangs. It is loaded with `rel=preload` + `onload`, with a
`<noscript>` fallback. Expect a brief FOUT. That is the correct trade.

### Adobe Fonts has no domain list
Web projects are not domain-restricted. `localhost`, Vercel previews and production all
work from the one kit. If Area is not rendering, it is not a domain problem.

### A hero that 404s must hand off, and the loader must self-clear
Both guards are load-bearing. Without them one missing file leaves the site a permanent
black screen. There is a hard 6-second clear regardless of what else happens.

### `astro preview` does not serve with the Vercel adapter
Use `npm run dev`, or deploy.

### `.npmrc` is required
`legacy-peer-deps=true` — Vercel's install fails without it on the Keystatic/Astro 6
peer dep conflict. Do not remove.

---

## Typography

Kit `yfz0paf`. `--sans` = `ferryman` (300 and 700, both with italics), used for
everything. `--name` = `gandur-new` (300 only), used for the name top left and nothing
else. `--disp` aliases `--sans`. Area is still in the kit but unused (swapped 8 Sep 2026).

**Navigation is never set in capitals.** Sentence case, weight 300. Capitals are for
small tracked labels only: eyebrows, size rows, print locations, fine print, the loader.
The contact block is data rather than a label, so it is lowercase too.

Ferryman has no 400. Body, nav and headings all run at 300; 700 is for emphasis only.
`font-synthesis:none` is set — never let a browser fake a weight or an italic.

---

## API routes

| Route | What |
|---|---|
| `/api/spotify` | Recently played, refresh-token flow, cached 60s at the edge |
| `/api/health` | Liveness check |

Spotify needs `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
in Vercel. Locally it returns 500 without them; `/listening` degrades to a message
rather than an empty list.

---

## Checkout and fulfilment (not built yet)

Decided 8 Sep 2026. Two halves, built so the second can land without touching the first.

**Half one, Stripe.** Hosted Stripe Checkout, not Elements. Checkout collects card and
shipping address; the site never handles either. A Vercel function creates the session
with `slug`, `size` and `frame` in metadata and the shipping address collection turned
on for the countries we ship to. A `checkout.session.completed` webhook calls
`fulfil(order)` in `src/lib/fulfil.ts`. The fulfil call is keyed on the session id so a
Stripe webhook retry can never place two orders.

**Half two, `fulfil.ts`.** One adapter with two implementations:

- `manual` (ships first): emails Dylan the full order — print, size, frame, address,
  session id — and he places it by hand on creativehub. This is the fallback forever,
  not just the interim: if the API call fails for any reason, fall through to it.
- `creativehub` (once API access is enabled): quote, then order, per the spec below.

**Order status page** at a real URL so any email is one link. Reads from wherever
orders are stored (see below).

**Orders need a table.** Session id, slug, size, frame, address, Stripe amount,
creativehub order id, creativehub quoted cost, status, timestamps. Free tier only:
Supabase or Vercel Postgres. Decide at build time.

**Tracking email.** No creativehub webhook exists yet, so a daily Vercel cron polls
open orders via `GET /v1/orders/{id}` and emails when an item reaches dispatched.

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

Open question for support: whether an API-only account must `POST /drops/{id}/publish`
before variants are orderable. Publish "creates the store products" and we have no
connected store.

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

### Before committing to prices
Quote the large framed to a US address. `pricing.ts` was set for how the numbers read,
not from cost. The quote says whether $595 covers London to New Orleans on a framed
70×100.

---

## Also not built yet

- **The Letter.** Beehiiv does not exist yet. The form says so rather than pretending.
  Issue rows link nowhere.
