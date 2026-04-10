# dylandibona.com — Development Notes

This file captures architectural decisions, known gotchas, and patterns for working on this codebase. Keep it up to date.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Astro 6.x (static + hybrid SSR via Vercel adapter) |
| Adapter | `@astrojs/vercel` |
| CMS | Keystatic (`@keystatic/core` + `@keystatic/astro`) |
| UI | React 19 (required peer dep for Keystatic) |
| Hosting | Vercel (dylandibona.com) |
| Styles | Global CSS (`src/styles/global.css`) — no utility framework |

---

## Project Structure

```
src/
  components/cards/    # One .astro component per homepage panel
  content/cocktails/   # Keystatic-managed JSON data files
  data/site.json       # Static data: places, playlists, copy, etc.
  pages/
    index.astro        # Main homepage — assembles all card components
    api/spotify.ts     # Serverless endpoint for live Spotify tracks
  styles/global.css    # All styles (single file, sectioned)
public/
  cocktails/           # Cocktail photos (Keystatic saves here)
  prints/              # Photography print images
  prints-lifestyle/    # Lifestyle/editorial photos for Photography panel bg
  places-to-stay/      # Images for Places to Stay panel
keystatic.config.ts    # CMS schema definition
```

---

## Keystatic CMS

### Setup
- Installed with `--legacy-peer-deps` due to peer dep conflict between `@keystatic/astro` and Astro 6
- `.npmrc` contains `legacy-peer-deps=true` — **do not remove**, Vercel needs this to install
- Routes are auto-injected by the integration: `/keystatic/[...params]` and `/api/keystatic/[...params]`
- No manual page files needed for the CMS UI

### Cocktails Collection
- Schema: `name` (slug field), `order` (integer), `spirit`, `desc`, `photo` (image), `ingredients` (array), `method`
- Files stored at: `src/content/cocktails/*.json`
- Photos stored at: `public/cocktails/[slug]/photo.jpg`

### Image Path Gotcha
Keystatic `fields.image` with `publicPath: '/cocktails/'` stores the **full public path** in JSON (e.g. `/cocktails/negroni/photo.jpg`). Manually created JSON files may store only the filename (e.g. `negroni.jpg`). The mapping in `index.astro` handles both:
```ts
photo: mod.photo
  ? (mod.photo.startsWith('/') ? mod.photo : `/cocktails/${mod.photo}`)
  : null
```
Never prepend `/cocktails/` unconditionally — you'll double-prefix Keystatic-managed images.

### Reading Cocktail Data
Use `import.meta.glob` rather than the Keystatic Reader API. The Reader API's TypeScript gymnastics with `fields.slug` (returns display name, not slug) make it painful. The glob approach is simpler and works at build time:
```ts
const cocktailMods = import.meta.glob('../content/cocktails/*.json', { eager: true });
```

### Cocktail Ordering
The `order` field is an optional integer. Sort logic in `index.astro`:
- Items with `order` set → sorted ascending by number
- Items without `order` → appended alphabetically after ordered items

### Deleting a Cocktail in Keystatic
Open the cocktail in `/keystatic`, scroll to the bottom of the edit view. There is a **Delete entry** button. No code changes needed.

---

## Homepage Grid

### Layout
8 cards arranged in a 4-column CSS grid (`.card-area`). Grid positions are set per card.

### Critical: Use `data-card-index` Selectors
**Never use `nth-child` for grid positioning.** Keystatic injects extra DOM elements (route scripts, portals) that can shift sibling counts and break `nth-child` selectors. Use the `data-card-index` attribute instead:
```css
/* WRONG — fragile */
.card:nth-child(1) { grid-column: 1; grid-row: 1 / 7; }

/* RIGHT — stable */
.card[data-card-index="0"] { grid-column: 1; grid-row: 1 / 7; }
```
Each card component has `data-card-index="N"` set on its root `<div class="card">`.

