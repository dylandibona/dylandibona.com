/* ═══════════════════════════════════════════════════════════
   GRID — CSS transitions on hover, rAF ambient drift at rest
   ═══════════════════════════════════════════════════════════ */

import { startMoodboardMosaic, stopMoodboardMosaic } from './moodboard.js';
import Player from '@vimeo/player';

export function initGrid() {
  const cardArea = document.getElementById('cardArea');
  const cards = [...cardArea.querySelectorAll('.card')];
  const bar = document.getElementById('identityBar');
  let hoverTimeout = null;

  const cardCol = [0, 1, 2, 3, 0, 1, 2, 3];
  const cardRowRange = [
    [0, 6], [0, 5], [0, 6], [0, 7],
    [6, 12], [5, 12], [6, 12], [7, 12],
  ];
  const cardWeights = {
    0: { col: 2.8, rowBoost: 2.4 },
    1: { col: 2.0, rowBoost: 1.8 },
    2: { col: 2.2, rowBoost: 2.0 },
    3: { col: 1.8, rowBoost: 2.6 },
    4: { col: 2.6, rowBoost: 2.2 },
    5: { col: 2.0, rowBoost: 2.4 },
    6: { col: 2.0, rowBoost: 1.6 },
    7: { col: 1.8, rowBoost: 1.4 },
  };

  function jitter(base, range = 0.08) {
    return base * (1 + (Math.random() - 0.5) * range);
  }

  function getTargetCols(activeIdx) {
    if (activeIdx < 0) return [1, 1, 1, 1];
    const cols = [1, 1, 1, 1].map(() => jitter(1, 0.04));
    cols[cardCol[activeIdx]] = jitter((cardWeights[activeIdx] || { col: 2 }).col);
    return cols;
  }

  function getTargetRows(activeIdx) {
    const rows = new Array(12).fill(1).map(() => jitter(1, 0.04));
    if (activeIdx < 0) return rows;
    const [rStart, rEnd] = cardRowRange[activeIdx];
    const boost = (cardWeights[activeIdx] || { rowBoost: 2 }).rowBoost;
    for (let r = rStart; r < rEnd; r++) rows[r] = jitter(boost);
    for (let r = 0; r < 12; r++) {
      if (r < rStart || r >= rEnd) {
        const dist = r < rStart ? (rStart - r) : (r - rEnd + 1);
        rows[r] = jitter(Math.max(0.25, 1 - dist * 0.15));
      }
    }
    return rows;
  }

  /* ── Vimeo player ── */
  let mondayPlayer = null;
  const mondayIframe = document.getElementById('mondayVideo');
  if (mondayIframe) {
    mondayPlayer = new Player(mondayIframe);
  }

  /* ── State ── */
  let activeCardIdx = -1;
  let pinnedCols = null;
  let pinnedRows = null;
  let pendingPinnedHandler = null;

  /* ── Drift ── */
  let driftActive = false;
  let driftRAF = null;
  let pinnedDriftActive = false;
  let pinnedDriftRAF = null;
  const driftStart = performance.now();

  let driftLerpCols = [1, 1, 1, 1];
  let driftLerpRows = new Array(12).fill(1);
  let pinnedLerpCols = null;
  let pinnedLerpRows = null;

  const colDrift = [
    { f1: 0.00031, a1: 0.055, p1: 0,    f2: 0.00071, a2: 0.020, p2: 2.1 },
    { f1: 0.00023, a1: 0.050, p1: 1.8,  f2: 0.00059, a2: 0.018, p2: 4.3 },
    { f1: 0.00027, a1: 0.052, p1: 3.6,  f2: 0.00067, a2: 0.019, p2: 0.7 },
    { f1: 0.00019, a1: 0.045, p1: 5.1,  f2: 0.00053, a2: 0.016, p2: 3.2 },
  ];

  const rowDrift = Array.from({ length: 12 }, (_, i) => {
    const centerDist = Math.abs(i - 5.5) / 5.5;
    const baseAmp = 0.10 - centerDist * 0.03;
    return {
      f1: 0.00015 + i * 0.000031,
      a1: baseAmp,
      p1: i * 0.95 + 0.3,
      f2: 0.00042 + (i % 5) * 0.000019,
      a2: baseAmp * 0.35,
      p2: i * 2.3 + 1.7,
    };
  });

  function driftVal(d, t) {
    return Math.sin(t * d.f1 + d.p1) * d.a1 + Math.sin(t * d.f2 + d.p2) * d.a2;
  }

  const DRIFT_LERP = 0.05;

  function driftLoop(now) {
    if (!driftActive) { driftRAF = null; return; }
    const t = now - driftStart;
    const targetCols = colDrift.map(d => 1 + driftVal(d, t));
    const targetRows = rowDrift.map(d => 1 + driftVal(d, t));
    driftLerpCols = driftLerpCols.map((v, i) => v + (targetCols[i] - v) * DRIFT_LERP);
    driftLerpRows = driftLerpRows.map((v, i) => v + (targetRows[i] - v) * DRIFT_LERP);
    cardArea.style.gridTemplateColumns = driftLerpCols.map(v => v + 'fr').join(' ');
    cardArea.style.gridTemplateRows    = driftLerpRows.map(v => v + 'fr').join(' ');
    driftRAF = requestAnimationFrame(driftLoop);
  }

  function startDrift() {
    driftActive = true;
    cardArea.style.transition = 'none';
    if (!driftRAF) driftRAF = requestAnimationFrame(driftLoop);
  }

  function stopDrift() {
    driftActive = false;
    cardArea.style.transition = '';
  }

  function pinnedDriftLoop(now) {
    if (!pinnedDriftActive || activeCardIdx < 0) { pinnedDriftRAF = null; return; }
    const t = now - driftStart;
    const idx = activeCardIdx;
    const activeCol = cardCol[idx];
    const [rStart, rEnd] = cardRowRange[idx];

    const targetCols = colDrift.map((d, ci) => {
      if (ci === activeCol) return pinnedCols[ci];
      return pinnedCols[ci] + driftVal(d, t) * 0.4;
    });
    const targetRows = rowDrift.map((d, ri) => {
      if (ri >= rStart && ri < rEnd) return pinnedRows[ri];
      return Math.max(0.15, pinnedRows[ri] + driftVal(d, t) * 0.35);
    });

    pinnedLerpCols = pinnedLerpCols.map((v, i) => v + (targetCols[i] - v) * DRIFT_LERP);
    pinnedLerpRows = pinnedLerpRows.map((v, i) => v + (targetRows[i] - v) * DRIFT_LERP);

    cardArea.style.gridTemplateColumns = pinnedLerpCols.map(v => v + 'fr').join(' ');
    cardArea.style.gridTemplateRows    = pinnedLerpRows.map(v => v + 'fr').join(' ');
    pinnedDriftRAF = requestAnimationFrame(pinnedDriftLoop);
  }

  function startPinnedDrift() {
    pinnedLerpCols = [...pinnedCols];
    pinnedLerpRows = [...pinnedRows];
    pinnedDriftActive = true;
    cardArea.style.transition = 'none';
    if (!pinnedDriftRAF) pinnedDriftRAF = requestAnimationFrame(pinnedDriftLoop);
  }

  function stopPinnedDrift() {
    pinnedDriftActive = false;
    if (pinnedDriftRAF) { cancelAnimationFrame(pinnedDriftRAF); pinnedDriftRAF = null; }
    cardArea.style.transition = '';
  }

  /* ── Activate / deactivate ── */
  function activate(card) {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      const idx = cards.indexOf(card);
      const wasIdx = activeCardIdx;
      activeCardIdx = idx;

      stopDrift();

      if (pendingPinnedHandler) {
        cardArea.removeEventListener('transitionend', pendingPinnedHandler);
        pendingPinnedHandler = null;
      }

      if (idx === 2) startMoodboardMosaic();
      if (wasIdx === 2 && idx !== 2) stopMoodboardMosaic();

      if (idx === 5) fetchSpotifyTracks();

      if (idx === 6 && mondayPlayer) {
        mondayPlayer.setCurrentTime(0);
        mondayPlayer.play();
      }
      if (wasIdx === 6 && idx !== 6 && mondayPlayer) mondayPlayer.pause();

      cardArea.classList.remove('collapsing');
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      cardArea.classList.add('has-active');

      pinnedCols = getTargetCols(idx);
      pinnedRows = getTargetRows(idx);

      cardArea.style.gridTemplateColumns = pinnedCols.map(s => s + 'fr').join(' ');
      cardArea.style.gridTemplateRows    = pinnedRows.map(s => s + 'fr').join(' ');

      pendingPinnedHandler = (e) => {
        if (e.propertyName !== 'grid-template-columns') return;
        cardArea.removeEventListener('transitionend', pendingPinnedHandler);
        pendingPinnedHandler = null;
        if (activeCardIdx === idx) startPinnedDrift();
      };
      cardArea.addEventListener('transitionend', pendingPinnedHandler);
    }, 80);
  }

  function deactivate(card) {
    clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      if (document.querySelectorAll('.card:hover').length > 0) return;

      if (pendingPinnedHandler) {
        cardArea.removeEventListener('transitionend', pendingPinnedHandler);
        pendingPinnedHandler = null;
      }

      const wasIdx = activeCardIdx;
      activeCardIdx = -1;
      pinnedCols = null;
      pinnedRows = null;
      stopPinnedDrift();

      if (wasIdx === 2) stopMoodboardMosaic();
      if (wasIdx === 6 && mondayPlayer) mondayPlayer.pause();

      cardArea.classList.add('collapsing');
      cards.forEach(c => c.classList.remove('active'));
      cardArea.classList.remove('has-active');

      cardArea.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
      cardArea.style.gridTemplateRows    = new Array(12).fill('1fr').join(' ');

      setTimeout(() => {
        if (!cardArea.classList.contains('has-active')) {
          driftLerpCols = [1, 1, 1, 1];
          driftLerpRows = new Array(12).fill(1);
          startDrift();
        }
      }, 500);
    }, 50);
  }

  /* ── Wire hover events ── */
  cards.forEach(card => {
    card.addEventListener('mouseenter', () => activate(card));
    card.addEventListener('mouseleave', () => deactivate(card));
  });

  /* ── Click navigation ── */
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (
        e.target.closest('.listen-toggle-btn') ||
        e.target.closest('.ce-list-item') ||
        e.target.closest('.ce-playlist') ||
        e.target.closest('.pd-label-link') ||
        e.target.closest('a') ||
        e.target.closest('input') ||
        e.target.closest('button')
      ) return;
      const href = card.dataset.href;
      if (href) {
        if (href.startsWith('http')) window.open(href, '_blank');
        else location.href = href;
      }
    });
  });

  /* ── Bar hover adjusts card-area bottom + darkens cursor over red ── */
  bar.addEventListener('mouseenter', () => {
    cardArea.classList.add('bar-hovered');
    cursor?.classList.add('dark');
  });
  bar.addEventListener('mouseleave', () => {
    cardArea.classList.remove('bar-hovered');
    cursor?.classList.remove('dark');
  });

  /* ── Listen toggle ── */
  const listenToggle = document.getElementById('listenToggle');
  if (listenToggle) {
    listenToggle.querySelectorAll('.listen-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        listenToggle.querySelectorAll('.listen-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        listenToggle.classList.toggle('playlists', btn.dataset.tab === 'playlists');
        const expand = listenToggle.closest('.card-expand');
        expand.querySelectorAll('.kiosk-panel[data-card="listening"]').forEach(panel => {
          panel.classList.remove('active');
          if (panel.dataset.tab === btn.dataset.tab) panel.classList.add('active');
        });
      });
    });
  }

  /* ── Cocktail ghost ── */
  const cocktailGhost = document.getElementById('cocktailGhost');
  if (cocktailGhost) {
    document.querySelectorAll('#cocktailList .ce-list-item').forEach(item => {
      const imgUrl = item.dataset.photo;
      item.addEventListener('mouseenter', () => {
        if (imgUrl) { cocktailGhost.style.backgroundImage = `url('${imgUrl}')`; cocktailGhost.classList.add('visible'); }
      });
      item.addEventListener('mouseleave', () => cocktailGhost.classList.remove('visible'));
      item.addEventListener('mousemove', (e) => {
        cocktailGhost.style.left = (e.clientX + 24) + 'px';
        cocktailGhost.style.top  = (e.clientY - 120) + 'px';
      });
    });
  }

  /* ── Track ghost ── */
  const trackGhost = document.getElementById('trackGhost');
  if (trackGhost) {
    document.querySelectorAll('#trackList .ce-track').forEach(track => {
      const albumUrl = track.dataset.album;
      track.addEventListener('mouseenter', () => {
        if (albumUrl) { trackGhost.style.backgroundImage = `url('${albumUrl}')`; trackGhost.classList.add('visible'); }
      });
      track.addEventListener('mouseleave', () => trackGhost.classList.remove('visible'));
      track.addEventListener('mousemove', (e) => {
        trackGhost.style.left = (e.clientX + 20) + 'px';
        trackGhost.style.top  = (e.clientY - 80) + 'px';
      });
    });
  }

  /* ── Custom cursor ── */
  const cursor = document.getElementById('cursor');
  if (cursor) {
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    });
  }

  /* ── Photography slideshow ── */
  const gallery = document.getElementById('photoGallery');
  if (gallery) {
    const slides  = [...gallery.querySelectorAll('.pg-slide')];
    const caption = document.getElementById('pgCaption');
    let current = 0;
    slides[0]?.classList.add('active');
    if (caption && slides[0]) caption.textContent = slides[0].dataset.title || '';
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
      if (caption) caption.textContent = slides[current].dataset.title || '';
    }, 4000);
  }

  /* ── Spotify live tracks ── */
  let spotifyFetched = false;

  function fetchSpotifyTracks() {
    if (spotifyFetched) return;
    spotifyFetched = true;

    const trackList = document.getElementById('trackList');
    if (!trackList) return;

    fetch('/api/spotify')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(({ tracks }) => {
        if (!tracks?.length) return;
        trackList.innerHTML = tracks.map((t, i) => `
          <a class="ce-track" href="${t.spotifyUrl}" target="_blank"
             data-album="${t.albumArt ?? ''}">
            <span class="ce-track-num">${String(i + 1).padStart(2, '0')}</span>
            <span class="ce-track-title">${t.title}</span>
            <span class="ce-track-artist">${t.artist}</span>
          </a>
        `).join('');

        // Re-attach track ghost listeners to new elements
        const trackGhost = document.getElementById('trackGhost');
        if (trackGhost) {
          trackList.querySelectorAll('.ce-track').forEach(track => {
            const albumUrl = track.dataset.album;
            track.addEventListener('mouseenter', () => {
              if (albumUrl) { trackGhost.style.backgroundImage = `url('${albumUrl}')`; trackGhost.classList.add('visible'); }
            });
            track.addEventListener('mouseleave', () => trackGhost.classList.remove('visible'));
            track.addEventListener('mousemove', (e) => {
              trackGhost.style.left = (e.clientX + 20) + 'px';
              trackGhost.style.top  = (e.clientY - 80) + 'px';
            });
          });
        }
      })
      .catch(() => {}); // silently keep static fallback on error
  }

  /* ── Boot ── */
  startDrift();
}
