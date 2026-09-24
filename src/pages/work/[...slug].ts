export const prerender = false;

import type { APIRoute } from 'astro';

/** Old /work URLs, whatever the slug, land on the bio. 302: see astro.config.mjs. */
export const GET: APIRoute = () =>
  new Response(null, { status: 302, headers: { Location: '/bio' } });
