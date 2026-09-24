export const prerender = false;

import type { APIRoute } from 'astro';

/**
 * The old WordPress case studies, now on Cloudways. /project/twitter keeps its
 * slug; bare /project goes to that site's root. Query strings ride along.
 *
 * 302, because the case studies come back here later and a 301 would outlive
 * the move in browser caches.
 *
 * An endpoint rather than a `redirects` entry in astro.config: a config
 * redirect to another host sends 301 whatever status is set, and pastes the
 * [...slug] placeholder in rather than the slug. An .astro page would do it
 * too, but a top-level `return` there hides `prerender = false` from the
 * build, and the build then asks for getStaticPaths.
 */
const HOST = 'https://wordpress-1587554-6225781.cloudwaysapps.com';

export const GET: APIRoute = ({ params, url }) => {
  const slug = (params.slug ?? '').replace(/^\/+|\/+$/g, '');
  const to = slug ? `${HOST}/project/${slug}${url.search}` : `${HOST}/${url.search}`;
  return new Response(null, { status: 302, headers: { Location: to } });
};
