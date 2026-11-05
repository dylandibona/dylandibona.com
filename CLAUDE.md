# dylandibona.com — Development Notes

**Read `STATUS.md` at the start of every session. Update it at the end of every session.** Current state, open items and the session history live there, not here. Long reference lives in `docs/reference.md`.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6.x, Vercel adapter |
| CMS | Keystatic (`storage: local`, dev only) |
| UI | React 19 (peer dep for Keystatic only — no React components ship) |
| Type | Ferryman (text) and Gandur New (the name), Adobe Fonts kit `yfz0paf` |
| Styles | One stylesheet, `src/styles/site.css` |
| Analytics | Vercel Web Analytics (see Analytics) |

---

## The shape of the site

One photograph fills the viewport. Everything else is an index in the bottom left.
Opening a section never takes the photograph off screen: `ClientRouter` swaps the
document while `transition:persist` keeps `.stage`, `.track` and the loader alive.
Real URLs throughout, because a print needs an address someone can type off a wall.

`body[data-open]` drives every open/closed state in CSS. Home sets `false`, every
other route sets `true` via the layout's `open` prop. There is no JS toggling classes.

### Navigation (10 Sep 2026)
On desktop the index stacks in the bottom left and the contact block (email, three phones,
@dylandibona) pins top right, both always visible. At 720px and below they fold into one
sheet behind a two-line mark, bottom left; that CSS is the block under `the mark: two short
lines` in `site.css`. The breadcrumb is a `<nav>` too, so bare `nav a` rules reach it: its
links take 15px on desktop and 19px on phones from them.

### Closing a panel
The ✕, the name in the breadcrumb, the backdrop and Escape all call `close()` in
`Site.astro`, through one capture listener bound once. It steps back with `history.back()`
when the entry behind is on this site (Astro's router stamps `history.state.index`, 0 on
the page the visitor arrived on; a same-site referrer also counts) and otherwise navigates
home. So /prints, then /prints/ferme, then ✕ lands on /prints. The browser's own back
button is left alone: from a cold deep link it leaves the site, by decision (10 Sep).

### Space below the title
Panel content starts `--below-title` (1.5rem) under the breadcrumb on every page at every
width. The breadcrumb wraps on narrow phones and long print titles, so an inline script
right after it writes its real height to `--crumbs-h` (on load, when fonts finish loading,
on resize, after each swap) and `.panel` pads by `--gap + --crumbs-h + --below-title`.

### Links that leave the site
`src/components/Ext.astro` is the new-window mark, drawn as an SVG because iOS renders the
↗ character as an emoji. On /bio any `http` link opens a new tab and carries the mark;
`mailto:` and `tel:` links do not.

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
photograph comes in as 96px blocks that shrink to sharp (0.8s, ease-in-out, log spaced); the
current one breaks back into blocks (0.8s, ease-in-out) before the next. The water only runs on the
homepage; behind the veil the frame loop stops. No WebGL → plain 2D draw, no flow.
Reduced motion → sharp at once, no flow. Dials: `IN`, `OUT`, `SHARP` at the top of the hero controller in
`Site.astro` (the rotation is `OUT + IN + SHARP`, so the transitions never cut into the
sharp hold), `MAX` in the `pix` module;
in the shader, `.011` is bend amplitude, `.035` is swell magnification, the `t *` factors
are speed. The water fades to zero over the outer 12% of the canvas (`smoothstep(0., .12, …)`),
so it never pushes an edge of the photograph out of frame.

**No extra crop (16 Sep).** `.stage` is exactly the visible viewport (`100dvh`, no overscan,
no breathe scale), and the shader's cover-fit is the only crop: a phone loses what the aspect
ratio costs and nothing more. The focal point only chooses where that overflow goes; it adds no
scale. The stage reads `public/bg/<slug>.webp` (q80), the print master with its 250px border shaved
off, 2400px long side (`scripts/make-bg.sh`; rerun after adding or replacing a master). If it
fails it tries `public/bg/<slug>.jpg` (q88), then `public/prints/<slug>.jpg`. Every hero needs a master.

## Prints

**One image plus one JSON file makes a print.** Both are keyed by slug:

- `src/assets/prints/<slug>.jpg` — the photograph, 2500px on the long edge, with the
  printed white border baked in (53px). The border is intentional and should show
  inside the frame. Do not crop it, and do not draw a second one in CSS.
- `src/content/prints/<slug>.json` — title, where, orientation, published, hero, caption
  (caption is for the newsletter; not rendered on the site by decision, 11 Sep)
- `public/masters/jpg/<slug>.jpg` — the print master creativehub fetches at print time.
  100×70cm at 300dpi = 11811×8268 (or 8268×11811), photo scaled to cover and centre-cropped,
  250px white border all sides, JPEG q95, 4:4:4, sRGB embedded. `public/prints/<slug>.jpg`
  is the 1200px copy for email and OG. New photos: TIFF/JPEG into `../_prints/`, same recipe.

`src/lib/prints.ts` joins them with `import.meta.glob` and **throws at build time**
if a JSON file has no matching image. A missing pair fails the build rather than
shipping a hole.

- `published: false` hides a print everywhere.
- `hero: true` lets a photograph fill the homepage. **Landscape only** — portraits
  crop badly full-bleed.
- `where: ""` renders nothing. Leave it blank rather than guessing.
- `focal: "X% Y%"` is the point the background crop keeps on phones, set with
  `_focal-picker.html` in the outer folder. It means what CSS `object-position` means; the
  stage shader applies it. Optional, `"50% 50%"` when absent. A malformed value fails the build.

Prices live in `SIZES` in `src/lib/pricing.ts` (re-exported by `prints.ts`), in US cents.
Current prices and margins: `STATUS.md`.

