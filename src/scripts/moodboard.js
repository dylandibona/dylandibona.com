/* ═══════════════════════════════════════════════════════════
   MOODBOARD — shuffled crossfade slideshow
   Two slides with z-index swap: incoming fades in ON TOP of
   outgoing (which stays fully opaque), so opacity never dips.
   ═══════════════════════════════════════════════════════════ */

let moodImages = [];
let slides = [];
let shuffled = [];
let shuffleIdx = 0;
let slideInterval = null;
let cleanupTimeout = null;
let current = 0;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextImage() {
  if (shuffleIdx >= shuffled.length) {
    shuffled = shuffle(moodImages);
    shuffleIdx = 0;
  }
  return shuffled[shuffleIdx++];
}

export function initMoodboard() {
  const el = document.getElementById('moodboardMosaic');
  if (!el) return;

  try {
    const parsed = JSON.parse(el.dataset.images || '[]');
    if (parsed.length > 0) moodImages = parsed;
  } catch (e) {}

  for (let i = 0; i < 2; i++) {
    const div = document.createElement('div');
    div.className = 'mood-slide';
    el.appendChild(div);
    slides.push(div);
  }
}

function crossfade() {
  const next = 1 - current;
  const incoming = slides[next];
  const outgoing = slides[current];

  // Load new image on incoming slide, place it on top but invisible
  incoming.style.backgroundImage = `url('${nextImage()}')`;
  incoming.style.zIndex = '2';
  incoming.style.transition = 'none';
  incoming.style.opacity = '0';
  outgoing.style.zIndex = '1'; // outgoing stays fully opaque underneath

  // Force reflow so the 'none' transition registers before we re-enable it
  incoming.offsetHeight; // eslint-disable-line no-unused-expressions

  // Fade incoming in
  incoming.style.transition = 'opacity 1.8s ease';
  incoming.style.opacity = '1';

  // Once fully in, silently reset outgoing (it's hidden behind incoming)
  cleanupTimeout = setTimeout(() => {
    outgoing.style.transition = 'none';
    outgoing.style.opacity = '0';
    current = next;
    cleanupTimeout = null;
  }, 1900);
}

export function startMoodboardMosaic() {
  if (slideInterval || moodImages.length === 0) return;

  shuffled = shuffle(moodImages);
  shuffleIdx = 0;
  current = 0;

  // Show first image immediately, no transition
  slides[0].style.backgroundImage = `url('${nextImage()}')`;
  slides[0].style.transition = 'none';
  slides[0].style.opacity = '1';
  slides[0].style.zIndex = '2';
  slides[1].style.opacity = '0';
  slides[1].style.zIndex = '1';

  slideInterval = setInterval(crossfade, 4500);
}

export function stopMoodboardMosaic() {
  clearInterval(slideInterval);
  clearTimeout(cleanupTimeout);
  slideInterval = null;
  cleanupTimeout = null;
  slides.forEach(s => {
    s.style.transition = 'none';
    s.style.opacity = '0';
  });
  current = 0;
}
