/**
 * Real retail prices, taken from the existing creativehub product setup.
 * In cents, USD. These are the numbers already live on Dylan's account, not estimates.
 *
 * Framed is the default because someone buying a photograph does not then want to
 * go and find a framer. Print-only exists because a rolled tube ships anywhere
 * cheaply and safely, and a framed 70×100 does not.
 *
 * 70×100 is the largest size available. theprintspace caps framed drop-ship at
 * 40" × 30" (101 × 76cm); anything larger needs customer collection or a custom
 * shipping arrangement, so it cannot be a product on the site.
 */
export type FrameCode = 'black' | 'white' | 'oak' | 'none';

export const FRAMES: { code: FrameCode; label: string }[] = [
  { code: 'black', label: 'Black' },
  { code: 'white', label: 'White' },
  { code: 'oak',   label: 'Oak' },
  { code: 'none',  label: 'No frame' },
];
export const DEFAULT_FRAME: FrameCode = 'black';

export type Size = {
  code: string;
  /** dimensions only — the unit is appended by the UI, which shows one at a time */
  /** dimensions only, no unit — the UI appends it */
  cm: string;
  inches: string;
  /** short side, long side, in mm; the catalogue sync swaps for landscape */
  mm: [number, number];
  framed: number;   // cents, same price in all three frame colours
  print: number;    // cents, unframed
};

// Priced for how the number reads, not for margin. At this volume the difference
// between $550 and $760 on a couple of sales a year is not money — but a print
// under about $50 reads as a poster shop, which is the wrong signal entirely.
// The framing premium came down most; $280 → $760 on the large was a store markup.
// PROVISIONAL until theprintspace confirm actual cost per size.
export const SIZES: Size[] = [
  // These are creativehub's stocked frame sizes (A3, A2, 70×100). Frames exist only
  // in these, so the sheet sizes match exactly; mm in the catalogue sync must agree.
  { code: 'S', cm: '29.7 × 42',  inches: '11.7 × 16.5', mm: [297, 420],   framed: 15000, print:  6500 },
  { code: 'M', cm: '42 × 59.4',  inches: '16.5 × 23.4', mm: [420, 594],   framed: 21500, print: 10500 },
  { code: 'L', cm: '70 × 100',   inches: '27.6 × 39.4', mm: [700, 1000],  framed: 55000, print: 22500 },
];
export const DEFAULT_SIZE = 1; // the middle one

export const priceOf = (size: Size, frame: FrameCode) =>
  frame === 'none' ? size.print : size.framed;

export const money = (cents: number) =>
  '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 });

export const PRINT_NOTE =
  'Giclée on Hahnemühle Photo Rag, made to order by hand at theprintspace in London. ' +
  'Sizes are the full sheet, printed border included.';

export const FRAMED_NOTE = 'Framed prints ship ready to hang.';
export const PRINT_ONLY_NOTE = 'Unframed prints ship rolled in a tube.';