Promo codes are Stripe-side, framed only (`allow_promotion_codes` is true only when
`frame != none`). The creativehub cost guard in `fulfil.ts` compares the quote with the
session's `amount_total`, which is after any discount, so a discounted order that quotes
above what was paid falls through to the manual email. Quotes come back in the account
currency (USD) for every destination.

### The prints index (10 and 13 Sep)
Each tile is a small copy of the print page's black frame: `.mini-mount`, with the same
rail and rim colours as `.mount` (keep them in step) and the same inset rebate shadow, drawn
as a border so the corners mitre. No tilt, no glass sheen, no mat; the white border printed
into the image is the mat. The moulding is `calc(100cqw * .024)`, 2.4% of the frame's long
side, which is the print page frame's proportion at 1440x900. Images are sized from the cell
by `data-orientation`, so a lazy image that has not arrived still gets a full-size frame.
Four columns, three at 1100px. At 720px and below, one column in source order: landscape
frames fill the column and portrait frames are 70% of it, centred, the same sheet turned.

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

## Analytics

Vercel Web Analytics, added once in `src/layouts/Site.astro` (`<Analytics />` from
`@vercel/analytics/astro`, in the head), so every page is tracked. ClientRouter
navigations count too: each page renders its own `<vercel-analytics>` element, and the
new one sends the page view when the router swaps it into the head. Page views and
referrers only, no custom events. No cookies, so no consent banner is needed. The
dashboard is in the Vercel project under Analytics.

The tracker path and how to check it is live: `docs/reference.md`.

---

## API routes

| Route | What |
|---|---|
| `/api/spotify` | Recently played, refresh-token flow, cached 60s at the edge |
| `/api/health` | Liveness check |
| `/api/checkout` | POST {slug,size,frame} → hosted Checkout Session url. Price recomputed server-side |
| `/api/subscribe` | POST `{email}` from the /letter form → Beehiiv subscription, tag `letter` → `{ok}` |
| `/api/stripe/webhook` | checkout.session.completed → fulfil, receipt to buyer, Beehiiv subscribe on consent. Idempotent via `fulfilled_at` on the PaymentIntent |
| `/api/creativehub/webhook` | Accepts and logs order-status events from creativehub (payload shape unknown until one arrives) |
| `/api/cron/shipped` | Daily cron (`vercel.json`, 15:00 UTC). Emails the buyer once when creativehub marks the order dispatched; stamps `shipped_at` on the PaymentIntent. Needs `Authorization: Bearer $CRON_SECRET` |

**Fulfilment** (`src/lib/fulfil.ts`): with `CREATIVEHUB_TOKEN` set and a variant id in the
print's JSON (`creativehub.variants["M|black"]`), it quotes then places the order over the API
with the Stripe session id as `Idempotency-Key`, stamps the creativehub order id on the
PaymentIntent, and emails Dylan "placed". Any failure (no token, no variant, bad address,
quote higher than what the buyer paid, API error) falls through to the manual email with the
reason. No creativehub sandbox: a test order is a real order, billed to the saved card.
| `/orders/[session]` | The receipt. Reads the session from Stripe; unpaid or unknown → /prints |

**Old URLs (24 Sep).** `/about` redirects in `astro.config.mjs`. `/work/[...slug]` and
`/project/[...slug]` are endpoints under `src/pages`, all 302 because the case studies come
back here later. `/project/*` keeps its slug and query and goes to
`wordpress-1587554-6225781.cloudwaysapps.com`, the old WordPress on Cloudways (server 1587554,
app 6225781); bare `/project` goes to its root. Two traps: a config redirect carrying a
`[...slug]` needs `getStaticPaths` in this build, and a config redirect to another host sends
301 whatever status is set, with the literal `[...slug]` in the URL. Hence endpoints.

**404** is `src/pages/404.astro`: the Site layout, read (centred), "Nothing here." in the name
face, links to / and /prints.

Env vars and local webhooks: `docs/reference.md`.

---

## Checkout and fulfilment (built 8 and 9 Sep)

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
- `creativehub` (live since 9 Sep): quote, then order, per the spec below.

**Order status page** at a real URL, `/orders/[session]`, so any email is one link. It
reads the session back from Stripe.

**No orders table.** Stripe is the system of record: the Checkout Session and its
PaymentIntent metadata carry the order and the creativehub order id (`PLAYBOOK.md`).

**Shipped email:** daily cron, `src/pages/api/cron/shipped.ts`; see `docs/reference.md`.

Site copy says nothing about where prints are made (16 Sep): "Made to order on Hahnemühle
Photo Rag", "made to order by hand at theprintspace", "Ships in about a week".

---

## creativehub API (theprintspace)

Reference: https://sell.creativehub.io/api-docs. It is a React page; the spec is
inlined in the JS bundle, not fetchable as text. Support: support@theprintspace.co.uk.

**Everything older in these notes about `Authorization: ApiKey`, embryonic and
confirmed orders, PascalCase fields, or a sandbox at `api.sandbox.tps-test.io` is the
legacy API and is dead. Do not build against it.** Any doc that shows snake_case
`shipping_address` / `print_size: "A3"` / `paper_type` strings is invented. Ignore it.

Endpoints, auth and catalogue model: `docs/reference.md`.

---

## The Letter

- **The Letter.** Form on /letter posts to `/api/subscribe` → Beehiiv. Beehiiv's create endpoint has no `tags`; provenance rides in UTM fields instead: source `letter`/`print`, medium `form`/`buyer`, campaign = print slug. Segment on those in Beehiiv. Without keys, subscribe logs and the form reports failure.
  /letter lists archive issues from the hardcoded `issues` array in `src/pages/letter.astro`; add a new issue to the top of that array when it publishes.
