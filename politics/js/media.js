/* Cabinet Clash — portraits (Wikipedia thumbnails, cached) and sound effects. */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});

  /* ---------- portraits ---------- */
  const KEY = 'cc-img-v2'; // v2: 480 px thumbnails
  const Img = { cache: {}, pending: new Set(), onUpdate: null };
  try { Img.cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { Img.cache = {}; }
  try { localStorage.removeItem('cc-img-v1'); } catch (e) { /* old, smaller thumbnails */ }

  Img.get = (f) => Img.cache[f.w] || null;

  // One request per 50 titles: the MediaWiki API returns each page's lead image.
  Img.prefetch = async function (pols) {
    const titles = [...new Set(pols.map((f) => f.w))].filter((t) => !(t in Img.cache) && !Img.pending.has(t));
    for (let i = 0; i < titles.length; i += 50) {
      const chunk = titles.slice(i, i + 50);
      chunk.forEach((t) => Img.pending.add(t));
      try {
        const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1' +
          '&prop=pageimages&piprop=thumbnail&pithumbsize=480&titles=' + encodeURIComponent(chunk.join('|'));
        const q = (await (await fetch(url)).json()).query || {};
        const map = {};
        (q.normalized || []).forEach((n) => (map[n.from] = n.to));
        (q.redirects || []).forEach((r) => (map[r.from] = r.to));
        const thumbs = {};
        (q.pages || []).forEach((p) => (thumbs[p.title] = p.thumbnail ? p.thumbnail.source : ''));
        chunk.forEach((t) => {
          let k = t;
          for (let n = 0; n < 3 && map[k]; n++) k = map[k];
          Img.cache[t] = thumbs[k] || '';
        });
        try { localStorage.setItem(KEY, JSON.stringify(Img.cache)); } catch (e) { /* storage full or blocked */ }
        if (Img.onUpdate) Img.onUpdate();
      } catch (e) {
        /* offline: initials avatars stay in place */
      } finally {
        chunk.forEach((t) => Img.pending.delete(t));
      }
    }
  };
  CC.Img = Img;

  /* ---------- sound ---------- */
  const Sound = { muted: false, ctx: null };
  try { Sound.muted = localStorage.getItem('cc-mute') === '1'; } catch (e) { /* default on */ }
  function ac() {
    if (!Sound.ctx) { try { Sound.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (Sound.ctx.state === 'suspended') Sound.ctx.resume();
    return Sound.ctx;
  }
  function tone(freq, dur, type, vol, delay, slide) {
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  const FX = {
    bid: () => { tone(660, 0.09, 'triangle', 0.12); tone(990, 0.12, 'triangle', 0.1, 0.06); },
    tick: () => tone(1200, 0.05, 'square', 0.04),
    gavel: () => { tone(180, 0.18, 'square', 0.18, 0, 90); tone(140, 0.25, 'square', 0.16, 0.16, 70); },
    thud: () => tone(220, 0.3, 'sawtooth', 0.08, 0, 110),
    reveal: () => tone(520, 0.14, 'triangle', 0.1, 0, 780),
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11)),
  };
  Sound.play = (name) => { if (!Sound.muted && FX[name]) FX[name](); };
  Sound.toggle = () => {
    Sound.muted = !Sound.muted;
    try { localStorage.setItem('cc-mute', Sound.muted ? '1' : '0'); } catch (e) { /* ignore */ }
  };
  CC.Sound = Sound;
})();
