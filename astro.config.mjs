// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

export default defineConfig({
  site: 'https://dylandibona.com',
  adapter: vercel({ imageService: false }),
  integrations: [react(), keystatic()],
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  // Old WordPress URLs. 302 everywhere, not 301: the case studies move back
  // here later, and a 301 would sit in browser caches long after that.
  // Only the plain paths live here. Anything with a [...slug] is an endpoint
  // under src/pages: a config redirect with a param needs getStaticPaths in a
  // static build, and one pointed at another host sends 301 with the literal
  // placeholder in the URL. See src/pages/project/ and src/pages/work/.
  redirects: {
    '/about': { status: 302, destination: '/bio' },
  },
});
