#!/usr/bin/env node
/**
 * One-time catalogue sync. Idempotent: re-running updates rather than duplicates.
 *
 *   node scripts/creativehub-sync.mjs --dry            # show the plan
 *   node scripts/creativehub-sync.mjs                  # register, create, write ids back
 *   node scripts/creativehub-sync.mjs --quote US       # quote every variant to a country
 *
 * Needs CREATIVEHUB_TOKEN and MASTERS_BASE_URL in .env. MASTERS_BASE_URL is a
 * public https folder holding <slug>.jpg for each published print, full res.
 *
 * Sizes and frames come from src/lib/pricing.ts so the catalogue can never
 * drift from the site. price_gbp is required by the API but irrelevant for
 * API orders (we are billed cost); it is set to the USD retail as a marker.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const QUOTE = args.includes('--quote') ? args[args.indexOf('--quote') + 1] : null;

for (const l of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const TOKEN = process.env.CREATIVEHUB_TOKEN, MASTERS = (process.env.MASTERS_BASE_URL ?? '').replace(/\/$/, '');
if (!TOKEN) throw new Error('CREATIVEHUB_TOKEN missing');
const B = 'https://escher-v2.creativehub.io/v1';
async function ch(p, init = {}, tries = 4) {
  for (let i = 1; ; i++) {
    const r = await fetch(B + p, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
    const t = await r.text();
    if (r.ok) return t ? JSON.parse(t) : null;
    if ((r.status >= 500 || r.status === 429) && i < tries) { console.log(`  ${r.status} on ${p}, retry ${i}`); await sleep(4000 * i); continue; }
    throw new Error(`${init.method ?? 'GET'} ${p} → ${r.status}: ${t.slice(0, 300)}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── sizes and frames, from pricing.ts, by regex so this file has no TS deps ──
const pricing = fs.readFileSync('src/lib/pricing.ts', 'utf8');
const SIZES = [...pricing.matchAll(/code:\s*'(\w)',[^}]*mm:\s*\[(\d+),\s*(\d+)\],[^}]*framed:\s*(\d+),\s*print:\s*(\d+)/g)]
  .map((m) => ({ code: m[1], w: +m[2], h: +m[3], framed: +m[4] / 100, print: +m[5] / 100 }));
const FRAMES = ['black', 'white', 'oak'];
if (SIZES.length !== 3) throw new Error('could not read SIZES from pricing.ts');

// ── prints ──
const prints = fs.readdirSync('src/content/prints').filter((f) => f.endsWith('.json'))
  .map((f) => ({ slug: f.slice(0, -5), file: path.join('src/content/prints', f), ...JSON.parse(fs.readFileSync(path.join('src/content/prints', f), 'utf8')) }))
  .filter((p) => p.published);
console.log(`${prints.length} published prints, ${SIZES.length} sizes × ${FRAMES.length + 1} frame options = ${SIZES.length * (FRAMES.length + 1)} variants each`);

// variants for one print: portrait swaps w/h
function variantsFor(p) {
  const out = [];
  for (const s of SIZES) {
    const [w, h] = p.orientation === 'portrait' ? [Math.min(s.w, s.h), Math.max(s.w, s.h)] : [Math.max(s.w, s.h), Math.min(s.w, s.h)];
    out.push({ size_label: s.code, print_width_mm: w, print_height_mm: h, price_gbp: s.print, is_framed: false, paper_id: 'photo-rag', border: 'small' });
    for (const f of FRAMES)
      out.push({ size_label: `${s.code} framed ${f}`, print_width_mm: w, print_height_mm: h, price_gbp: s.framed, is_framed: true, frame_color: f, mount_board_size: 'none', paper_id: 'photo-rag', border: 'small' });
  }
  return out;
}

if (QUOTE) {
  for (const p of prints) {
    const v = p.creativehub?.variants ?? {};
    for (const [key, id] of Object.entries(v)) {
      const q = await ch('/orders/quote', { method: 'POST', body: JSON.stringify({ items: [{ variant_id: id, quantity: 1 }], delivery_country_code: QUOTE }) });
      console.log(`${p.slug.padEnd(20)} ${key.padEnd(16)} ${q.currency} prod ${q.production_cost}  ship ${q.delivery_cost}  total ${q.total_incl_vat}`);
      await sleep(600);
    }
    break; // one print is enough: costs are per size/frame, not per image
  }
  process.exit(0);
}

if (DRY) {
  console.log('MASTERS_BASE_URL', MASTERS || '(unset)');
  for (const p of prints) console.log(' ', p.slug, p.orientation, `${MASTERS}/${p.slug}.jpg`, p.creativehub ? '(already synced)' : '');
  console.log('example variants', JSON.stringify(variantsFor(prints[0]).slice(0, 2), null, 1));
  process.exit(0);
}
if (!MASTERS) throw new Error('MASTERS_BASE_URL missing');

// ── one drop for the whole shop ──
let drops = (await ch('/drops?limit=50')).drops ?? [];
let drop = drops.find((d) => d.title === 'dylandibona.com');
if (!drop) { drop = await ch('/drops', { method: 'POST', body: JSON.stringify({ title: 'dylandibona.com', create_early_access_page: false }) }); console.log('created drop', drop.id); }
else console.log('drop', drop.id);

// ── the letter insert: one image, every product ──
// Registered once (id cached in scripts/creativehub-insert.json), then set as
// print_insert_id on each product. Re-registering is harmless but litters the
// media library, so the cache matters.
const INSERT_URL = `${MASTERS.replace(/\/masters\/jpg$/, '')}/inserts/letter-insert.png`;
const insertCache = 'scripts/creativehub-insert.json';
let insertId = fs.existsSync(insertCache) ? JSON.parse(fs.readFileSync(insertCache, 'utf8')).id : null;
if (!insertId && !args.includes('--no-insert')) {
  const u = await ch('/uploads/ref', { method: 'POST', body: JSON.stringify({ url: INSERT_URL, image_type: 'letter_insert', name: 'Letter insert' }) });
  insertId = u.id; fs.writeFileSync(insertCache, JSON.stringify({ id: insertId, url: INSERT_URL }, null, 2) + '\n');
  console.log('registered letter insert', insertId);
}

const save = (p, st) => { const j = JSON.parse(fs.readFileSync(p.file, 'utf8')); j.creativehub = st; fs.writeFileSync(p.file, JSON.stringify(j, null, 2) + '\n'); };
for (const p of prints) {
  const st = p.creativehub ?? {};
  if (!st.upload_id) {
    const u = await ch('/uploads/ref', { method: 'POST', body: JSON.stringify({ url: `${MASTERS}/${p.slug}.jpg`, image_type: 'artwork', name: p.title }) });
    st.upload_id = u.id; console.log(p.slug, 'upload', u.id); save(p, st);
  }
  if (!st.product_id) {
    const pr = await ch(`/drops/${drop.id}/products`, { method: 'POST', body: JSON.stringify({ upload_id: st.upload_id, title: p.title, description: p.where ?? '', is_limited_edition: false, coa_type: 0, ...(insertId ? { print_insert_id: insertId } : {}) }) });
    st.product_id = pr.id; st.drop_id = drop.id; console.log(p.slug, 'product', pr.id); save(p, st);
  }
  if (insertId && st.insert_id !== insertId) {
    let ok = false;
    for (const method of ['PATCH', 'PUT']) {
      try { await ch(`/drops/${drop.id}/products/${st.product_id}`, { method, body: JSON.stringify({ print_insert_id: insertId }) }, 1); ok = true; break; }
      catch (e) { if (!/404|405/.test(e.message)) console.warn('  insert attach', method, e.message.slice(0, 120)); }
    }
    if (ok) { st.insert_id = insertId; save(p, st); console.log(p.slug, 'insert attached'); }
    else console.warn(p.slug, 'could not attach insert to existing product (no update endpoint); set via UI or recreate');
  }
  if (args.includes('--no-variants')) continue;
  const res = await ch(`/drops/${drop.id}/products/${st.product_id}/variants`, { method: 'PUT', body: JSON.stringify({ variants: variantsFor(p) }) });
  // the response does not echo size_label, so key by what it does return:
  // dimensions + framed + colour → "S", "S framed black", … matching pricing.ts
  const list = res?.variants ?? res?.data ?? (Array.isArray(res) ? res : []);
  st.variants = {}; st.skus = {}; st.cost = {};
  for (const v of list) {
    const long = Math.max(v.print_width_mm, v.print_height_mm), short = Math.min(v.print_width_mm, v.print_height_mm);
    const size = SIZES.find((s) => Math.max(s.w, s.h) === long && Math.min(s.w, s.h) === short);
    if (!size) { console.warn('  unmatched variant', v.id, v.print_width_mm, v.print_height_mm); continue; }
    const key = v.is_framed ? `${size.code}|${v.frame_color}` : `${size.code}|none`;
    st.variants[key] = v.id; st.skus[key] = v.sku;
    if (v.production_cost != null) st.cost[key] = v.production_cost;
  }
  st.drop_id = drop.id;
  console.log(p.slug, 'variants', Object.keys(st.variants).length);
  const json = JSON.parse(fs.readFileSync(p.file, 'utf8')); json.creativehub = st;
  fs.writeFileSync(p.file, JSON.stringify(json, null, 2) + '\n');
  await sleep(1200);   // 30 writes/min
}
console.log('done. Next: node scripts/creativehub-sync.mjs --quote US');
