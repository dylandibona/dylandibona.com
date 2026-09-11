/**
 * Single source of truth for the print catalogue.
 *
 * Metadata lives in src/content/prints/<slug>.json (Keystatic edits these).
 * The photograph itself lives at src/assets/prints/<slug>.jpg and is matched by
 * filename, so adding a print means dropping in one image and one JSON file.
 */
import type { ImageMetadata } from 'astro';

export type Print = {
  slug: string;
  title: string;
  where: string;
  orientation: 'landscape' | 'portrait';
  published: boolean;
  hero: boolean;
  image: ImageMetadata;
  /** "X% Y%", read as object-position: the point the homepage crop keeps on a
   *  phone. Optional in the JSON; "50% 50%" when absent. */
  focal: string;
  /** written by scripts/creativehub-sync.mjs; absent until synced */
  creativehub?: { upload_id: string; product_id: string; drop_id: string; variants: Record<string, string>; skus?: Record<string, string> };
};

type Meta = Omit<Print, 'slug' | 'image' | 'focal'> & { focal?: string };

const FOCAL = /^(\d{1,3}(?:\.\d+)?)% (\d{1,3}(?:\.\d+)?)%$/;

/** focal as fractions of the crop, [x, y] from 0 to 1, for the homepage shader */
export const focalOf = (p: Print): [number, number] => {
  const [, x, y] = FOCAL.exec(p.focal)!;
  return [Number(x) / 100, Number(y) / 100];
};

const meta = import.meta.glob<Meta>('../content/prints/*.json', { eager: true, import: 'default' });
const art = import.meta.glob<ImageMetadata>('../assets/prints/*.jpg', { eager: true, import: 'default' });

const slugOf = (p: string) => p.split('/').pop()!.replace(/\.(json|jpg)$/, '');

const bySlug = new Map<string, ImageMetadata>(
  Object.entries(art).map(([path, img]) => [slugOf(path), img])
);

export const PRINTS: Print[] = Object.entries(meta)
  .map(([path, m]) => {
    const slug = slugOf(path);
    const image = bySlug.get(slug);
    if (!image) throw new Error(`No artwork at src/assets/prints/${slug}.jpg for ${slug}.json`);
    const focal = m.focal ?? '50% 50%';
    const f = FOCAL.exec(focal);
    if (!f || Number(f[1]) > 100 || Number(f[2]) > 100)
      throw new Error(`focal in ${slug}.json must be "X% Y%", each 0 to 100; got "${focal}"`);
    return { slug, image, ...m, focal };
  })
  .filter((p) => p.published)
  .sort((a, b) => a.title.localeCompare(b.title));

/** Photographs that can carry the full-bleed homepage without an awkward crop. */
export const HEROES = PRINTS.filter((p) => p.hero);

export const findPrint = (slug: string) => PRINTS.find((p) => p.slug === slug);
export { SIZES, FRAMES, DEFAULT_SIZE, DEFAULT_FRAME, priceOf, money, PRINT_NOTE } from './pricing';