### Card Index Map
| Index | Panel |
|---|---|
| 0 | Photography |
| 1 | Listening |
| 2 | Cocktails |
| 3 | Natrx / Video |
| 4 | Places to Stay |
| 5 | Moodboard |
| 6 | Writing |
| 7 | (eighth panel) |

---

## Photography Card

### Full-Bleed Background
The Photography card uses a random lifestyle image from `public/prints-lifestyle/` as its background. Selection happens at build time via `Math.random()` in the component frontmatter.

- Images are hardcoded by filename in `Photography.astro` — update the array when adding/removing images from `public/prints-lifestyle/`
- Do **not** use `import.meta.glob` on `public/` — those files aren't processed by Vite and the glob won't work reliably

### Dark Overlay
A `.photo-card-overlay` div (`position: absolute; inset: 0; background: rgba(0,0,0,0.48)`) sits at `z-index: 1` between the background image and the card content (`z-index: 2+`). This ensures text legibility.

### card-bg is Not Used for Photography
The generic `.card-bg` class is designed to be nearly invisible (opacity 0 → 0.1 on active). For Photography's full-bleed effect, the background image is set inline directly on the `.card` element, not on a `.card-bg` child.

---

## Places to Stay Card

### Layout
Full-bleed image panel with grow/shrink hover navigation:
- `.places-expand` has `padding: 0 !important` to eliminate the card's default padding
- `.places-duo` is `position: absolute; inset: 0` — fills the entire expanded card
- Individual place images (`.pd-img`) use `flex: 1` and `transition: flex` — hovering expands one while shrinking the other
- Floating title (`.places-title`) is `position: absolute; top: 28px; left: 28px; z-index: 5`

### Data Shape (site.json)
```json
{
  "city": "San Francisco",
  "name": "Apartment name",
  "neighborhood": "The Mission",
  "sleeps": 2,
  "image": "/places-to-stay/san-francisco.jpg",
  "bookUrl": "https://...",
  "bookLabel": "Book on Airbnb"
}
```

---

## Spotify Integration

Live recently-played tracks via serverless endpoint at `/api/spotify.ts`:
- Credentials stored as Vercel environment variables: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
- Endpoint fetches using the refresh token flow, returns JSON array of tracks
- Response cached at edge for 60 seconds
- Frontend (`grid.js`) fetches on first Listening panel open, replaces static fallback

---

## Deployment

### Vercel Project
- Team: Dylan's projects (`team_AWaPx3Ss5neLYFXWNSbfOmnC`)
- Project: `prj_aEgZeaBMw2JhH9xqFf2OP4ktYo8i`
- Git integration: auto-deploys on push to `main`

### CLI Auth Mismatch
The local Vercel CLI (`vercel whoami`) is scoped to **monday-and-partners**, not Dylan's projects. CLI commands like `vercel logs` will fail. Use the Vercel MCP tools or the Vercel dashboard instead for deployment inspection.

### .npmrc Is Required
`legacy-peer-deps=true` in `.npmrc` is required for Vercel's build to succeed. Without it, `npm install` fails on the `@keystatic/astro` / Astro 6 peer dep conflict.

---

## CSS Conventions

- All styles in `src/styles/global.css`, sectioned with `/* ══ SECTION ══ */` headers
- CSS custom properties defined at `:root` (colors, spacing)
- Card hover/active state transitions are `0.2–0.6s ease`
- Identity bar has `box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.55)` for depth above the grid

---

## Content Editing Cheatsheet

| What | Where |
|---|---|
| Cocktail recipes | `/keystatic` → Cocktails collection |
| Cocktail order | Set the `Order` integer field (lower = first; blank = alphabetical) |
| Delete a cocktail | Open in Keystatic → scroll to bottom → Delete entry |
| Places to Stay | `src/data/site.json` → `places` array |
| Moodboard images | Tumblr feed (fetched at build time via `TUMBLR_API_KEY`) |
| Photography prints | `src/data/site.json` → `prints` array + image in `public/prints/` |
| Photography panel bg | Add image to `public/prints-lifestyle/` + add filename to array in `Photography.astro` |
| Playlists | `src/data/site.json` → `playlists` array |
