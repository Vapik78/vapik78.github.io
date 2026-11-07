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
    { k: 'I', name: 'Interior', short: 'Interior', icon: '🚔' },
    { k: 'J', name: 'Justice', short: 'Justice', icon: '⚖️' },
    { k: 'D', name: 'Defence', short: 'Defence', icon: '🛡️' },
    { k: 'S', name: 'Social Affairs', short: 'Social', icon: '🏥' },
  ];
  const SK = SEATS.map((s) => s.k);

  // Fictional situations: the setting rewards relevant background without claiming
  // that any named politician took part in a particular historical event.
  const CRISES = [
    { n: 'A republic takes shape', i: '🏛️', desc: 'A new republic needs a stable constitution and a credible government.', p: 'L', q: 'J', e: 'h', c: 'US' },
    { n: 'Railway investment panic', i: '🚂', desc: 'A railway boom turns into a banking panic. Stabilize finance and reassure the public.', p: 'E', q: 'L', e: 'h', c: 'GB' },
    { n: 'Congress of rival powers', i: '🤝', desc: 'European powers seek a settlement after a costly conflict.', p: 'F', q: 'D', e: 'h', cont: 'Europe' },
    { n: 'A crowded capital', i: '🏙️', desc: 'Rapid urban growth overwhelms public order and local services.', p: 'I', q: 'S', e: 'h', c: 'FR' },
    { n: 'Courts for a new era', i: '⚖️', desc: 'Legal reform must reconcile old institutions with demands for equal treatment.', p: 'J', q: 'L', e: 'h', c: 'IT' },
    { n: 'Coastal defence emergency', i: '⚓', desc: 'An overseas naval threat forces a country to balance defence and diplomacy.', p: 'D', q: 'F', e: 'h', c: 'JP' },
    { n: 'Schools beyond the city', i: '📚', desc: 'A rural education programme needs lasting public support and funding.', p: 'S', q: 'E', e: 'h', c: 'IN' },
    { n: 'A fragile transition', i: '🗳️', desc: 'A divided country needs a credible transition to civilian government.', p: 'L', q: 'J', e: 'c', c: 'ZA' },
    { n: 'The price of reconstruction', i: '🏗️', desc: 'A postwar economy must rebuild industry while protecting basic services.', p: 'E', q: 'S', e: 'c', c: 'DE' },
    { n: 'Non-aligned summit', i: '🌐', desc: 'Newly independent states seek a shared voice between rival power blocs.', p: 'F', q: 'L', e: 'c', cont: 'Asia' },
    { n: 'Emergency evacuation', i: '🚨', desc: 'Severe flooding demands coordinated evacuation and emergency logistics.', p: 'I', q: 'D', e: 'c', c: 'BD' },
    { n: 'Civil rights challenge', i: '📜', desc: 'Courts and public institutions face a decisive test of equal rights.', p: 'J', q: 'S', e: 'c', c: 'US' },
    { n: 'A dangerous standoff', i: '🕊️', desc: 'Opposing armed forces need a credible path away from escalation.', p: 'D', q: 'F', e: 'c', cont: 'Europe' },
    { n: 'Universal care debate', i: '🏥', desc: 'A new national health service must be designed and paid for.', p: 'S', q: 'E', e: 'c', c: 'GB' },
    { n: 'Coalition after the election', i: '🏛️', desc: 'A fragmented parliament needs a government that can pass a budget.', p: 'L', q: 'E', e: 'm', c: 'DE' },
    { n: 'Clean energy investment', i: '⚡', desc: 'An energy transition needs reliable financing and international partners.', p: 'E', q: 'F', e: 'm', c: 'BR' },
    { n: 'Pacific climate negotiations', i: '🌊', desc: 'Regional partners seek a workable climate and adaptation agreement.', p: 'F', q: 'S', e: 'm', cont: 'Oceania' },
    { n: 'Critical systems under attack', i: '💻', desc: 'A cyberattack disrupts essential services and raises questions of accountability.', p: 'I', q: 'J', e: 'm', c: 'EE' },
    { n: 'Public money, public trust', i: '🔎', desc: 'A procurement scandal calls for an independent inquiry and financial reform.', p: 'J', q: 'E', e: 'm', c: 'KR' },
    { n: 'Protect the relief corridor', i: '⛑️', desc: 'A humanitarian supply route needs security and coordination with civilian authorities.', p: 'D', q: 'I', e: 'm', cont: 'Africa' },
    { n: 'Health services under strain', i: '🩺', desc: 'A health emergency demands care, prevention, and effective local delivery.', p: 'S', q: 'I', e: 'm', c: 'CA' },
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
    { k: 'hawk', name: 'The Hawk', fav: 'D', aggr: 1.05 },
    { k: 'tycoon', name: 'The Tycoon', fav: 'E', aggr: 1.15 },
    { k: 'diplomat', name: 'The Diplomat', fav: 'F', aggr: 0.95 },
    { k: 'populist', name: 'The Populist', fav: 'L', aggr: 1.1, fame: true },
    { k: 'sheriff', name: 'The Sheriff', fav: 'J', aggr: 1.0 },
    { k: 'reformer', name: 'The Reformer', fav: 'S', aggr: 1.0 },
    { k: 'technocrat', name: 'The Technocrat', fav: null, aggr: 0.9 },
    { k: 'kingmaker', name: 'The Kingmaker', fav: 'L', aggr: 1.0 },
  ];
  const COLORS = ['#d1495b', '#2f6fde', '#139a74', '#e0a10b', '#8a4fd1', '#e3702b', '#1fa3b8', '#c2417e'];
  const MAXP = 8;
  const CRISIS_MS = 5500; // each crisis stays on screen this long (its scores flip in after a pause)
  const RESULT_MS = CRISIS_MS * 1.5; // Crisis responses: time to read each scored response
  const RESPONSE_MS = 45000;
  const HAND_PICK_MS = 45000, HAND_DEPLOY_MS = 120000;
  const HAND_USES = 2; // in Crisis hand a minister can be sent to at most two of the five crises

  const DEFAULTS = {
    mode: 'legends', countries: ['US', 'GB', 'FR', 'DE', 'IT'], continents: ['Europe'], fame: 3,
    budget: 30, timer: 8, discards: 5, judge: 'crisis', rounds: 'all', hints: 1,
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
    return f ? (f.sk[k] || 0) + (f.t === 1 ? 1 : 0) : 0;
  }
  function chemistry(seats) {
    const fs = seats.filter((x) => x != null).map(pol);
    const out = [];
    if (fs.length < 3) return out;
    const byC = {};
    fs.forEach((f) => (byC[f.c] = (byC[f.c] || 0) + 1));
    const [topC, n] = Object.entries(byC).sort((a, b) => b[1] - a[1])[0];
    if (n >= 3) out.push({ k: 'home', label: `${D.COUNTRIES[topC].name} united`, v: Math.min(3, n - 2) });
    const conts = new Set(fs.map((f) => D.COUNTRIES[f.c].cont)).size;
    if (conts >= 4) out.push({ k: 'global', label: 'Global coalition', v: 2 });
    if (fs.length === SEATS.length && new Set(fs.map((f) => f.e)).size === 1) out.push({ k: 'era', label: 'Era dream team', v: 2 });
    const fits = seats.filter((x, i) => x != null && pol(x).sk[SK[i]] >= 7).length;
    if (fits === SEATS.length) out.push({ k: 'fit', label: 'Perfect fit', v: 3 });
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
  const minPool = (S) => Math.max(2, S.players.length) * SEATS.length;

  /* ---------- players ---------- */
  function newState(kind) {
    return {
      kind, v: 0, seq: 0, phase: 'lobby', settings: Object.assign({}, DEFAULTS),
      players: [], teams: {}, scores: {}, rec: {},
      deck: [], discardPile: [], lot: 0, discUsed: 0, noDisc: false, filling: false, fillCursor: 0,
      cur: null, bid: null, passed: [], hist: [], deadline: 0, dur: 0, sold: null, log: [],
      duels: [], di: -1, step: 0, crisisIndex: 0, responseTurn: null, ready: [], votes: {}, pundit: null,
      room: { games: 0, rows: {} }, // running totals while the same people keep playing
    };
  }
  function addPlayer(S, o) {
    const used = new Set(S.players.map((p) => p.color));
    const color = COLORS.includes(o.color) && !used.has(o.color) ? o.color // the player's favourite, if still free
      : COLORS.find((c) => !used.has(c)) || COLORS[S.players.length % COLORS.length];
    const p = { id: 'p' + ++S.seq, name: clean(o.name) || 'Player', color, bot: o.bot || null, persona: o.persona || null, off: false };
    S.players.push(p);
    return p;
  }
  /* AI rivals come in six tiers; higher tiers price politicians and pick ministers more accurately. */
  const AI_TIERS = ['Rookie', 'Easy', 'Normal', 'Tough', 'Hard', 'Mastermind'];
  const OLD_TIER = { easy: 2, normal: 3, hard: 5 };
  const toTier = (v) => Math.min(6, Math.max(1, Math.round(OLD_TIER[v] || +v) || 3));
  const tierOf = (p) => (p && p.bot ? toTier(p.bot) : 3); // humans who time out get a 'Normal' choice
  const BID_NOISE = [0.6, 0.45, 0.3, 0.2, 0.12, 0.06]; // how far a bot's price can be off
  const GUESS_NOISE = [40, 30, 20, 13, 8, 4];         // Crisis hand: error when estimating hidden weights
  const SLIP = [0.5, 0.3, 0.12, 0.05, 0, 0];           // chance of a careless seat or response choice
  const slips = (S, id) => Math.random() < SLIP[tierOf(player(S, id)) - 1];
  function addBot(S, level) {
    const used = S.players.map((p) => p.persona);
    const per = PERSONAS.find((x) => !used.includes(x.k)) || PERSONAS[rand(PERSONAS.length)];
    let name = per.name;
    for (let n = 2; S.players.some((p) => p.name === name); n++) name = per.name + ' ' + n;
    return addPlayer(S, { name, bot: toTier(level), persona: per.k });
  }
  const player = (S, id) => S.players.find((p) => p.id === id);
  const isBot = (S, id) => !!(player(S, id) || {}).bot;
  const free = (S, id) => S.teams[id].seats.filter((x) => x == null).length;
  function maxBid(S, id) {
    const t = S.teams[id];
    return t && free(S, id) ? t.cr : 0; // all remaining credits may be bid
  }
  function canStart(S) {
    if (S.players.length < 2) return 'Add at least one more player or AI rival.';
    const n = poolFor(S.settings).length, need = minPool(S);
    if (n < need) return `Only ${n} politicians in this deck — ${S.players.length} players need ${need}. Add countries or widen the fame filter.`;
    return '';
  }

  /* ---------- game flow ---------- */
  function start(S, now) {
    if (S.kind === 'solo' && S.settings.judge === 'vote') S.settings.judge = 'crisis';
    Object.keys(mem).forEach((id) => delete mem[id]);
    S.deck = shuffle(poolFor(S.settings));
    Object.assign(S, { discardPile: [], lot: 0, discUsed: 0, noDisc: false, filling: false, fillCursor: 0, responseTurn: null, log: [], duels: [], di: -1, pundit: null });
    S.teams = {}; S.scores = {}; S.rec = {};
    S.players.forEach((p) => {
      S.teams[p.id] = { cr: S.settings.budget, seats: Array(SEATS.length).fill(null), buys: [] };
      S.scores[p.id] = 0;
      S.rec[p.id] = { w: 0, d: 0, l: 0, cw: 0 };
    });
    nextLot(S, now);
  }
  function setDeadline(S, now, ms) { S.deadline = now + ms; S.dur = ms; }

  function payingPlayers(S) {
    return S.players.filter((p) => free(S, p.id) > 0 && S.teams[p.id].cr >= 1);
  }
  function nextLot(S, now) {
    S.bid = null; S.passed = []; S.hist = []; S.sold = null;
    if (!S.players.some((p) => free(S, p.id) > 0)) {
      S.phase = 'cabinets'; S.cur = null; S.deadline = 0;
      return;
    }
    if (!S.filling && !payingPlayers(S).length) {
      // The entire paid auction is over. Discarded and undealt figures now form
      // one random recruitment pool; nobody is charged for these vacancies.
      S.filling = true;
      S.deck = shuffle(S.deck.concat(S.discardPile)); S.discardPile = [];
    }
    if (!S.deck.length) {
      // Exact-size decks work: every discarded figure returns before any vacancy
      // can be left unfilled, and this second pass cannot discard again.
      S.deck = shuffle(S.discardPile); S.discardPile = []; S.noDisc = true;
    }
    S.cur = S.deck.pop();
    S.lot++;
    if (S.filling) {
      let p;
      do {
        p = S.players[S.fillCursor % S.players.length]; S.fillCursor++;
      } while (free(S, p.id) === 0);
      S.sold = { f: S.cur, by: p.id, v: 0, rnd: false, fill: true, seat: null };
      S.phase = 'assign';
      setDeadline(S, now, 20000);
      return;
    }
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
      S.sold = { f: S.cur, by: S.bid.by, v: S.bid.v, rnd: false, fill: false, seat: null };
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
    const cands = payingPlayers(S);
    if (!cands.length) { S.deck.push(S.cur); nextLot(S, now); return; }
    const p = cands[rand(cands.length)];
    S.teams[p.id].cr -= 1;
    S.sold = { f: S.cur, by: p.id, v: 1, rnd: true, fill: false, seat: null };
    S.phase = 'assign';
    setDeadline(S, now, 20000);
  }
  function bestSeat(S, id, fi, careless) {
    const t = S.teams[id];
    if (careless) { const open = t.seats.map((x, i) => (x == null ? i : -1)).filter((i) => i >= 0); return open[rand(open.length)]; }
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
    if (!Number.isInteger(seat) || seat < 0 || seat >= SEATS.length || t.seats[seat] != null) seat = bestSeat(S, s.by, s.f);
    t.seats[seat] = s.f;
    t.buys.push({ f: s.f, v: s.v, seat, rnd: !!s.rnd, fill: !!s.fill });
    s.seat = seat;
    S.log.unshift({ f: s.f, by: s.by, v: s.v, seat, rnd: !!s.rnd, fill: !!s.fill });
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
  // Scores use graded career skills; geography/era are small, scenario-specific
  // bonuses. Cabinet chemistry and fame do not get added a second time here.
  function responseScore(S, pid, ci, seats, roll = 0) {
    const cr = CRISES[ci], team = S.teams[pid];
    const continent = cr.c ? D.COUNTRIES[cr.c].cont : cr.cont;
    const parts = seats.map((si) => {
      const fi = team.seats[si], f = pol(fi), k = SK[si];
      const primary = f.sk[cr.p], support = f.sk[cr.q];
      const ability = 2 * primary + support;
      const portfolio = k === cr.p ? 3 : k === cr.q ? 2 : 0;
      const geography = cr.c === f.c ? 2 : D.COUNTRIES[f.c].cont === continent ? 1 : 0;
      const era = f.e === cr.e ? 1 : 0;
      return { k, f: fi, seat: si, primary, support, ability, portfolio, geography, era, v: ability + portfolio + geography + era };
    });
    return { parts, roll, tot: parts.reduce((sum, part) => sum + part.v, 0) + roll };
  }
  function pairs(seats) {
    const out = [];
    for (let i = 0; i < seats.length; i++) {
      for (let j = i + 1; j < seats.length; j++) out.push([seats[i], seats[j]]);
    }
    return out;
  }
  function bestResponse(S, pid, careless) {
    const d = S.duels[S.di];
    const available = SK.map((_, i) => i).filter((i) => !d.used[pid].includes(i));
    if (careless) { const all = pairs(available); return all[rand(all.length)]; }
    // Only 630 full plans exist at the start of a duel. Reserve good specialists
    // for later visible cards instead of greedily spending them on the first.
    const memo = new Map();
    function plan(ci, remaining) {
      if (ci >= d.cards.length) return { score: 0, pair: [] };
      const key = ci + ':' + remaining.join(',');
      if (memo.has(key)) return memo.get(key);
      let best = { score: -Infinity, pair: [] };
      for (const pair of pairs(remaining)) {
        const value = responseScore(S, pid, d.cards[ci], pair).tot;
        const future = plan(ci + 1, remaining.filter((i) => !pair.includes(i)));
        const score = value + future.score;
        if (score > best.score) best = { score, pair };
      }
      memo.set(key, best);
      return best;
    }
    return plan(S.crisisIndex, available).pair;
  }
  function initCrisisDuel(S, d) {
    d.cards = shuffle(CRISES.map((_, i) => i)).slice(0, 3);
    d.used = { [d.a]: [], [d.b]: [] };
    d.responses = { [d.a]: null, [d.b]: null };
    d.r = { crises: [], wa: 0, wb: 0, w: null };
    S.crisisIndex = 0; S.step = 0;
  }
  function startCrisis(S, now) {
    const d = S.duels[S.di];
    d.responses = { [d.a]: null, [d.b]: null };
    S.responseTurn = (S.di + S.crisisIndex) % 2 === 0 ? d.a : d.b;
    S.phase = 'respond';
    setDeadline(S, now, RESPONSE_MS);
  }
  function chooseResponse(S, pid, seats, now) {
    if (S.phase !== 'respond' || S.responseTurn !== pid) return false;
    const d = S.duels[S.di];
    if (!Array.isArray(seats) || seats.length !== 2 || seats[0] === seats[1] ||
        seats.some((i) => !Number.isInteger(i) || i < 0 || i >= SEATS.length || d.used[pid].includes(i))) return false;
    d.responses[pid] = seats.slice();
    d.used[pid].push(...seats);
    const other = pid === d.a ? d.b : d.a;
    if (!d.responses[other]) {
      S.responseTurn = other;
      setDeadline(S, now, RESPONSE_MS);
      return true;
    }
    const ci = d.cards[S.crisisIndex];
    const A = responseScore(S, d.a, ci, d.responses[d.a], 1 + rand(3));
    const B = responseScore(S, d.b, ci, d.responses[d.b], 1 + rand(3));
    const w = A.tot > B.tot ? 'a' : B.tot > A.tot ? 'b' : 't';
    d.r.crises.push({ ci, A, B, w });
    if (w === 'a') d.r.wa++;
    if (w === 'b') d.r.wb++;
    if (S.crisisIndex === 2) d.r.w = d.r.wa > d.r.wb ? 'a' : d.r.wb > d.r.wa ? 'b' : 't';
    S.phase = 'duel'; S.responseTurn = null; S.step = S.crisisIndex + 1;
    setDeadline(S, now, RESULT_MS);
    return true;
  }
  function advanceCrisis(S, now) {
    if (S.crisisIndex < 2) { S.crisisIndex++; startCrisis(S, now); }
    else finishDuel(S, now);
  }
  /* ---------- Crisis hand ---------- */
  // Hidden weights: the card's main ministry counts fully, its supporting one 0.6,
  // the Leader always somewhat; everything else a little. Players only see the story.
  function handWeight(cr, k) {
    if (k === cr.p) return 1;
    if (k === cr.q) return 0.6;
    return k === 'L' ? 0.35 : 0.15;
  }
  // One minister's contribution, out of 100: 60 seat relevance, 25 personal skill, 15 background.
  function handSlot(S, pid, ci, si) {
    const cr = CRISES[ci], fi = S.teams[pid].seats[si], f = pol(fi), k = SK[si];
    const continent = cr.c ? D.COUNTRIES[cr.c].cont : cr.cont;
    const seat = Math.round(60 * handWeight(cr, k));
    const skill = Math.round(25 * (2 * f.sk[cr.p] + f.sk[cr.q]) / 27);
    const geography = cr.c === f.c ? 9 : D.COUNTRIES[f.c].cont === continent ? 5 : 0;
    const era = f.e === cr.e ? 6 : 0;
    return { si, k, f: fi, seat, skill, bg: Math.min(15, geography + era), v: seat + skill + Math.min(15, geography + era) };
  }
  function handScore(S, pid, ci, pair, roll) {
    const slots = pair.map((si) => handSlot(S, pid, ci, si));
    const [x, y] = slots.map((sl) => pol(sl.f));
    // Two different ministers from the same country or era work together a little better.
    const synergy = pair[0] === pair[1] ? 0 : (x.c === y.c ? 4 : 0) + (x.e === y.e ? 2 : 0);
    const tot = Math.min(100, Math.round((slots[0].v + slots[1].v) / 2) + synergy + roll);
    return { slots, synergy, roll, tot };
  }
  function handPairs() {
    const out = [];
    for (let i = 0; i < SEATS.length; i++) for (let j = i + 1; j < SEATS.length; j++) out.push([i, j]); // two different ministers
    return out;
  }
  // Bots don't know the hidden priorities either: they judge each option with an error
  // that shrinks with difficulty (humans who run out of time get the 'normal' guess).
  const guessError = (S, pid) => GUESS_NOISE[tierOf(player(S, pid)) - 1];
  const guess = (S, pid, v) => v + (Math.random() * 2 - 1) * guessError(S, pid);
  function bestHandPick(S, pid) {
    const d = S.duels[S.di];
    const est = {};
    d.hand[pid].forEach((ci) => (est[ci] = guess(S, pid, Math.max(...handPairs().map((pr) => handScore(S, pid, ci, pr, 0).tot)))));
    return d.hand[pid].slice().sort((a, b) => est[b] - est[a]).slice(0, 2);
  }
  // Greedy plan: take the strongest (crisis, pair) options first, respecting the two-uses limit.
  function bestHandPlan(S, pid) {
    const d = S.duels[S.di], uses = Array(SEATS.length).fill(0), plan = Array(d.cards.length).fill(null);
    const options = [];
    d.cards.forEach((ci, c) => handPairs().forEach((pr) => options.push({ c, pr, v: guess(S, pid, handScore(S, pid, ci, pr, 0).tot) })));
    options.sort((a, b) => b.v - a.v);
    for (const o of options) {
      if (plan[o.c]) continue;
      const need = Array(SEATS.length).fill(0); o.pr.forEach((si) => need[si]++);
      if (need.every((n, si) => uses[si] + n <= HAND_USES)) { plan[o.c] = o.pr; need.forEach((n, si) => (uses[si] += n)); }
    }
    return plan;
  }
  function validPlan(S, plan) {
    const d = S.duels[S.di], uses = Array(SEATS.length).fill(0);
    if (!Array.isArray(plan) || plan.length !== d.cards.length) return false;
    for (const pr of plan) {
      if (!Array.isArray(pr) || pr.length !== 2 || pr[0] === pr[1]) return false;
      for (const si of pr) { if (!Number.isInteger(si) || si < 0 || si >= SEATS.length) return false; uses[si]++; }
    }
    return uses.every((n) => n <= HAND_USES);
  }
  function initHandDuel(S, d, now) {
    const deck = shuffle(CRISES.map((_, i) => i));
    d.hand = { [d.a]: deck.slice(0, 4), [d.b]: deck.slice(4, 8) };
    d.spare = deck[8];
    d.picks = { [d.a]: null, [d.b]: null };
    d.plans = { [d.a]: null, [d.b]: null };
    d.cards = null;
    d.r = { crises: [], wa: 0, wb: 0, ta: 0, tb: 0, w: null };
    S.phase = 'hand'; S.step = 0;
    setDeadline(S, now, HAND_PICK_MS);
  }
  function pickCards(S, pid, cards, now) {
    const d = S.duels[S.di];
    if (S.phase !== 'hand' || !d.picks || !(pid in d.picks) || d.picks[pid]) return false;
    if (!Array.isArray(cards) || cards.length !== 2 || cards[0] === cards[1] || !cards.every((c) => d.hand[pid].includes(c))) return false;
    d.picks[pid] = cards.slice();
    if (d.picks[d.a] && d.picks[d.b]) {
      d.cards = shuffle([...d.picks[d.a], ...d.picks[d.b], d.spare]);
      S.phase = 'deploy';
      setDeadline(S, now, HAND_DEPLOY_MS);
    }
    return true;
  }
  function deployPlan(S, pid, plan, now) {
    const d = S.duels[S.di];
    if (S.phase !== 'deploy' || !d.plans || !(pid in d.plans) || d.plans[pid] || !validPlan(S, plan)) return false;
    d.plans[pid] = plan.map((pr) => pr.slice());
    if (d.plans[d.a] && d.plans[d.b]) resolveHand(S, d, now);
    return true;
  }
  function resolveHand(S, d, now) {
    d.r.crises = d.cards.map((ci, c) => {
      const A = handScore(S, d.a, ci, d.plans[d.a][c], 1 + rand(3));
      const B = handScore(S, d.b, ci, d.plans[d.b][c], 1 + rand(3));
      return { ci, A, B, w: A.tot > B.tot ? 'a' : B.tot > A.tot ? 'b' : 't' };
    });
    d.r.wa = d.r.crises.filter((c) => c.w === 'a').length;
    d.r.wb = d.r.crises.filter((c) => c.w === 'b').length;
    d.r.ta = d.r.crises.reduce((s, c) => s + c.A.tot, 0);
    d.r.tb = d.r.crises.reduce((s, c) => s + c.B.tot, 0);
    // The duel goes to the higher total; crises won break a tie.
    d.r.w = d.r.ta > d.r.tb ? 'a' : d.r.tb > d.r.ta ? 'b' : d.r.wa > d.r.wb ? 'a' : d.r.wb > d.r.wa ? 'b' : 't';
    S.phase = 'reveal'; S.step = 0;
    setDeadline(S, now, 3000);
  }

  /* ---------- Auto crises (the original mode) ---------- */
  // Three random crises; each tests the card's two ministries using whoever holds them,
  // plus cabinet chemistry and a 1–3 dice. No decisions — just watch the reveal.
  function simulateAutoDuel(S, a, b) {
    const picks = shuffle(CRISES.map((_, i) => i)).slice(0, 3);
    const side = (id, cr) => {
      const seats = S.teams[id].seats, ch = chemTotal(seats);
      const parts = [cr.p, cr.q].map((k) => { const f = seats[SK.indexOf(k)]; return { k, f, v: seatScore(f, k) }; });
      const roll = 1 + rand(3);
      return { parts, ch, roll, tot: parts.reduce((sum, x) => sum + x.v, 0) + ch + roll };
    };
    const crises = picks.map((ci) => {
      const A = side(a, CRISES[ci]), B = side(b, CRISES[ci]);
      return { ci, A, B, w: A.tot > B.tot ? 'a' : B.tot > A.tot ? 'b' : 't' };
    });
    const wa = crises.filter((c) => c.w === 'a').length, wb = crises.filter((c) => c.w === 'b').length;
    return { crises, wa, wb, w: wa > wb ? 'a' : wb > wa ? 'b' : 't' };
  }

  function startShowdown(S, now) {
    let rounds = roundRobin(S.players.map((p) => p.id));
    if (S.settings.rounds === 'quick') rounds = rounds.slice(0, 3);
    S.duels = [].concat(...rounds).map(([a, b]) => ({ a, b, r: null, w: null }));
    S.di = -1;
    nextDuel(S, now);
  }
  function applyResult(S, d, w) {
    if (d.w !== null) return; // duplicate/retried actions must never award points twice
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
      if (S.di >= S.duels.length) { S.phase = 'final'; S.deadline = 0; recordRoom(S); return; }
      const d = S.duels[S.di];
      const botsOnly = isBot(S, d.a) && isBot(S, d.b);
      if (S.settings.judge === 'auto') {
        d.r = simulateAutoDuel(S, d.a, d.b);
        if (botsOnly) { applyResult(S, d, d.r.w); continue; }
        S.phase = 'autoduel'; S.step = 0;
        setDeadline(S, now, 3000);
        return;
      }
      if (S.settings.judge === 'hand') {
        initHandDuel(S, d, now);
        if (botsOnly) {
          [d.a, d.b].forEach((id) => pickCards(S, id, bestHandPick(S, id), now));
          [d.a, d.b].forEach((id) => deployPlan(S, id, bestHandPlan(S, id), now));
          applyResult(S, d, d.r.w); continue;
        }
        return;
      }
      if (S.settings.judge === 'crisis') {
        initCrisisDuel(S, d);
        if (botsOnly) {
          for (let ci = 0; ci < 3; ci++) {
            S.crisisIndex = ci;
            startCrisis(S, now);
            for (let turn = 0; turn < 2; turn++) {
              const id = S.responseTurn; chooseResponse(S, id, bestResponse(S, id), now);
            }
          }
          applyResult(S, d, d.r.w); continue;
        }
        startCrisis(S, now);
        return;
      }
      if (botsOnly) { d.r = { votes: {} }; applyResult(S, d, botJudge(S, d)); continue; }
      S.phase = 'debate'; S.ready = []; S.votes = {}; S.deadline = 0;
      return;
    }
  }
  function recordRoom(S) {
    const st = standings(S), room = S.room || (S.room = { games: 0, rows: {} });
    room.games++;
    st.forEach((r, i) => {
      const row = room.rows[r.p.id] || (room.rows[r.p.id] = { pts: 0, wins: 0, games: 0 });
      Object.assign(row, { name: r.p.name, color: r.p.color, pts: row.pts + r.pts, games: row.games + 1, wins: row.wins + (i === 0 || r.pts === st[0].pts ? 1 : 0) });
    });
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
    if ([20, 30, 40].includes(patch.budget)) o.budget = patch.budget;
    if ([5, 8, 12].includes(patch.timer)) o.timer = patch.timer;
    if ([-1, 0, 3, 5, 10].includes(patch.discards)) o.discards = patch.discards;
    if (['crisis', 'hand', 'auto', 'vote'].includes(patch.judge)) o.judge = patch.judge;
    if (['all', 'quick'].includes(patch.rounds)) o.rounds = patch.rounds;
    if ([0, 1, 2].includes(patch.hints)) o.hints = patch.hints;
    return o;
  }

  function act(S, pid, a, now) {
    const lobby = S.phase === 'lobby';
    switch (a.t) {
      case 'set':
        if (!lobby) return false;
        Object.assign(S.settings, sanitize(a.patch || {}));
        if (S.kind === 'solo' && S.settings.judge === 'vote') S.settings.judge = 'crisis';
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
        const p = player(S, a.id);
        if (!lobby || !p || !p.bot) return false;
        p.bot = a.level != null ? toTier(a.level) : tierOf(p) % 6 + 1;
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
        const v = a.v;
        if (!Number.isInteger(v) || v <= cur || v > maxBid(S, pid)) return false;
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
        if (!Number.isInteger(a.seat) || a.seat < 0 || a.seat >= SEATS.length || S.teams[pid].seats[a.seat] !== null) return false;
        place(S, a.seat, now);
        return true;
      case 'respond':
        return chooseResponse(S, pid, a.seats, now);
      case 'pick':
        return pickCards(S, pid, a.cards, now);
      case 'deploy':
        return deployPlan(S, pid, a.plan, now);
      case 'next':
        if (S.phase === 'cabinets') { S.phase = 'briefing'; S.deadline = 0; return true; } // explain the rules first
        if (S.phase === 'briefing') { startShowdown(S, now); return true; }
        if (S.phase === 'duel') { advanceCrisis(S, now); return true; }
        if (S.phase === 'reveal' || S.phase === 'autoduel') { finishDuel(S, now); return true; }
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
      case 'respond': return chooseResponse(S, S.responseTurn, bestResponse(S, S.responseTurn), now);
      case 'duel': advanceCrisis(S, now); return true;
      case 'hand': {
        const d = S.duels[S.di];
        [d.a, d.b].filter((id) => !d.picks[id]).forEach((id) => pickCards(S, id, bestHandPick(S, id), now));
        return true;
      }
      case 'deploy': {
        const d = S.duels[S.di];
        [d.a, d.b].filter((id) => !d.plans[id]).forEach((id) => deployPlan(S, id, bestHandPlan(S, id), now));
        return true;
      }
      case 'reveal':
        if (S.step < S.duels[S.di].cards.length) { S.step++; setDeadline(S, now, CRISIS_MS); }
        else finishDuel(S, now);
        return true;
      case 'autoduel':
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
    const paid = buys.filter((b) => !b.rnd && !b.fill && b.v > 0);
    if (paid.length) {
      const val = (b) => seatScore(b.f, SK[b.seat]) / b.v;
      const best = paid.slice().sort((a, b) => val(b) - val(a) || a.v - b.v)[0];
      out.push({ i: '🏷️', t: 'Bargain of the year', d: `${pol(best.f).n} at ${SEATS[best.seat].name} for ${best.v} cr`, by: best.by });
      const big = paid.slice().sort((a, b) => b.v - a.v)[0];
      if (big.v > best.v) out.push({ i: '💸', t: 'Big spender', d: `${pol(big.f).n} for ${big.v} credits`, by: big.by });
    }
    const recruit = buys.find((b) => b.fill);
    if (recruit) out.push({ i: '🎲', t: 'Fresh recruit', d: `${pol(recruit.f).n}, joined free after the auction`, by: recruit.by });
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
    if (tierOf(p) >= 3 && t.seats.filter((x) => x != null && pol(x).c === f.c).length >= 2) best += 1.5;
    if (per.fame && f.t === 1) best += 1.5;
    const perSeat = t.cr / fr;
    let val = perSeat * Math.pow(best / 8, 1.6) * per.aggr;
    if (fr <= 2) val *= 1.3; // leftover credits are worthless, so spend them late
    val *= 1 + (Math.random() * 2 - 1) * BID_NOISE[tierOf(p) - 1];
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
        if (free(S, p.id) === 0 || maxBid(S, p.id) < 1 || S.passed.includes(p.id) || (S.bid && S.bid.by === p.id)) continue;
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
        if (now >= m.at) out.push([p.id, { t: 'seat', seat: bestSeat(S, p.id, S.sold.f, slips(S, p.id)) }]);
      } else if (S.phase === 'respond' && S.responseTurn === p.id) {
        const key = 'r' + S.di + ':' + S.crisisIndex;
        if (m.key !== key) { m.key = key; m.at = now + 900 + Math.random() * 900; }
        if (now >= m.at) out.push([p.id, { t: 'respond', seats: bestResponse(S, p.id, slips(S, p.id)) }]);
      } else if ((S.phase === 'hand' || S.phase === 'deploy') && S.duels[S.di] && [S.duels[S.di].a, S.duels[S.di].b].includes(p.id)) {
        const d = S.duels[S.di], key = S.phase + S.di;
        if (S.phase === 'hand' ? d.picks[p.id] : d.plans[p.id]) continue;
        if (m.key !== key) { m.key = key; m.at = now + 1200 + Math.random() * 1500; }
        if (now >= m.at) out.push([p.id, S.phase === 'hand' ? { t: 'pick', cards: bestHandPick(S, p.id) } : { t: 'deploy', plan: bestHandPlan(S, p.id) }]);
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
    seatScore, chemistry, chemTotal, power, standings, awards, ADMIN, contenders, responseScore, bestResponse,
    handScore, handWeight, HAND_USES, tierOf, AI_TIERS,
  };
  CC.Bots = { think };
  CC.COLORS = COLORS;
})();
