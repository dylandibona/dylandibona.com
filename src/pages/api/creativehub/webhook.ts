export const prerender = false;

import type { APIRoute } from 'astro';

/**
 * creativehub order-status events land here. Their docs called delivery
 * "coming"; the token page now accepts a URL, so this accepts anything and
 * logs the whole body. Once a real payload has been seen, the dispatch email
 * gets wired to it. Always 200: a receiver that errors gets retried or
 * disabled, and we would rather see the payload than block it.
 */
export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  console.log('creativehub webhook', request.headers.get('content-type'), raw.slice(0, 4000));
  return new Response('ok', { status: 200 });
};
export const GET: APIRoute = async () => new Response('creativehub webhook: POST only', { status: 200 });
