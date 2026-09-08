# dylandibona.com

Astro, deployed on Vercel. See `CLAUDE.md` for architecture, conventions and the
gotchas worth knowing before changing anything.

```bash
npm install          # .npmrc pins legacy-peer-deps; it is required
npm run dev          # http://localhost:4321
npm run build
```

`astro preview` does not serve with the Vercel adapter. Use `dev`, or deploy.

Adding a print: drop `src/assets/prints/<slug>.jpg` and `src/content/prints/<slug>.json`.
The build fails loudly if one is missing.
