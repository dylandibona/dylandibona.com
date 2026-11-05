# STATUS: dylandibona.com

Read this at the start of every session. Update it at the end of every session: add a Recent sessions entry (what was done, what went wrong and how it was solved, watch-outs, next step) and refresh Current state and Open items. Rules, architecture and guardrails live in `CLAUDE.md`.

Earlier project history, locked design decisions and the shop playbook live outside the repo in the parent folder: `../STATUS.md` (last updated 16 to 23 Sep 2026) and `../PLAYBOOK.md`. They are not in git.

## Current state

- Live at dylandibona.com, deployed by Vercel from branch `live`. GitHub's default branch `main` is stale (last commit 10 Apr 2026).
- Prices (`SIZES` in `src/lib/pricing.ts` is the source of truth):
  Unframed / framed: S $65 / $150, M $105 / $215, L $225 / $550 (L lowered 10 Sep). Every price
  on the site renders from there. Real creativehub quotes (9 Sep, `PLAYBOOK.md` Phase 5) show
  every line profitable; the S lines are thin.

## Recent sessions (newest first)

### 2026-11-05: CLAUDE.md split into rules and status

- **Done:** Cut `CLAUDE.md` from 21,854 to under 15 KB. Rules and architecture stay. Dated state (prices, the colour note, the price check), known limitations and open questions moved here verbatim. Env vars, the creativehub API reference and theprintspace support notes moved verbatim to `docs/reference.md`. No code, schema or config change.
- **Went wrong / solved:** GitHub reports `main` as the default branch, but `main` stops at 10 Apr 2026 and `live` is 45 commits ahead and is what Vercel deploys. The PR targets `live`.
- **Watch-outs:** The parent folder already has its own `STATUS.md` (not in git). Two files with the same name will drift. Decide whether to fold it into this one.
- **Next step:** Dylan reviews this PR.

### Log before 2026-11-05 (verbatim from the old CLAUDE.md)

Colour note from the Prints section. The parent-folder `STATUS.md` records this as resolved 13 Sep: the masters were converted back to sRGB.

- Colour: the 8 original masters carry theprintspace's Photo Rag *printer* profile (Empty
  Gesture era), not sRGB; they preview washed out in colour-managed viewers. Whether
  creativehub honours that tag is unknown until the Fermé test print is seen. Barrel Proof
  and Autumn Lines are sRGB. See STATUS.md.

#### Before committing to prices
Done 9 Sep: the large framed to a US address quotes $385 delivered against $550. The full
quote table is in `PLAYBOOK.md` Phase 5.

## Open items

### Known limitations

- **Panel pages scroll inside the panel, not the page.** `body` is `overflow:hidden`
  and every layer is `position:fixed`, so a section's content scrolls in `.panel`'s own
  scroll box. On phones that means no pull to refresh (iOS Safari only refreshes when
  the document itself is pulled past its top), the browser toolbar does not shrink on
  scroll, and tapping the iPhone status bar does not jump to the top.
  `overscroll-behavior-y:auto` on `.panel` was tried and does nothing; reverted
  10 Sep 2026. The fix is for panel pages to scroll the document, with the stage, veil
  and breadcrumb staying fixed behind. Scheduled after launch. It touches the
  open/close transition and ClientRouter scroll restoration, so test it on a real
  iPhone and Android.

- Old WordPress host certificate (from API routes, Old URLs):
  **That host serves a certificate for dylandibona.com**, left from when the domain pointed there,
  so HTTPS to it fails validation until a cert covering the cloudwaysapps hostname is issued in
  Cloudways.

- creativehub drops:
  Open question for support: whether an API-only account must `POST /drops/{id}/publish`
  before variants are orderable. Publish "creates the store products" and we have no
  connected store.
