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
});
