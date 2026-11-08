/* Cabinet Clash — rules engine and AI rivals.
   The engine only ever runs on one device (the "host"): solo, pass & play, or
   whoever created an online room. Everyone else just renders the state the host
   broadcasts, so the state is plain JSON. */
(function () {
  'use strict';
  const D = window.CC_DATA;
  const CC = (window.CC = window.CC || {});

  const SEATS = [
    { k: 'L', name: 'Leader', short: 'Lead', icon: '🏛️' },
    { k: 'E', name: 'Economy', short: 'Econ', icon: '💰' },
    { k: 'F', name: 'Foreign Affairs', short: 'Foreign', icon: '🌐' },
    { k: 'I', name: 'Interior', short: 'Interior', icon: '🛡️' },
    { k: 'J', name: 'Justice', short: 'Justice', icon: '⚖️' },
  ];
  const SK = SEATS.map((s) => s.k);

  // Each crisis tests two seats (the same seat twice = a double test).
  const CRISES = [
    { n: 'Stock market crash', i: '📉', s: ['E', 'E'] },
    { n: 'Border standoff', i: '🚧', s: ['I', 'F'] },
    { n: 'Superpower summit', i: '🤝', s: ['F', 'L'] },
    { n: 'General strike', i: '✊', s: ['E', 'I'] },
    { n: 'Corruption scandal', i: '🕵️', s: ['J', 'L'] },
    { n: 'Pandemic outbreak', i: '🦠', s: ['I', 'E'] },
    { n: 'Energy crisis', i: '⚡', s: ['E', 'F'] },
    { n: 'Cyberattack', i: '💻', s: ['I', 'J'] },
    { n: 'Refugee crisis', i: '⛺', s: ['I', 'F'] },
    { n: 'Snap election', i: '🗳️', s: ['L', 'L'] },
    { n: 'Trade war', i: '🚢', s: ['E', 'L'] },
    { n: 'Earthquake', i: '🌋', s: ['I', 'L'] },
    { n: 'Spy scandal', i: '🕶️', s: ['I', 'J'] },
    { n: 'Inflation spike', i: '🛒', s: ['E', 'L'] },
    { n: 'Peace talks', i: '🕊️', s: ['F', 'F'] },
    { n: 'Coup rumours', i: '🎖️', s: ['I', 'L'] },
    { n: 'Supreme Court showdown', i: '🏛️', s: ['J', 'J'] },
    { n: 'Tax evasion scandal', i: '🧾', s: ['E', 'J'] },
    { n: 'Viral fake news', i: '📱', s: ['L', 'J'] },
    { n: 'Debt default', i: '🏦', s: ['E', 'F'] },
    { n: 'Embassy incident', i: '🚩', s: ['F', 'I'] },
    { n: 'Hostage crisis', i: '🚨', s: ['F', 'I'] },
    { n: 'Prison riot', i: '🔒', s: ['J', 'I'] },
    { n: 'Olympics bid', i: '🏅', s: ['L', 'F'] },
  ];

  const MODES = [
    { k: 'legends', name: 'Legends', icon: '🌟', desc: 'Only the most famous politicians in history.' },
    { k: 'world', name: 'World Stage', icon: '🌍', desc: 'Politicians from every corner of the planet.' },
    { k: 'countries', name: 'Pick Countries', icon: '🏳️', desc: 'Mix the nations you want.' },
    { k: 'continents', name: 'Continents', icon: '🗺️', desc: 'One continent or a few.' },
    { k: 'modern', name: 'Modern World', icon: '📱', desc: 'Leaders active in the 21st century.' },
    { k: 'history', name: 'History Books', icon: '📜', desc: 'Statesmen from before the year 2000.' },
  ];
  const ERAS = { h: 'Before 1945', c: '1945–1999', m: '21st century' };
  const FAME = { 1: 'Famous only', 2: 'Well known', 3: 'Everyone' };

  const PERSONAS = [
    { k: 'hawk', name: 'The Hawk', fav: 'I', aggr: 1.05 },
    { k: 'tycoon', name: 'The Tycoon', fav: 'E', aggr: 1.15 },
    { k: 'diplomat', name: 'The Diplomat', fav: 'F', aggr: 0.95 },
    { k: 'populist', name: 'The Populist', fav: 'L', aggr: 1.1, fame: true },
    { k: 'sheriff', name: 'The Sheriff', fav: 'J', aggr: 1.0 },
    { k: 'technocrat', name: 'The Technocrat', fav: null, aggr: 0.9 },
    { k: 'kingmaker', name: 'The Kingmaker', fav: 'L', aggr: 1.0 },
  ];
  const COLORS = ['#d1495b', '#2f6fde', '#139a74', '#e0a10b', '#8a4fd1', '#e3702b', '#1fa3b8', '#c2417e'];
  const MAXP = 8;
  const BASE = { 1: 7, 2: 5, 3: 3 };
  const CRISIS_MS = 5500; // each crisis stays on screen this long (its scores flip in after a pause)
  const FIT = 4;

  const DEFAULTS = {
    mode: 'legends', countries: ['US', 'GB', 'FR', 'DE', 'IT'], continents: ['Europe'], fame: 3,
    budget: 20, timer: 8, discards: 5, judge: 'crisis', rounds: 'all', hints: 0,
  };

  const rand = (n) => Math.floor(Math.random() * n);
  const pol = (i) => D.POLS[i];
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 18);

  /* ---------- scoring ---------- */
  function seatScore(fi, k) {
    const f = pol(fi);
    return f ? BASE[f.t] + (f.tags.includes(k) ? FIT : 0) : 0;
  }
  function chemistry(seats) {
    const fs = seats.filter((x) => x != null).map(pol);
    const out = [];
    if (fs.length < 3) return out;
    const byC = {};
    fs.forEach((f) => (byC[f.c] = (byC[f.c] || 0) + 1));
    const [topC, n] = Object.entries(byC).sort((a, b) => b[1] - a[1])[0];
    if (n >= 3) out.push({ k: 'home', label: `${D.COUNTRIES[topC].name} united`, v: n - 1 });
    const conts = new Set(fs.map((f) => D.COUNTRIES[f.c].cont)).size;
    if (conts >= 4) out.push({ k: 'global', label: 'Global coalition', v: conts - 2 });
    if (fs.length === 5 && new Set(fs.map((f) => f.e)).size === 1) out.push({ k: 'era', label: 'Era dream team', v: 2 });
    const fits = seats.filter((x, i) => x != null && pol(x).tags.includes(SK[i])).length;
    if (fits === 5) out.push({ k: 'fit', label: 'Perfect fit', v: 3 });
    return out;
  }
  const chemTotal = (seats) => chemistry(seats).reduce((s, c) => s + c.v, 0);
  const power = (seats) => seats.reduce((s, x, i) => s + (x == null ? 0 : seatScore(x, SK[i])), 0) + chemTotal(seats);

  /* ---------- deck ---------- */
  function poolFor(st) {
    return D.POLS.filter((f) => {
      const famous = f.t <= st.fame;
      switch (st.mode) {
        case 'legends': return f.t === 1;
        case 'world': return famous;
        case 'countries': return famous && st.countries.includes(f.c);
        case 'continents': return famous && st.continents.includes(D.COUNTRIES[f.c].cont);
        case 'modern': return famous && f.e === 'm';
        case 'history': return famous && f.e !== 'm';
        default: return false;
      }
    }).map((f) => f.i);
  }
  const minPool = (S) => Math.max(2, S.players.length) * 5 + 2;

  /* ---------- players ---------- */
  function newState(kind) {
    return {
      kind, v: 0, seq: 0, phase: 'lobby', settings: Object.assign({}, DEFAULTS),
      players: [], teams: {}, scores: {}, rec: {},
      deck: [], discardPile: [], lot: 0, discUsed: 0, noDisc: false,
      cur: null, bid: null, passed: [], hist: [], deadline: 0, dur: 0, sold: null, log: [],
      duels: [], di: -1, step: 0, ready: [], votes: {}, pundit: null,
    };
  }
  function addPlayer(S, o) {
    const used = new Set(S.players.map((p) => p.color));
    const color = COLORS.find((c) => !used.has(c)) || COLORS[S.players.length % COLORS.length];
    const p = { id: 'p' + ++S.seq, name: clean(o.name) || 'Player', color, bot: o.bot || null, persona: o.persona || null, off: false };
    S.players.push(p);
    return p;
  }
  function addBot(S, level) {
    const used = S.players.map((p) => p.persona);
    const per = PERSONAS.find((x) => !used.includes(x.k)) || PERSONAS[rand(PERSONAS.length)];
    let name = per.name;
    for (let n = 2; S.players.some((p) => p.name === name); n++) name = per.name + ' ' + n;
    return addPlayer(S, { name, bot: level || 'normal', persona: per.k });
  }
  const player = (S, id) => S.players.find((p) => p.id === id);
  const isBot = (S, id) => !!(player(S, id) || {}).bot;
  const free = (S, id) => S.teams[id].seats.filter((x) => x == null).length;
  function maxBid(S, id) {
    const t = S.teams[id], f = free(S, id);
    return f ? t.cr - (f - 1) : 0; // always keep 1 credit per empty seat
  }
  function canStart(S) {
    if (S.players.length < 2) return 'Add at least one more player or AI rival.';
    const n = poolFor(S.settings).length, need = minPool(S);
    if (n < need) return `Only ${n} politicians in this deck — ${S.players.length} players need ${need}. Add countries or widen the fame filter.`;
    return '';
  }

  /* ---------- game flow ---------- */
  function start(S, now) {
    if (S.kind === 'solo') S.settings.judge = 'crisis';
    S.deck = shuffle(poolFor(S.settings));
    Object.assign(S, { discardPile: [], lot: 0, discUsed: 0, noDisc: false, log: [], duels: [], di: -1, pundit: null });
    S.teams = {}; S.scores = {}; S.rec = {};
    S.players.forEach((p) => {
      S.teams[p.id] = { cr: S.settings.budget, seats: [null, null, null, null, null], buys: [] };
      S.scores[p.id] = 0;
      S.rec[p.id] = { w: 0, d: 0, l: 0, cw: 0 };
    });
    nextLot(S, now);
  }
  function setDeadline(S, now, ms) { S.deadline = now + ms; S.dur = ms; }

  function nextLot(S, now) {
    S.bid = null; S.passed = []; S.hist = []; S.sold = null;
    if (!S.players.some((p) => free(S, p.id) > 0)) {
      S.phase = 'cabinets'; S.cur = null; S.deadline = 0;
      return;
    }
    if (!S.deck.length) {
      // Out of fresh faces: the discards come back and nobody gets to skip any more.
      S.deck = shuffle(S.discardPile); S.discardPile = []; S.noDisc = true;
      if (!S.deck.length) { S.phase = 'cabinets'; S.cur = null; S.deadline = 0; return; }
    }
    S.cur = S.deck.pop();
    S.lot++;
    S.phase = 'auction';
    setDeadline(S, now, (S.settings.timer + 4) * 1000);
  }
  function contenders(S) {
    const cur = S.bid ? S.bid.v : 0, lead = S.bid && S.bid.by;
    return S.players.filter((p) => p.id !== lead && free(S, p.id) > 0 && !S.passed.includes(p.id) && maxBid(S, p.id) > cur);
  }
  function maybeCloseEarly(S, now) {
    if (!contenders(S).length) S.deadline = Math.min(S.deadline, now + 900);
  }
  function resolveLot(S, now) {
    if (S.bid) {
      S.teams[S.bid.by].cr -= S.bid.v;
      S.sold = { f: S.cur, by: S.bid.by, v: S.bid.v, rnd: false, seat: null };
      S.phase = 'assign';
      setDeadline(S, now, 20000);
      return;
    }
    const lim = S.settings.discards;
    if (!S.noDisc && (lim < 0 || S.discUsed < lim)) {
      S.discUsed++;
      S.discardPile.push(S.cur);
      S.sold = { f: S.cur, by: null };
      S.phase = 'sold';
      setDeadline(S, now, 2200);
      return;
    }
    const cands = S.players.filter((p) => free(S, p.id) > 0);
    const p = cands[rand(cands.length)];
    S.teams[p.id].cr -= 1;
    S.sold = { f: S.cur, by: p.id, v: 1, rnd: true, seat: null };
    S.phase = 'assign';
    setDeadline(S, now, 20000);
  }
  function bestSeat(S, id, fi) {
    const t = S.teams[id];
    let best = -1, bs = -1;
    t.seats.forEach((x, i) => {
      if (x != null) return;
      const s = seatScore(fi, SK[i]);
      if (s > bs) { bs = s; best = i; }
    });
    return best;
  }
  function place(S, seat, now) {
    const s = S.sold, t = S.teams[s.by];
    if (seat < 0 || t.seats[seat] != null) seat = bestSeat(S, s.by, s.f);
    t.seats[seat] = s.f;
    t.buys.push({ f: s.f, v: s.v, seat, rnd: !!s.rnd });
    s.seat = seat;
    S.log.unshift({ f: s.f, by: s.by, v: s.v, seat, rnd: !!s.rnd });
    S.log = S.log.slice(0, 8);
    S.phase = 'sold';
    setDeadline(S, now, 2600);
  }

  /* ---------- showdown ---------- */
  function roundRobin(ids) {
    const a = ids.slice();
    if (a.length % 2) a.push(null);
    const n = a.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const round = [];
      for (let i = 0; i < n / 2; i++) {
        const x = a[i], y = a[n - 1 - i];
        if (x && y) round.push(r % 2 ? [y, x] : [x, y]);
      }
      rounds.push(round);
      a.splice(1, 0, a.pop());
    }
    return rounds;
  }
  function simulateDuel(S, a, b) {
    const picks = shuffle(CRISES.map((_, i) => i)).slice(0, 3);
    const chA = chemTotal(S.teams[a].seats), chB = chemTotal(S.teams[b].seats);
    const side = (id, cr, ch) => {
      const seats = S.teams[id].seats;
      const parts = cr.s.map((k) => { const f = seats[SK.indexOf(k)]; return { k, f, v: seatScore(f, k) }; });
      const roll = 1 + rand(6);
      return { parts, ch, roll, tot: parts.reduce((s, p) => s + p.v, 0) + ch + roll };
    };
    const crises = picks.map((ci) => {
      const cr = CRISES[ci], A = side(a, cr, chA), B = side(b, cr, chB);
      return { ci, A, B, w: A.tot > B.tot ? 'a' : B.tot > A.tot ? 'b' : 't' };
    });
    const wa = crises.filter((c) => c.w === 'a').length, wb = crises.filter((c) => c.w === 'b').length;
    return { crises, wa, wb, w: wa > wb ? 'a' : wb > wa ? 'b' : 't' };
  }
  function startShowdown(S, now) {
    let rounds = roundRobin(S.players.map((p) => p.id));
    if (S.settings.rounds === 'quick') rounds = rounds.slice(0, 3);
    S.duels = [].concat(...rounds).map(([a, b]) => ({ a, b, r: null, w: null }));
    if (S.settings.judge === 'crisis') S.duels.forEach((d) => (d.r = simulateDuel(S, d.a, d.b)));
    S.di = -1;
    nextDuel(S, now);
  }
  function applyResult(S, d, w) {
    d.w = w;
    const A = S.rec[d.a], B = S.rec[d.b];
    if (w === 'a') { S.scores[d.a] += 3; A.w++; B.l++; }
    else if (w === 'b') { S.scores[d.b] += 3; B.w++; A.l++; }
    else { S.scores[d.a]++; S.scores[d.b]++; A.d++; B.d++; }
    if (d.r && d.r.crises) { A.cw += d.r.wa; B.cw += d.r.wb; }
  }
  function nextDuel(S, now) {
    for (;;) {
      S.di++;
      if (S.di >= S.duels.length) { S.phase = 'final'; S.deadline = 0; return; }
      const d = S.duels[S.di];
      const botsOnly = isBot(S, d.a) && isBot(S, d.b);
      if (S.settings.judge === 'crisis') {
        if (botsOnly) { applyResult(S, d, d.r.w); continue; }
        S.phase = 'duel'; S.step = 0;
        setDeadline(S, now, 3000);
        return;
      }
      if (botsOnly) { d.r = { votes: {} }; applyResult(S, d, botJudge(S, d)); continue; }
      S.phase = 'debate'; S.ready = []; S.votes = {}; S.deadline = 0;
      return;
    }
  }
  function finishDuel(S, now) {
    const d = S.duels[S.di];
    applyResult(S, d, d.r.w);
    S.phase = 'duelres';
    setDeadline(S, now, 14000);
  }
  function voters(S) {
    const d = S.duels[S.di];
    if (!d) return [];
    const others = S.players.filter((p) => p.id !== d.a && p.id !== d.b);
    return (others.length ? others : S.players).filter((p) => !p.off).map((p) => p.id);
  }
  function startVote(S) { S.phase = 'vote'; S.votes = {}; S.deadline = 0; }
  function finishVote(S, now, forced) {
    const d = S.duels[S.di];
    let w = forced;
    if (!w) {
      const vs = Object.values(S.votes);
      const a = vs.filter((x) => x === 'a').length, b = vs.filter((x) => x === 'b').length;
      w = a > b ? 'a' : b > a ? 'b' : 't';
    }
    d.r = { votes: Object.assign({}, S.votes) };
    applyResult(S, d, w);
    S.phase = 'duelres';
    setDeadline(S, now, 14000);
  }
  function botJudge(S, d) {
    const pa = power(S.teams[d.a].seats) + Math.random() * 8, pb = power(S.teams[d.b].seats) + Math.random() * 8;
    return pa >= pb ? 'a' : 'b';
  }

  /* ---------- actions ---------- */
  const ADMIN = new Set(['set', 'addBot', 'addHuman', 'remove', 'rename', 'botLevel', 'start', 'next', 'skip', 'gvote', 'again']);
  function sanitize(patch) {
    const o = {};
    if (MODES.some((m) => m.k === patch.mode)) o.mode = patch.mode;
    if (Array.isArray(patch.countries)) o.countries = patch.countries.filter((c) => D.COUNTRIES[c]);
    if (Array.isArray(patch.continents)) o.continents = patch.continents.filter((c) => D.CONTINENTS.includes(c));
    if ([1, 2, 3].includes(patch.fame)) o.fame = patch.fame;
    if ([15, 20, 30].includes(patch.budget)) o.budget = patch.budget;
    if ([5, 8, 12].includes(patch.timer)) o.timer = patch.timer;
    if ([-1, 0, 3, 5, 10].includes(patch.discards)) o.discards = patch.discards;
    if (['crisis', 'vote'].includes(patch.judge)) o.judge = patch.judge;
    if (['all', 'quick'].includes(patch.rounds)) o.rounds = patch.rounds;
    if ([0, 1].includes(patch.hints)) o.hints = patch.hints;
    return o;
  }

  function act(S, pid, a, now) {
    const lobby = S.phase === 'lobby';
    switch (a.t) {
      case 'set':
        if (!lobby) return false;
        Object.assign(S.settings, sanitize(a.patch || {}));
        if (S.kind === 'solo') S.settings.judge = 'crisis';
        return true;
      case 'addBot':
        if (!lobby || S.players.length >= MAXP) return false;
        addBot(S, a.level);
        return true;
      case 'addHuman':
        if (!lobby || S.players.length >= MAXP) return false;
        addPlayer(S, { name: a.name || 'Player ' + (S.players.filter((p) => !p.bot).length + 1) });
        return true;
      case 'remove':
        if (!lobby || a.id === pid) return false;
        S.players = S.players.filter((p) => p.id !== a.id);
        return true;
      case 'rename': {
        const p = player(S, a.id);
        if (!lobby || !p || !clean(a.name)) return false;
        p.name = clean(a.name);
        return true;
      }
      case 'botLevel': {
        const p = player(S, a.id), order = ['easy', 'normal', 'hard'];
        if (!lobby || !p || !p.bot) return false;
        p.bot = order[(order.indexOf(p.bot) + 1) % 3];
        return true;
      }
      case 'start':
        if (!lobby || canStart(S)) return false;
        start(S, now);
        return true;
      case 'bid': {
        if (S.phase !== 'auction' || !S.teams[pid] || free(S, pid) === 0 || S.passed.includes(pid)) return false;
        if (S.bid && S.bid.by === pid) return false;
        const cur = S.bid ? S.bid.v : 0;
        const v = Math.min(Math.floor(+a.v), maxBid(S, pid));
        if (!(v > cur)) return false;
        S.bid = { v, by: pid };
        S.hist.push([pid, v]);
        setDeadline(S, now, S.settings.timer * 1000);
        maybeCloseEarly(S, now);
        return true;
      }
      case 'pass':
        if (S.phase !== 'auction' || !S.teams[pid] || S.passed.includes(pid) || (S.bid && S.bid.by === pid)) return false;
        S.passed.push(pid);
        maybeCloseEarly(S, now);
        return true;
      case 'seat':
        if (S.phase !== 'assign' || S.sold.by !== pid) return false;
        if (S.teams[pid].seats[a.seat] !== null) return false;
        place(S, a.seat, now);
        return true;
      case 'next':
        if (S.phase === 'cabinets') { S.phase = 'briefing'; S.deadline = 0; return true; } // explain the rules first
        if (S.phase === 'briefing') { startShowdown(S, now); return true; }
        if (S.phase === 'duel') { S.step = 3; finishDuel(S, now); return true; }
        if (S.phase === 'duelres') { nextDuel(S, now); return true; }
        return false;
      case 'ready':
        if (S.phase !== 'debate' || S.ready.includes(pid)) return false;
        S.ready.push(pid);
        if (S.players.filter((p) => !p.off).every((p) => S.ready.includes(p.id))) startVote(S);
        return true;
      case 'skip':
        if (S.phase === 'debate') { startVote(S); return true; }
        if (S.phase === 'vote') { finishVote(S, now); return true; }
        return false;
      case 'vote':
        if (S.phase !== 'vote' || !voters(S).includes(pid) || S.votes[pid] || !['a', 'b'].includes(a.w)) return false;
        S.votes[pid] = a.w;
        if (voters(S).every((id) => S.votes[id])) finishVote(S, now);
        return true;
      case 'gvote':
        if ((S.phase !== 'vote' && S.phase !== 'debate') || !['a', 'b', 't'].includes(a.w)) return false;
        finishVote(S, now, a.w);
        return true;
      case 'again':
        if (S.phase !== 'final') return false;
        Object.assign(S, { phase: 'lobby', cur: null, bid: null, sold: null, duels: [], di: -1, deadline: 0, pundit: null });
        return true;
    }
    return false;
  }

  function tick(S, now) {
    if (!S.deadline || now < S.deadline) return false;
    switch (S.phase) {
      case 'auction': resolveLot(S, now); return true;
      case 'assign': place(S, -1, now); return true;
      case 'sold': nextLot(S, now); return true;
      case 'duel':
        if (S.step < 3) { S.step++; setDeadline(S, now, CRISIS_MS); }
        else finishDuel(S, now);
        return true;
      case 'duelres': nextDuel(S, now); return true;
    }
    S.deadline = 0;
    return false;
  }

  /* ---------- results ---------- */
  function standings(S) {
    return S.players
      .map((p) => ({ p, pts: S.scores[p.id] || 0, rec: S.rec[p.id], pow: power(S.teams[p.id].seats), cr: S.teams[p.id].cr }))
      .sort((a, b) => b.pts - a.pts || b.rec.cw - a.rec.cw || b.pow - a.pow || b.cr - a.cr);
  }
  function awards(S) {
    const buys = [];
    S.players.forEach((p) => S.teams[p.id].buys.forEach((b) => buys.push(Object.assign({ by: p.id }, b))));
    const out = [];
    const paid = buys.filter((b) => !b.rnd);
    if (paid.length) {
      const val = (b) => seatScore(b.f, SK[b.seat]) / b.v;
      const best = paid.slice().sort((a, b) => val(b) - val(a) || a.v - b.v)[0];
      out.push({ i: '🏷️', t: 'Bargain of the year', d: `${pol(best.f).n} at ${SEATS[best.seat].name} for ${best.v} cr`, by: best.by });
      const big = paid.slice().sort((a, b) => b.v - a.v)[0];
      if (big.v > best.v) out.push({ i: '💸', t: 'Big spender', d: `${pol(big.f).n} for ${big.v} credits`, by: big.by });
    }
    const forced = buys.find((b) => b.rnd);
    if (forced) out.push({ i: '🎁', t: 'Nobody else wanted them', d: `${pol(forced.f).n}, landed for 1 credit`, by: forced.by });
    const chem = S.players.map((p) => ({ id: p.id, c: chemTotal(S.teams[p.id].seats) })).sort((a, b) => b.c - a.c)[0];
    if (chem && chem.c > 0) out.push({ i: '🧪', t: 'Best chemistry', d: `+${chem.c} cabinet bonus`, by: chem.id });
    return out;
  }

  /* ---------- AI rivals ---------- */
  const mem = {};
  function valuation(S, p, fi) {
    const per = PERSONAS.find((x) => x.k === p.persona) || PERSONAS[0];
    const t = S.teams[p.id], f = pol(fi), fr = free(S, p.id);
    let best = 0;
    t.seats.forEach((x, i) => {
      if (x != null) return;
      let s = seatScore(fi, SK[i]);
      if (per.fav === SK[i] && f.tags.includes(SK[i])) s += 1.5;
      best = Math.max(best, s);
    });
    if (p.bot !== 'easy' && t.seats.filter((x) => x != null && pol(x).c === f.c).length >= 2) best += 1.5;
    if (per.fame && f.t === 1) best += 1.5;
    const perSeat = t.cr / fr;
    let val = perSeat * Math.pow(best / 7, 1.6) * per.aggr;
    if (fr <= 2) val *= 1.3; // leftover credits are worthless, so spend them late
    val *= 1 + (Math.random() * 2 - 1) * ({ easy: 0.45, normal: 0.25, hard: 0.12 }[p.bot] || 0.25);
    const need = S.players.reduce((s, q) => s + free(S, q.id), 0);
    if (S.deck.length + 1 <= need + 2) val = Math.max(val, perSeat * 0.6);
    return Math.max(0, Math.min(maxBid(S, p.id), Math.round(val)));
  }
  function think(S, now) {
    const out = [];
    for (const p of S.players) {
      if (!p.bot) continue;
      const m = mem[p.id] || (mem[p.id] = {});
      if (S.phase === 'auction') {
        if (free(S, p.id) === 0 || S.passed.includes(p.id) || (S.bid && S.bid.by === p.id)) continue;
        if (m.lot !== S.lot) Object.assign(m, { lot: S.lot, val: valuation(S, p, S.cur), at: now + 1500 + Math.random() * 3000, seen: 0, snipe: 450 + Math.random() * 700 });
        const cur = S.bid ? S.bid.v : 0;
        if (m.seen !== cur) { m.seen = cur; m.at = Math.max(m.at, now + 600 + Math.random() * 2200); }
        if (now < Math.min(m.at, S.deadline - m.snipe)) continue;
        const cap = Math.min(m.val, maxBid(S, p.id));
        if (cur < cap) {
          let v = cur + 1;
          if (cap - cur >= 3 && Math.random() < 0.3) v = cur + 2;
          if (!cur && cap >= 5 && Math.random() < 0.4) v = Math.max(1, Math.round(cap * 0.5));
          out.push([p.id, { t: 'bid', v }]);
          m.at = now + 900 + Math.random() * 2000;
          m.seen = v;
        } else out.push([p.id, { t: 'pass' }]);
      } else if (S.phase === 'assign' && S.sold.by === p.id) {
        const key = 'as' + S.lot;
        if (m.key !== key) { m.key = key; m.at = now + 700 + Math.random() * 700; }
        if (now >= m.at) out.push([p.id, { t: 'seat', seat: bestSeat(S, p.id, S.sold.f) }]);
      } else if (S.phase === 'debate' && !S.ready.includes(p.id)) {
        out.push([p.id, { t: 'ready' }]);
      } else if (S.phase === 'vote' && voters(S).includes(p.id) && !S.votes[p.id]) {
        const key = 'v' + S.di;
        if (m.key !== key) { m.key = key; m.at = now + 800 + Math.random() * 2000; }
        if (now < m.at) continue;
        const d = S.duels[S.di];
        out.push([p.id, { t: 'vote', w: p.id === d.a ? 'a' : p.id === d.b ? 'b' : botJudge(S, d) }]);
      }
    }
    return out;
  }

  CC.SEATS = SEATS; CC.SK = SK; CC.CRISES = CRISES; CC.MODES = MODES; CC.ERAS = ERAS; CC.FAME = FAME; CC.MAXP = MAXP;
  CC.pol = pol;
  CC.Engine = {
    newState, addPlayer, addBot, act, tick, canStart, poolFor, minPool, free, maxBid, voters, player,
    seatScore, chemistry, chemTotal, power, standings, awards, ADMIN, contenders,
  };
  CC.Bots = { think };
})();
