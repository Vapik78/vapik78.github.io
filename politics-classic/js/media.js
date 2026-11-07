/* Cabinet Clash — portraits (Wikipedia thumbnails, cached) and sound effects. */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});

  /* ---------- portraits ---------- */
  const KEY = 'cc-img-v2'; // v2: 480 px thumbnails
  const Img = { cache: {}, pending: new Set(), onUpdate: null };
  try { Img.cache = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { Img.cache = {}; }
  try { localStorage.removeItem('cc-img-v1'); } catch (e) { /* old, smaller thumbnails */ }

  // Data saving mode: no portraits are downloaded; cards show initials instead.
  try { Img.saver = localStorage.getItem('cc-saver') === '1'; } catch (e) { Img.saver = false; }
  Img.get = (f) => (Img.saver ? null : Img.cache[f.w] || null);
  const missed = new Set(); // pages without a lead image this session; never stored, so a later visit retries
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Wikipedia rate-limits bursts (HTTP 429), so batches go one at a time, and a
  // refused batch waits as long as Wikipedia asks, then tries again.
  async function lookup(chunk) {
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1' +
      '&prop=pageimages&piprop=thumbnail&pithumbsize=480&titles=' + encodeURIComponent(chunk.join('|'));
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(url);
      if (res.ok) return (await res.json()).query || {};
      if (res.status !== 429 && res.status < 500) break;
      await sleep(1000 * (+res.headers.get('retry-after') || 2 ** (attempt + 1)));
    }
    throw new Error('Wikipedia lookup failed');
  }
  let queue = Promise.resolve();
  // One request per 50 titles: the MediaWiki API returns each page's lead image.
  Img.prefetch = function (pols) {
    if (Img.saver) return Promise.resolve();
    const titles = [...new Set(pols.map((f) => f.w))].filter((t) => !(t in Img.cache) && !Img.pending.has(t) && !missed.has(t));
    titles.forEach((t) => Img.pending.add(t));
    for (let i = 0; i < titles.length; i += 50) {
      const chunk = titles.slice(i, i + 50);
      queue = queue.then(async () => {
        try {
          const q = await lookup(chunk);
          const map = {};
          (q.normalized || []).forEach((n) => (map[n.from] = n.to));
          (q.redirects || []).forEach((r) => (map[r.from] = r.to));
          const thumbs = {};
          (q.pages || []).forEach((p) => { if (p.thumbnail) thumbs[p.title] = p.thumbnail.source; });
          chunk.forEach((t) => {
            let k = t;
            for (let n = 0; n < 3 && map[k]; n++) k = map[k];
            if (thumbs[k]) Img.cache[t] = thumbs[k];
            else missed.add(t);
          });
          try { localStorage.setItem(KEY, JSON.stringify(Img.cache)); } catch (e) { /* storage full or blocked */ }
          if (Img.onUpdate) Img.onUpdate();
        } catch (e) {
          /* offline or still refused: initials stay, and the next view asks again */
        } finally {
          chunk.forEach((t) => Img.pending.delete(t));
        }
        await sleep(300);
      });
    }
    return queue;
  };
  // Cards ask for their own photo; requests are gathered and sent shortly after.
  let wanted = [], wantTimer = null;
  Img.want = (f) => {
    if (Img.saver || f.w in Img.cache || Img.pending.has(f.w) || missed.has(f.w)) return;
    wanted.push(f);
    clearTimeout(wantTimer);
    wantTimer = setTimeout(() => { const list = wanted; wanted = []; Img.prefetch(list); }, 250);
  };
  // Old caches could hold "" for photos that failed once; drop those so they are fetched again.
  Object.keys(Img.cache).forEach((t) => { if (!Img.cache[t]) delete Img.cache[t]; });
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
