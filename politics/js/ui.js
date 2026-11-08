/* Cabinet Clash — interface and app controller.
   Roles: solo (you + AI rivals), local (pass & play on one screen),
   host (runs an online room) and client (joined someone's room). */
(function () {
  'use strict';
  const D = window.CC_DATA, CC = window.CC, E = CC.Engine, SEATS = CC.SEATS, Net = CC.Net, Sound = CC.Sound;
  const root = document.getElementById('app');

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const pol = CC.pol;

  /* Theme: follows the device until the player picks one; the choice is remembered. */
  if (LS.get('cc-theme', '')) document.documentElement.dataset.theme = LS.get('cc-theme', '');
  const themeChoice = () => document.documentElement.dataset.theme || 'device';
  function setTheme(v) {
    if (v === 'device') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v;
    LS.set('cc-theme', v === 'device' ? '' : v);
  }
  // Personal settings (Settings window), stored on this device only.
  function applyLook() {
    const d = document.documentElement.dataset;
    if (LS.get('cc-motion', '')) d.motion = 'reduce'; else delete d.motion;
    if (LS.get('cc-text', '')) d.text = 'large'; else delete d.text;
  }
  applyLook();
  const myRules = () => { try { return JSON.parse(LS.get('cc-rules', '')) || {}; } catch (e) { return {}; } };
  const myColor = () => LS.get('cc-color', '');
  function setPref(k, v) {
    if (k === 'sound') { if ((v === 'off') !== Sound.muted) Sound.toggle(); return; }
    if (k === 'budget' || k === 'timer' || k === 'judge') { const r = myRules(); r[k] = num(v); LS.set('cc-rules', JSON.stringify(r)); return; }
    LS.set('cc-' + k, v);
    if (k === 'motion' || k === 'text') applyLook();
    if (k === 'saver') { CC.Img.saver = v === '1'; if (!CC.Img.saver) CC.Img.prefetch(app.ballot.map(pol)); }
  }
  async function clearData() {
    if (!confirm('Clear everything Cabinet Clash saved on this device? This removes your name, settings, cached photos and the downloaded free AI model.')) return;
    try { Object.keys(localStorage).filter((k) => k.startsWith('cc-')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* blocked */ }
    try { for (const k of await caches.keys()) if (/webllm/i.test(k)) await caches.delete(k); } catch (e) { /* no Cache API */ }
    location.reload();
  }

  const app = {
    view: 'home', role: null, S: null, me: [], offset: 0, code: '', err: '', toast: '',
    name: LS.get('cc-name', ''), joinCode: '', csearch: '', addName: '', modal: null, ptab: 'serious',
    pundBusy: false, pundErr: '', pundProgress: '', lost: false, tokens: {}, loop: null, joinTimer: null,
    ballot: [], sig: {}, botTier: +LS.get('cc-bot-tier', '3') || 3, netDown: false, responseDraft: { key: '', seats: [] }, hand: { key: '', v: null },
    atlasQ: '', atlasSeat: '', profile: null, atlasOpen: false, atlasCtyOpen: false, atlasCont: [], atlasCty: [], atlasEra: [],
    sample: ['Alex', 'Sam', 'Robin', 'Charlie', 'Jordan', 'Kim', 'Max', 'Nova', 'Riley', 'Luca', 'Mila', 'Toni'][Math.floor(Math.random() * 12)],
  };

  /* ---------- small pieces ---------- */
  function hue(c) { let h = 7; for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
  function initials(n) {
    return n.split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).map((w) => w[0]).slice(0, 2).join('') || n[0];
  }
  function portrait(f, cls) {
    const u = CC.Img.get(f);
    if (!u) CC.Img.want(f);
    // The big card shows the whole photo, with a blurred copy filling the empty space around it.
    const img = !u ? `<b>${esc(initials(f.n))}</b>`
      : cls === 'lg' ? `<img class="bg" src="${esc(u)}" alt="" aria-hidden="true"><img class="fg" src="${esc(u)}" alt="" decoding="async">`
      : `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">`;
    return `<span class="pt ${cls || ''}" style="--h:${hue(f.c)}">${img}</span>`;
  }
  const flag = (c, cls) => `<img class="flag ${cls || ''}" src="https://flagcdn.com/w40/${c.toLowerCase()}.png" alt="" title="${esc(D.COUNTRIES[c].name)}" loading="lazy">`;
  const FAME_TIP = { 1: 'Household name: +1 cabinet Power', 2: 'Well known: no fame bonus', 3: 'Deep cut: no fame bonus' };
  const stars = (t) => `<span class="stars" title="Fame — ${FAME_TIP[t]}. Fame adds at most 1 to cabinet Power; crisis responses use skills, not fame."><small>Fame</small>${'★'.repeat(4 - t)}<i>${'★'.repeat(t - 1)}</i></span>`;
  const P = (id) => app.S && E.player(app.S, id);
  const pname = (id) => esc((P(id) || {}).name || '?');
  const dot = (id) => `<span class="dot" style="--c:${(P(id) || {}).color || '#888'}"></span>`;
  const who = (id) => `<span class="who">${dot(id)}${pname(id)}</span>`;
  const isAdmin = () => app.role && app.role !== 'client';
  function locals() {
    const S = app.S;
    if (!S) return [];
    if (app.role === 'local') return S.players.filter((p) => !p.bot).map((p) => p.id);
    return app.me.filter((id) => P(id));
  }
  const mine = (id) => locals().includes(id);
  const adminPid = () => (app.role === 'local' ? (locals()[0] || app.me[0]) : app.me[0]);

  function fits(f) {
    return `<div class="fits">${SEATS.map((s) => `<span class="fit ${f.tags.includes(s.k) ? 'on' : ''}" title="${esc(s.name)}: skill ${f.sk[s.k]}/9${f.tags.includes(s.k) ? ' · experienced' : ''}">${s.icon}<small>${s.short} ${f.sk[s.k]}</small></span>`).join('')}</div>`;
  }
  // Without hints, who fits which seat stays hidden until the cabinets are sworn in.
  // hints: 0 = neutral role text, 1 = real roles but secret scores (default), 2 = roles + ratings + live Power.
  const hintsOn = () => !!(app.S && app.S.settings.hints === 2);
  const roleOf = (f) => (app.S && app.S.settings.hints === 0 && !revealed() ? f.rn : f.r);
  const revealed = () => hintsOn() || !['auction', 'assign', 'sold'].includes(app.S.phase);
  function bigCard(fi, extra) {
    const f = pol(fi);
    return `<article class="pcard">
      ${portrait(f, 'lg')}
      <div class="pc-body">
        <div class="pc-meta">${flag(f.c)}<span>${esc(D.COUNTRIES[f.c].name)}</span><span class="sep">·</span><span>${CC.ERAS[f.e]}</span>${stars(f.t)}</div>
        <h2 class="pc-name">${esc(f.n)}</h2>
        <p class="pc-role">${esc(roleOf(f))}</p>
        <p class="pc-yrs">${esc(f.y)}</p>
        ${hintsOn() ? `<p class="pc-fit-label">Skills · rated 1–9</p>${fits(f)}` : ''}
        ${extra || ''}
      </div>
    </article>`;
  }
  // The badge is the points this minister scores in this seat, not the price paid.
  function mini(fi, k, paid) {
    const f = pol(fi), fit = f.tags.includes(k), seat = SEATS.find((s) => s.k === k).name;
    const tip = `Cabinet Power as ${seat}: skill ${f.sk[k]}/9${f.t === 1 ? ' + 1 fame' : ''} = ${E.seatScore(fi, k)}. Crisis responses use their two relevant skills and background separately.${paid != null ? ` Recruited for ${paid} credits.` : ''}`;
    const score = revealed() ? `<i class="sc ${fit ? 'fit' : ''}" title="${esc(tip)}">${E.seatScore(fi, k)}<small>power</small></i>` : '';
    return `<span class="mini" title="${esc(f.n)} — ${esc(roleOf(f))}">${portrait(f, 'xs')}<b>${esc(f.s)}</b>${flag(f.c, 'sm')}${score}</span>`;
  }
  function cabinet(id, opts) {
    const S = app.S, p = P(id), t = S.teams[id];
    opts = opts || {};
    const lead = S.phase === 'auction' && S.bid && S.bid.by === id;
    const out = S.phase === 'auction' && !lead && (S.passed.includes(id) || E.free(S, id) === 0 || t.cr === 0);
    const tag = S.phase === 'auction' && t.cr === 0 && E.free(S, id) > 0 ? '<em class="tag state">Awaiting free recruits</em>' : lead ? '<em class="tag state lead">Leading</em>' : S.phase === 'auction' && S.passed.includes(id) ? '<em class="tag state">Passed</em>' : E.free(S, id) === 0 && S.phase === 'auction' ? '<em class="tag state">Full</em>' : '';
    const chem = E.chemistry(t.seats);
    return `<div class="cab ${lead ? 'is-lead' : ''} ${out ? 'is-out' : ''} ${mine(id) ? 'is-me' : ''} ${opts.cls || ''}" style="--c:${p.color}">
      <header>${dot(id)}<b class="cab-name">${esc(p.name)}</b>${p.bot ? `<em class="tag ai" title="AI rival · ${E.AI_TIERS[E.tierOf(p) - 1]}">AI</em>` : ''}${p.off ? '<em class="tag">offline</em>' : ''}${tag}
        <span class="cr" title="Credits left">${t.cr}<small>cr</small></span></header>
      <div class="crbar"><i style="width:${Math.min(100, (t.cr / S.settings.budget) * 100)}%"></i></div>
      <ul>${SEATS.map((s, i) => `<li class="${opts.hl && opts.hl.includes(s.k) ? 'hl' : ''}"><span class="si" title="${esc(s.name)}">${s.icon}</span>${t.seats[i] != null ? mini(t.seats[i], s.k, (t.buys.find((b) => b.seat === i) || {}).v) : `<span class="vac">${esc(s.name)}</span>`}</li>`).join('')}</ul>
      ${revealed() ? `<footer><button class="power" data-a="bonus" title="How Power is counted">Power <b>${E.power(t.seats)}</b></button>${chem.map((c) => `<button class="chem" data-a="bonus" title="What is this bonus?">${esc(c.label)} +${c.v}</button>`).join('')}</footer>` : ''}
    </div>`;
  }
  const cabs = (ids, opts) => `<section class="cabs n${ids.length}">${ids.map((id) => cabinet(id, opts)).join('')}</section>`;
  const fuse = (S) => (S.deadline ? `<div class="fuse" data-dl="${S.deadline}" data-dur="${S.dur}"><i></i><span class="secs"></span></div>` : '');
  const tierLabel = (n) => `${n} · ${E.AI_TIERS[n - 1]}`;
  const chip = (on, a, attrs, label, dis) => `<button class="chip ${on ? 'on' : ''}" data-a="${a}" ${attrs} ${dis ? 'disabled' : ''}>${label}</button>`;

  /* ---------- top bar & modals ---------- */
  function topbar(status) {
    const room = app.role === 'host' || app.role === 'client' ? `<span class="room" title="Room code">Room <b>${esc(app.code)}</b></span>` : '';
    return `<header class="bar">
      <button class="brand" data-a="home" title="Back to the start">Cabinet <em>Clash</em></button>
      <div class="bar-mid">${status || ''}</div>
      <div class="bar-r">${room}
        <button class="bar-link" data-a="rules">Rules</button>
        <button class="bar-link" data-a="settings">Settings</button>
      </div>
    </header>`;
  }
  function modal() {
    if (app.modal === 'rules') {
      return `<div class="modal" data-a="closeModal"><div class="sheet" data-stop>
        <h2>How to play</h2>
        <ol class="rules">
          <li><b>Pick a deck.</b> Choose countries, continents, fame or a historical period. Each player needs ${SEATS.length} politicians.</li>
          <li><b>Buy your cabinet.</b> Spend ${app.S ? app.S.settings.budget : 30} credits across ${SEATS.length} ministries: ${SEATS.map((s) => `${s.icon} ${s.name}`).join(', ')}. Every bid restarts the timer. Highest bid wins; choose a vacant ministry for your purchase.</li>
          <li><b>All in means all in.</b> You can spend every credit. With zero left, wait while the others finish bidding. Only when nobody with vacant seats can pay does free recruitment begin: random remaining politicians fill the vacancies, and you choose their ministries. No borrowing or duplicate recruits.</li>
          <li><b>Nobody bids?</b> Discard the politician while discards remain. After that, a random player with a vacancy and at least 1 credit pays 1. When the fresh deck runs out, discards return and cannot be skipped again. Free recruitment can draw from both remaining cards and discards.</li>
          <li><b>Skills and assignments.</b> Each person has seven career-based skill ratings, from 1 to 9. Cabinet Power adds each minister's assigned skill, +1 for a household name, and cabinet bonuses. Ratings are game judgments, not a moral ranking. By default cards show each person's real role but keep ratings and fit hidden during recruitment; the Experience hints rule can show everything or hide even the job titles.</li>
          <li><b>Choose a crisis response.</b> Each duel shows three crisis cards. Take turns sending two different ministers to each one. A minister can respond only once per duel; save specialists for later cards. Choices are public, and the first chooser alternates. You have 45 seconds; the game chooses for you on timeout.</li>
          <li><b>Response score.</b> For each selected minister: twice the primary skill + the supporting skill; add +3 for holding the primary ministry or +2 for the supporting ministry; add +2 for the card's country or +1 for its continent; add +1 for its era. Add the two ministers, then one luck roll of 1–3. The card shows its setting and skills; its scenario is fictional. <b>Cabinet Power and chemistry are not added to this score.</b></li>
          <li><b>Win the tournament.</b> Higher response score wins a crisis; equal scores tie. More crisis wins takes the duel: <b>3 tournament points for a win, 1 each for a draw</b>. Tied standings use crisis wins, then cabinet Power, then unspent credits. Alternatively, use <i>Argue &amp; vote</i> to decide duels together.</li>
          <li><b>The Pundit</b> evaluates and roasts the completed cabinets. Its verdict does not award tournament points. <button class="lnk" data-a="bonus">Power &amp; cabinet bonuses →</button></li>
        </ol>
        <button class="btn" data-a="closeModal">Got it</button>
      </div></div>`;
    }
    if (app.modal === 'settings') {
      const th = themeChoice(), rules = Object.assign({ budget: 30, timer: 8, judge: 'crisis' }, myRules());
      const pref = (k, opts) => opts.map(([v, l]) => chip(LS.get('cc-' + k, '') === v, 'pref', `data-k="${k}" data-v="${v}"`, l)).join('');
      return `<div class="modal" data-a="closeModal"><div class="sheet" data-stop>
        <h2>Settings</h2>
        <h3 class="sub">Appearance</h3>
        <div class="chips">${[['device', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => chip(th === v, 'theme', `data-v="${v}"`, l)).join('')}</div>
        <div class="chips">${pref('text', [['', 'Normal text'], ['large', 'Large text']])}</div>
        <div class="chips">${pref('motion', [['', 'Animations on'], ['reduce', 'Reduce motion']])}</div>
        <h3 class="sub">Sound</h3>
        <div class="chips">${chip(!Sound.muted, 'pref', 'data-k="sound" data-v="on"', 'On')}${chip(Sound.muted, 'pref', 'data-k="sound" data-v="off"', 'Off')}</div>
        <h3 class="sub">You</h3>
        <label class="pref-name" for="pn"><span>Name</span><input id="pn" maxlength="18" autocomplete="nickname" placeholder="e.g. ${esc(app.sample)}" value="${esc(app.name)}"></label>
        <div class="swatches" role="group" aria-label="Favourite colour">${CC.COLORS.map((c, i) => `<button class="swatch ${myColor() === c ? 'on' : ''}" data-a="pref" data-k="color" data-v="${c}" style="--c:${c}" aria-label="Colour ${i + 1}" aria-pressed="${myColor() === c}"></button>`).join('')}</div>
        <p class="small">Your colour in new games, if nobody has taken it yet.</p>
        <h3 class="sub">New games start with</h3>
        <div class="chips">${[20, 30, 40].map((v) => chip(rules.budget === v, 'pref', `data-k="budget" data-v="${v}"`, v + ' credits')).join('')}</div>
        <div class="chips">${[5, 8, 12].map((v) => chip(rules.timer === v, 'pref', `data-k="timer" data-v="${v}"`, v + ' s bid timer')).join('')}</div>
        <div class="chips">${[['crisis', '🃏 Crisis responses'], ['hand', '🎴 Crisis hand'], ['auto', '🎲 Auto crises']].map(([v, l]) => chip(rules.judge === v, 'pref', `data-k="judge" data-v="${v}"`, l)).join('')}</div>
        <p class="small">You can still change the house rules in each game's lobby.</p>
        <h3 class="sub">Pundit</h3>
        <div class="chips">${pref('pundit', [['', '🆓 Free AI first'], ['house', '⚡ House pundit first']])}</div>
        <div class="chips">${pref('tone', [['', '🔥 Savage roast'], ['friendly', '😊 Friendly roast']])}</div>
        <p class="small">The roast tone applies to the free AI pundit.</p>
        <h3 class="sub">Data</h3>
        <div class="chips">${pref('saver', [['', 'Load photos'], ['1', '📶 Data saving mode']])}</div>
        <p class="small">${CC.Img.saver ? 'No portraits are downloaded; cards show initials. Good on mobile data.' : 'Portraits load from Wikipedia as you play.'}</p>
        <button class="btn ghost small" data-a="clearData">Clear saved data…</button>
        <p class="credit">Made by Marek Bureš with help from AI.</p>
        <div class="row"><button class="btn" data-a="closeModal">Done</button></div>
      </div></div>`;
    }
    if (app.modal === 'bonus') return bonusModal();
    if (app.modal === 'profile') return profileModal();
    if (app.modal === 'ai') {
      return `<div class="modal" data-a="closeModal"><div class="sheet" data-stop>
        <h2>About the free AI pundit</h2>
        <p>It runs <b>${esc(Pundit().FREE_MODELS.better.label)}</b>, an open AI model, right in your browser — no account, no key, nothing sent to a server. The first time it downloads ${esc(Pundit().FREE_MODELS.better.size)}; after that it's saved and starts in seconds. In online games only the host's device runs it.</p>
        <p class="small">It needs a computer with Chrome or Edge (WebGPU). A small model can still get facts wrong or tell a dud joke — jokes about looks, gender, race, family or violence are filtered out and replaced by the house pundit. The ⚡ house pundit is instant and works everywhere.</p>
        <div class="row"><button class="btn" data-a="closeModal">Done</button></div>
      </div></div>`;
    }
    return '';
  }
  const Pundit = () => CC.Pundit;

  // Explains Power and the chemistry bonuses, with live progress for the viewer's own cabinet.
  function bonusModal() {
    const S = app.S;
    const me = S && S.phase !== 'lobby' && locals().find((id) => S.teams[id]);
    let progress = '';
    if (me) {
      const seats = S.teams[me].seats, fs = seats.filter((x) => x != null).map(pol);
      const count = (key) => { const c = {}; fs.forEach((f) => (c[key(f)] = (c[key(f)] || 0) + 1)); return Object.entries(c).sort((a, b) => b[1] - a[1])[0] || ['', 0]; };
      const [topC, nC] = count((f) => f.c), [topE, nE] = count((f) => f.e);
      const conts = new Set(fs.map((f) => D.COUNTRIES[f.c].cont)).size;
      const fitN = seats.filter((x, i) => x != null && pol(x).tags.includes(CC.SK[i])).length;
      const row = (icon, text, got) => `<li class="${got ? 'got' : ''}"><span>${icon}</span>${text}</li>`;
      progress = `<h3 class="sub">${app.role === 'local' ? `${pname(me)}'s` : 'Your'} cabinet so far (${fs.length}/${SEATS.length} ministers)</h3><ul class="bprog">
        ${row('🏳️', nC ? `${nC} from ${esc(D.COUNTRIES[topC].name)}${nC >= 3 ? ` — <b>+${Math.min(3, nC - 2)}</b>` : ` — ${3 - nC} more for +1`}` : 'No ministers yet', nC >= 3)}
        ${row('🌍', `${conts} ${conts === 1 ? 'continent' : 'continents'}${conts >= 4 ? ` — <b>+2</b>` : ` — ${4 - conts} more for +2`}`, conts >= 4)}
        ${row('⏳', nE ? `${nE} of ${SEATS.length} from ${CC.ERAS[topE]}${nE === SEATS.length ? ' — <b>+2</b>' : ''}` : 'No ministers yet', nE === SEATS.length)}
        ${row('🧩', revealed() ? `${fitN} of ${SEATS.length} fit their seat${fitN === SEATS.length ? ' — <b>+3</b>' : ''}` : 'Seat fit stays secret until the cabinets are sworn in', fitN === SEATS.length && revealed())}
      </ul>`;
    }
    return `<div class="modal" data-a="closeModal"><div class="sheet" data-stop>
      <h2>Power &amp; cabinet bonuses</h2>
      <p><b>Cabinet Power</b> = the seven assigned skill ratings (1–9 each), +1 per household name (★★★), plus the bonuses below. It describes the cabinet and breaks tied tournament standings after crisis wins. It is <b>not</b> a crisis response score or tournament points.</p>
      <table class="btable">
        <tr><td>🏳️</td><td><b>Country united</b><small>3 or more ministers from the same country</small></td><td>+1 / +2 / +3<small>for 3 / 4 / 5 or more ministers</small></td></tr>
        <tr><td>🌍</td><td><b>Global coalition</b><small>Ministers from 4 or more continents</small></td><td>+2<small>for 4 or more continents</small></td></tr>
        <tr><td>⏳</td><td><b>Era dream team</b><small>All ${SEATS.length} from one era: before 1945, 1945–1999 or the 21st century</small></td><td>+2</td></tr>
        <tr><td>🧩</td><td><b>Perfect fit</b><small>All ${SEATS.length} ministers have an assigned skill of at least 7</small></td><td>+3</td></tr>
      </table>
      <p class="small">Bonuses stack — a cabinet can earn several at once. ${S && S.settings && S.settings.hints !== 2 ? 'With Experience hints off, Power and bonuses appear when the cabinets are sworn in.' : ''}</p>
      ${progress}
      <div class="row"><button class="btn" data-a="closeModal">Got it</button></div>
    </div></div>`;
  }

  /* ---------- home ---------- */
  function vHome() {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `<main class="home">
      <section class="mast">
        <div class="mast-rule"><span>The fantasy government auction</span><span>${today} · <button class="mast-link" data-a="settings">Settings</button></span></div>
        <h1 class="logo">Cabinet <em>Clash</em></h1>
        <p class="dek">Draft a dream government of real politicians from any era. Outbid your rivals for every ministry, then see whose cabinet survives the crises.</p>
      </section>
      <section class="play">
        <label class="namefield" for="nm"><span>Your name</span><input id="nm" maxlength="18" autocomplete="nickname" placeholder="e.g. ${esc(app.sample)}" value="${esc(app.name)}"></label>
        <div class="options">
          <button class="opt" data-a="solo"><span class="opt-i">🎯</span><b>Play solo</b><small>You against AI rival cabinets</small></button>
          <button class="opt" data-a="local"><span class="opt-i">🛋️</span><b>Pass &amp; play</b><small>Friends around one screen</small></button>
          <div class="opt online"><span class="opt-i">📡</span><b>Online with friends</b><small>Everyone on their own phone</small>
            <button class="btn" data-a="create">Create a room</button>
            <div class="join"><input id="jc" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CODE" value="${esc(app.joinCode)}"><button class="btn ghost" data-a="join">Join</button></div>
          </div>
        </div>
        ${app.err ? `<p class="err">${esc(app.err)}</p>` : ''}
      </section>
      <section class="how">
        <div><b>1</b><h3>Pick a deck</h3><p>Legends, the world, your own mix of countries, continents, modern leaders or history.</p></div>
        <div><b>2</b><h3>Bid for ministers</h3><p>Live auction with a ticking timer. ${D.POLS.length} real politicians, seven ministries, limited credits. Go all in if you dare.</p></div>
        <div><b>3</b><h3>Survive the crises</h3><p>Choose which ministers tackle each crisis. Save specialists for later — or argue it out and vote.</p></div>
        <div><b>4</b><h3>Face the pundit</h3><p>An AI rates every government, then roasts them against each other.</p></div>
      </section>
      <section class="ballot">
        <h2>On today's ballot</h2>
        <div class="ballot-row">${app.ballot.map((i) => { const f = pol(i); return `<div class="bcard">${portrait(f, 'md')}<b>${esc(f.n)}</b><small>${flag(f.c, 'sm')} ${esc(f.r)}</small></div>`; }).join('')}</div>
      </section>
      <section class="atlas-cta"><button class="btn ghost" data-a="atlas">📇 Who's who — browse all ${D.POLS.length} politicians and their skills</button></section>
      <footer class="foot">A party game about real politicians. Not an endorsement of anyone. Portraits from Wikipedia; flags from flagcdn.</footer>
    </main>`;
  }
  function vConnecting() {
    return topbar() + `<main class="center"><div class="spin"></div><p>${app.role === 'host' ? 'Opening your room…' : `Joining room <b>${esc(app.code)}</b>…`}</p><button class="btn ghost" data-a="home">Cancel</button></main>`;
  }

  /* ---------- lobby ---------- */
  function vLobby() {
    const S = app.S, st = S.settings, adm = isAdmin();
    const n = E.poolFor(st).length, need = E.minPool(S), problem = E.canStart(S);
    const title = app.role === 'client' ? 'Waiting for the host' : app.role === 'host' ? 'Your room is open' : 'Set up the game';
    const link = location.origin + location.pathname + '?room=' + app.code;
    const online = app.role === 'host' || app.role === 'client' ? `<section class="panel invite">
        <div><small>Room code</small><div class="code">${esc(app.code)}</div></div>
        <div class="invite-r">${app.role === 'host'
          ? `<p>Friends open this page and enter the code, or use the link. Keep this tab open — your browser runs the game.</p><div class="row"><button class="btn" data-a="copy" data-v="${esc(link)}">Copy invite link</button>${navigator.share ? `<button class="btn ghost" data-a="share" data-v="${esc(link)}">Share…</button>` : ''}</div>`
          : '<p>You are in! The host picks the deck and starts the game.</p>'}</div>
      </section>` : '';

    let extra = '';
    if (st.mode === 'countries') {
      const counts = {};
      D.POLS.forEach((f) => { if (f.t <= st.fame) counts[f.c] = (counts[f.c] || 0) + 1; });
      const presets = [['G7', 'G7'], ['BIG5', 'EU big five'], ['V4', 'Visegrád'], ['CZSK', 'Czechoslovakia'], ['BRICS', 'BRICS'], ['NA', 'North America']];
      extra = `<div class="countries">
        <div class="row wrap">${adm ? `<input id="cs" class="search" placeholder="Search countries…" value="${esc(app.csearch)}">` : ''}
          ${adm ? presets.map(([k, l]) => `<button class="chip small" data-a="preset" data-v="${k}">${l}</button>`).join('') + '<button class="chip small" data-a="clearCountries">Clear</button>' : ''}</div>
        <p class="small">${st.countries.length} selected: ${st.countries.map((c) => `${flag(c, 'sm')} ${esc(D.COUNTRIES[c].name)}`).join(', ') || 'none yet'}</p>
        ${D.CONTINENTS.map((ct) => `<div class="cgroup"><h4>${ct}</h4><div class="chips">${Object.values(D.COUNTRIES).filter((c) => c.cont === ct && counts[c.code])
          .sort((a, b) => counts[b.code] - counts[a.code])
          .map((c) => `<button class="chip cty ${st.countries.includes(c.code) ? 'on' : ''}" data-a="country" data-c="${c.code}" data-name="${esc(c.name.toLowerCase())}" ${adm ? '' : 'disabled'}>${flag(c.code, 'sm')}${esc(c.name)}<small>${counts[c.code]}</small></button>`).join('')}</div></div>`).join('')}
      </div>`;
    } else if (st.mode === 'continents') {
      const counts = {};
      D.POLS.forEach((f) => { if (f.t <= st.fame) { const ct = D.COUNTRIES[f.c].cont; counts[ct] = (counts[ct] || 0) + 1; } });
      extra = `<div class="chips">${D.CONTINENTS.map((ct) => chip(st.continents.includes(ct), 'continent', `data-v="${ct}"`, `${ct}<small>${counts[ct] || 0}</small>`, !adm)).join('')}</div>`;
    }
    const fame = st.mode === 'legends' ? '' : `<h3>Fame filter</h3><div class="chips">${[1, 2, 3].map((v) => chip(st.fame === v, 'set', `data-k="fame" data-v="${v}"`, `${'★'.repeat(4 - v)} ${CC.FAME[v]}`, !adm)).join('')}</div>`;

    const players = S.players.map((p) => `<li style="--c:${p.color}">${dot(p.id)}
        ${adm && (app.role === 'local' || p.id === app.me[0]) && !p.bot ? `<button class="lnk name" data-a="rename" data-id="${p.id}" title="Rename">${esc(p.name)} ✎</button>` : `<b class="name">${esc(p.name)}</b>`}
        ${p.bot ? `<button class="tag ai" data-a="botLevel" data-id="${p.id}" ${adm ? '' : 'disabled'} title="Change difficulty">AI · ${E.tierOf(p)} ${E.AI_TIERS[E.tierOf(p) - 1]}</button>` : mine(p.id) ? '<em class="tag">you</em>' : ''}
        ${p.off ? '<em class="tag">offline</em>' : ''}
        ${adm && p.id !== app.me[0] && !(app.role === 'local' && S.players.filter((x) => !x.bot).length <= 1 && !p.bot) ? `<button class="x" data-a="remove" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">✕</button>` : ''}
      </li>`).join('');
    const full = S.players.length >= CC.MAXP;
    const addRow = adm ? `<div class="row wrap">
        ${app.role === 'local' ? `<input id="hn" class="search" maxlength="18" placeholder="Friend's name" value="${esc(app.addName)}"><button class="btn small" data-a="addHuman" ${full ? 'disabled' : ''}>+ Add player</button>` : ''}
        <span class="tier-pick"><button class="btn small ghost" data-a="addBot" ${full ? 'disabled' : ''}>+ Add AI rival</button>
          <input id="bt" type="range" min="1" max="6" step="1" value="${app.botTier}" aria-label="AI difficulty">
          <output id="btl">${tierLabel(app.botTier)}</output></span>
      </div>` : '';

    const solo = S.kind === 'solo';
    const rules = `
      <h3>Budget</h3><div class="chips">${[20, 30, 40].map((v) => chip(st.budget === v, 'set', `data-k="budget" data-v="${v}"`, v + ' credits', !adm)).join('')}</div>
      <p class="small">All-in bids are allowed. At zero credits, wait for paid bidding to finish; then receive free random recruits for your vacant ministries.</p>
      <h3>Bid timer</h3><div class="chips">${[5, 8, 12].map((v) => chip(st.timer === v, 'set', `data-k="timer" data-v="${v}"`, v + ' s', !adm)).join('')}</div>
      <h3>Discards allowed</h3><div class="chips">${[0, 3, 5, 10, -1].map((v) => chip(st.discards === v, 'set', `data-k="discards" data-v="${v}"`, v < 0 ? 'No limit' : v, !adm)).join('')}</div>
      <p class="small">${st.discards < 0 ? 'Unwanted politicians are always discarded (until the deck runs dry).' : 'After that, a random player who can pay and has a vacancy recruits them for 1 credit.'}</p>
      <h3>Who wins a duel?</h3><div class="chips">${chip(st.judge === 'crisis', 'set', 'data-k="judge" data-v="crisis"', '🃏 Crisis responses', !adm)}${chip(st.judge === 'hand', 'set', 'data-k="judge" data-v="hand"', '🎴 Crisis hand', !adm)}${chip(st.judge === 'auto', 'set', 'data-k="judge" data-v="auto"', '🎲 Auto crises', !adm)}${solo ? '' : chip(st.judge === 'vote', 'set', 'data-k="judge" data-v="vote"', '🗣️ Argue &amp; vote', !adm)}</div>
      <p class="small">${st.judge === 'auto' ? 'The original mode: three random crises are decided automatically by the ministers holding the tested seats, plus cabinet chemistry and a 1–3 dice. Just watch the reveal.' : st.judge === 'hand' ? 'Each player gets four crisis cards and plays two; one more is random. Send two ministers into each of the five crises — the game never tells you which seats a crisis tests. Scored out of 100 per crisis.' : st.judge === 'crisis' ? 'Choose two ministers per crisis, each usable once per duel. Three visible cards, career skills, small background bonuses and 1–3 luck.' : 'The two players defend their cabinets out loud; everyone else votes.'}</p>
      <h3>Experience hints</h3><div class="chips">${chip(st.hints === 0, 'set', 'data-k="hints" data-v="0"', 'Hard · vague job titles', !adm)}${chip(st.hints === 1, 'set', 'data-k="hints" data-v="1"', 'Normal · real roles', !adm)}${chip(st.hints === 2, 'set', 'data-k="hints" data-v="2"', 'Easy · show ratings', !adm)}</div>
      <p class="small">${st.hints === 2 ? 'Cards show all seven skill ratings and live cabinet Power.' : st.hints === 1 ? 'Cards show each person\'s real job; ratings and scores stay secret until the cabinets are sworn in.' : 'Job titles are vague ("Czech cabinet minister") so the card doesn\'t give the seat away. Everything is revealed at the swearing-in.'}</p>
      <h3>Showdown length</h3><div class="chips">${chip(st.rounds === 'all', 'set', 'data-k="rounds" data-v="all"', 'Everyone vs everyone', !adm)}${chip(st.rounds === 'quick', 'set', 'data-k="rounds" data-v="quick"', 'Quick · 3 rounds', !adm)}</div>`;

    return topbar() + `<main class="lobby">
      <h1 class="h1">${title}</h1>
      ${online}
      <div class="lobby-grid">
        <section class="panel deck">
          <h2><span class="num">1</span> Pick the deck</h2>
          <div class="modes">${CC.MODES.map((m) => `<button class="mode ${st.mode === m.k ? 'on' : ''}" data-a="set" data-k="mode" data-v="${m.k}" ${adm ? '' : 'disabled'}><span>${m.icon}</span><b>${m.name}</b><small>${m.desc}</small></button>`).join('')}</div>
          ${extra}
          ${fame}
          <p class="pool ${n < need ? 'bad' : ''}"><b>${n}</b> politicians in this deck${n < need ? ` · need ${need}` : ''}</p>
        </section>
        <section class="panel players">
          <h2><span class="num">2</span> Players <small>${S.players.length}/${CC.MAXP}</small></h2>
          <ul class="plist">${players}</ul>
          ${roomTable(S)}
          ${addRow}
          ${solo ? '<p class="small">AI rivals each have a style — the Hawk loves generals, the Tycoon pays for economists. Tap a rival\'s badge to change its difficulty.</p>' : ''}
        </section>
        <section class="panel rulesp">
          <h2><span class="num">3</span> House rules</h2>
          ${rules}
        </section>
      </div>
      <div class="start-row">
        ${problem ? `<p class="err">${esc(problem)}</p>` : ''}
        ${adm ? `<button class="btn big" data-a="start" ${problem ? 'disabled' : ''}>Start the auction →</button>` : '<p class="muted">The host will start the game.</p>'}
      </div>
    </main>`;
  }

  /* ---------- auction ---------- */
  function bidControls(pid, compact) {
    const S = app.S, p = P(pid), label = compact ? `<span class="bc-who">${dot(pid)}${esc(p.name)} <small>${S.teams[pid].cr} cr</small></span>` : '';
    if (E.free(S, pid) === 0) return `<div class="bc muted">${label}<span>Cabinet complete — enjoy the show</span></div>`;
    if (S.bid && S.bid.by === pid) return `<div class="bc leading">${label}<span>You lead at <b>${S.bid.v}</b>. Hold your nerve…</span></div>`;
    if (S.teams[pid].cr === 0) return `<div class="bc muted">${label}<span>No credits left — your ${E.free(S, pid)} vacancies will receive free random recruits after paid bidding ends.</span></div>`;
    if (S.passed.includes(pid)) return `<div class="bc muted">${label}<span>Passed on this one</span></div>`;
    const cur = S.bid ? S.bid.v : 0, mx = E.maxBid(S, pid);
    if (mx <= cur) return `<div class="bc muted">${label}<span>Can't outbid — your max is ${mx}</span><button class="btn small ghost" data-a="pass" data-p="${pid}">Pass</button></div>`;
    const opts = [...new Set([cur + 1, cur + 2, cur + 3, mx])].filter((v) => v <= mx).sort((a, b) => a - b);
    return `<div class="bc">${label}<div class="bids">${opts.map((v) => `<button class="bidb ${v === mx ? 'max' : ''}" data-a="bid" data-p="${pid}" data-v="${v}"><b>${v}</b><small>${v === mx ? 'all in' : cur ? '+' + (v - cur) : v === 1 ? 'credit' : 'credits'}</small></button>`).join('')}
      <button class="passb" data-a="pass" data-p="${pid}">Pass</button></div>${compact ? '' : `<p class="keys">Keys: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> raise · <kbd>M</kbd> max · <kbd>P</kbd> pass · max bid ${mx}. All in leaves zero credits; vacancies are filled free after paid bidding ends.</p>`}</div>`;
  }
  function stagePanel() {
    const S = app.S;
    if (S.phase === 'auction') {
      const loc = locals().filter((id) => S.teams[id]);
      return `<div class="bidbox">
          <small class="lbl">Highest bid</small>
          <div class="bidnum ${S.bid ? '' : 'none'}">${S.bid ? S.bid.v : '–'}</div>
          <div class="leader">${S.bid ? who(S.bid.by) : '<span class="muted">No bids yet — opens at 1</span>'}</div>
          ${fuse(S)}
        </div>
        <div class="controls ${loc.length > 1 ? 'multi' : ''}">${loc.map((id) => bidControls(id, loc.length > 1)).join('')}</div>`;
    }
    if (S.phase === 'assign') {
      const s = S.sold, f = pol(s.f), t = S.teams[s.by];
      const head = s.fill ? `<div class="stamp">Free recruitment</div><p>Paid bidding is over. ${who(s.by)} receives ${esc(f.s)} for <b>0 credits</b> to fill a vacancy.</p>` : s.rnd ? `<div class="stamp red">Nobody wanted ${esc(f.s)}</div><p>Discards are used up — ${who(s.by)} gets them for <b>1 credit</b>.</p>`
        : `<div class="stamp">Sold!</div><p>${who(s.by)} wins ${esc(f.s)} for <b>${s.v}</b> ${s.v === 1 ? 'credit' : 'credits'}.</p>`;
      if (!mine(s.by)) return `<div class="soldbox">${head}<p class="muted">Choosing a seat…</p>${fuse(S)}</div>`;
      return `<div class="soldbox">${head}
        <h3>${app.role === 'local' ? pname(s.by) + ', pick' : 'Pick'} a seat for ${esc(f.s)}</h3>
        <div class="seatpick">${SEATS.map((st, i) => {
          const taken = t.seats[i] != null, sc = E.seatScore(s.f, st.k), fit = hintsOn() && f.tags.includes(st.k);
          return `<button class="seat ${fit ? 'fit' : ''}" data-a="seat" data-p="${s.by}" data-seat="${i}" ${taken ? 'disabled' : ''}>
            <span class="si">${st.icon}</span><b>${st.name}</b><small>${taken ? esc(pol(t.seats[i]).s) : hintsOn() ? `${sc} power${fit ? ' · fits' : ''}` : 'free'}</small><kbd>${i + 1}</kbd></button>`;
        }).join('')}</div>
        ${fuse(S)}<p class="small">Time runs out → a seat is picked for you.</p></div>`;
    }
    if (S.phase === 'sold') {
      const s = S.sold, f = pol(s.f);
      if (!s.by) return `<div class="soldbox"><div class="stamp red">Discarded</div><p>Nobody bid on ${esc(f.s)}.</p><p class="small">Discards used: ${S.discUsed}${S.settings.discards >= 0 ? ' of ' + S.settings.discards : ''}</p></div>`;
      return `<div class="soldbox"><div class="stamp ${s.rnd ? 'red' : ''}">${s.fill ? 'Free recruit' : s.rnd ? 'Assigned' : 'Sold!'}</div>
        <p>${esc(f.s)} joins ${who(s.by)} as <b>${SEATS[s.seat].icon} ${SEATS[s.seat].name}</b> for ${s.v} ${s.v === 1 ? 'credit' : 'credits'}.</p>
        ${hintsOn() ? `<p class="small">${E.seatScore(s.f, SEATS[s.seat].k)} cabinet Power in that seat${f.tags.includes(SEATS[s.seat].k) ? ' — a natural fit' : ''}.</p>` : ''}</div>`;
    }
    return '';
  }
  function vAuction() {
    const S = app.S;
    const fi = S.phase === 'auction' ? S.cur : S.sold && S.sold.f;
    const lim = S.settings.discards;
    const status = S.filling ? 'Paid bidding complete · free recruitment' : `Lot <b>${S.lot}</b> · ${S.deck.length} left · discards ${S.discUsed}${lim >= 0 && !S.noDisc ? '/' + lim : ''}`;
    const order = S.players.map((p) => p.id).sort((a, b) => (mine(b) ? 1 : 0) - (mine(a) ? 1 : 0));
    const log = S.log.length ? `<section class="log"><h3>Recent deals</h3>${S.log.slice(0, 5).map((l) => `<span>${who(l.by)} ${SEATS[l.seat].icon} ${esc(pol(l.f).s)} <b>${l.v}</b></span>`).join('')}</section>` : '';
    return topbar(status) + `<main class="stage">
      <div class="stage-grid">
        <div class="stage-card ${S.phase !== 'auction' ? 'dim' : ''}" data-lot="${S.lot}">${fi != null ? bigCard(fi) : ''}</div>
        <div class="stage-panel">${stagePanel()}</div>
      </div>
      ${cabs(order)}
      ${log}
    </main>`;
  }

  /* ---------- pundit panel ---------- */
  function punditPanel() {
    const S = app.S, R = S.pundit, adm = isAdmin();
    let body;
    const houseFirst = LS.get('cc-pundit', '') === 'house';
    const free = Pundit().freeSupported(), fm = Pundit().FREE_MODELS[Pundit().freeModel()];
    if (app.pundBusy) body = `<div class="think"><div class="spin sm"></div><p>${esc(app.pundProgress || 'The pundit is studying the cabinets…')}</p></div>`;
    else if (!R) {
      body = `<p>Get a verdict on every cabinet: first a serious analysis, then a roast that pits them against each other.</p>
        ${adm ? `<div class="row wrap">
          ${houseFirst ? '<button class="btn" data-a="askHouse">⚡ House pundit (instant)</button>' : ''}
          <button class="btn ${houseFirst ? 'ghost' : ''}" data-a="askFree" ${free ? '' : 'disabled'}>🆓 Free AI pundit</button>
          ${houseFirst ? '' : '<button class="btn ghost" data-a="askHouse">⚡ House pundit (instant)</button>'}
          <button class="lnk" data-a="aiSettings">About the free AI</button></div>
          <p class="small">${free
            ? `Free AI runs ${esc(fm.label)} right in this browser — no account, no key, nothing sent to a server. The first time it downloads ${fm.size}, then it's cached. Small models can get facts wrong.`
            : 'The free AI needs WebGPU (Chrome or Edge on a computer). This browser can use the house pundit instead.'}</p>` : '<p class="muted">The host can call in the pundit.</p>'}
        ${app.pundErr ? `<p class="err">${esc(app.pundErr)}</p>` : ''}`;
    } else {
      const tab = app.ptab;
      const name = (id) => (P(id) ? who(id) : '');
      const content = tab === 'serious'
        ? `<p class="lead">${esc(R.serious.summary)}</p>${R.serious.cabinets.map((c, i) => `<div class="verdict" style="--c:${(P(c.id) || {}).color}">
            <div class="vh"><span class="rank">${i + 1}</span>${name(c.id)}<span class="score">${c.score.toFixed(1)}<small>/10</small></span></div>
            <h4>${esc(c.headline)}</h4>
            <p><b>Strength:</b> ${esc(c.strengths)}</p><p><b>Weakness:</b> ${esc(c.weaknesses)}</p><p class="vv">${esc(c.verdict)}</p></div>`).join('')}`
        : `<p class="lead roast-h">${esc(R.roast.headline)}</p>${R.roast.cabinets.map((c) => `<div class="verdict roast" style="--c:${(P(c.id) || {}).color}"><div class="vh">${name(c.id)}</div>
            ${c.lines ? `<ul class="roast-lines">${c.lines.map((l) => `<li><span class="si" title="${esc(SEATS[l.seat].name)}">${SEATS[l.seat].icon}</span><span>${esc(l.joke)}</span></li>`).join('')}</ul>` : ''}
            ${c.roast ? `<p class="roast-all">${esc(c.roast)}</p>` : ''}</div>`).join('')}<p class="closer">${esc(R.roast.closer)}</p>`;
      body = `<div class="tabs" role="tablist"><button class="${tab === 'serious' ? 'on' : ''}" data-a="ptab" data-v="serious">🧐 Serious</button><button class="${tab === 'roast' ? 'on' : ''}" data-a="ptab" data-v="roast">🔥 Roast</button></div>
        ${content}
        ${adm ? `<div class="row wrap"><button class="lnk" data-a="${R.source === 'free' ? 'askFree' : 'askHouse'}">Ask again</button>
          ${R.source !== 'free' && free ? '<button class="lnk" data-a="askFree">Ask the free AI</button>' : ''}
          ${R.source !== 'house' ? '<button class="lnk" data-a="askHouse">Instant house verdict</button>' : ''}</div>` : ''}
        ${app.pundErr ? `<p class="err">${esc(app.pundErr)}</p>` : ''}`;
    }
    const src = R ? `<span class="src">${R.source === 'free' ? `free AI · ${esc(R.model || '')} in the host's browser` : 'house pundit · offline'}</span>` : '';
    return `<section class="panel pundit"><header><h2>🎙️ The Pundit</h2>${src}</header>${body}</section>`;
  }

  /* ---------- cabinets sworn in ---------- */
  function vCabinets() {
    const S = app.S;
    const how = S.settings.judge === 'auto'
      ? 'Each duel draws three random crises. Each one tests two ministries: the ministers holding them score their skill, plus cabinet chemistry and a 1–3 dice. Best of three wins.'
      : S.settings.judge === 'hand'
      ? 'Each duel: play two of your four crisis cards, one more is random, then send two ministers into each of the five crises. Seat relevance matters most.'
      : S.settings.judge === 'crisis'
      ? 'See three crises, then choose two ministers for each. Each minister responds once per duel. Relevant skills, assigned ministries and the card’s setting drive the score; luck adds only 1–3.'
      : 'Each duel, the two players defend their cabinets out loud — then everyone else votes.';
    return topbar('All seats filled') + `<main class="sworn">
      <h1 class="h1">The cabinets are sworn in</h1>
      <p class="lead">${how} Win = 3 tournament points, draw = 1. <button class="lnk" data-a="bonus">What are Power and cabinet bonuses?</button></p>
      ${cabs(S.players.map((p) => p.id), { cls: 'big' })}
      ${punditPanel()}
      <div class="start-row">${isAdmin() ? '<button class="btn big" data-a="next">Start the showdown →</button>' : '<p class="muted">Waiting for the host to start the showdown…</p>'}</div>
    </main>`;
  }

  /* ---------- showdown briefing ---------- */
  function crisisSeats(cr) {
    const name = (k) => { const s = SEATS.find((s) => s.k === k); return `${s.icon} ${esc(s.name)}`; };
    return `${name(cr.p)} ×2 + ${name(cr.q)}`;
  }
  function crisisContext(cr) {
    const geography = cr.c ? `${esc(D.COUNTRIES[cr.c].name)} (+2) / ${esc(D.COUNTRIES[cr.c].cont)} (+1)` : `${esc(cr.cont)} (+1)`;
    return `${geography} · ${CC.ERAS[cr.e]} (+1)`;
  }
  function responsePart(part, cr) {
    const f = pol(part.f), seat = SEATS.find((s) => s.k === part.k);
    return `<div class="response-part"><b>${esc(f.n)} <span>${seat.icon} ${esc(seat.name)}</span></b>
      <small>Skills: ${f.sk[cr.p]} × 2 + ${f.sk[cr.q]} = ${part.ability} · ministry +${part.portfolio} · geography +${part.geography} · era +${part.era} <strong>= ${part.v}</strong></small></div>`;
  }
  function scoreBreakdown(side, cr) {
    return side.parts.map((part) => responsePart(part, cr)).join('') + `<p class="small score-sum">Ministers ${side.tot - side.roll} + luck ${side.roll} = <b>${side.tot} response score</b></p>`;
  }
  function crisisSchedule(S, d) {
    return `<div class="crisis-schedule">${d.cards.map((ci, i) => {
      const c = CC.CRISES[ci], done = d.r.crises[i];
      return `<article class="cc ${i === S.crisisIndex ? 'current' : ''} ${done ? 'resolved' : ''}"><span class="small">${done ? 'Resolved' : i === S.crisisIndex ? 'Now' : 'Later'} · ${i + 1} of 3</span><b>${c.i} ${esc(c.n)}</b><small>${crisisSeats(c)}</small><small>${crisisContext(c)}</small><p>${esc(c.desc)}</p></article>`;
    }).join('')}</div>`;
  }
  function vBriefing() {
    const S = app.S, crisis = S.settings.judge === 'crisis';
    const len = S.settings.rounds === 'quick' ? 'Three rounds — each cabinet plays up to three duels.' : 'Every cabinet meets every other cabinet once.';
    const step = (n, h, p) => `<div class="bstep"><b>${n}</b><h3>${h}</h3><p>${p}</p></div>`;
    let body;
    if (S.settings.judge === 'auto') {
      body = `<div class="brief-steps">
          ${step(1, 'Three random crises', 'Each duel draws three crises from the deck. Every crisis tests two ministries — the card shows which.')}
          ${step(2, 'Your ministers answer', 'Whoever holds those seats scores their skill rating there (+1 for a ★★★ name). No choices to make: your auction decided it.')}
          ${step(3, 'Chemistry and dice', 'Add your cabinet bonuses and a 1–3 dice for public mood. The higher total wins the crisis.')}
          ${step(4, 'Best of three', 'Win more crises to take the duel: 3 tournament points, a draw gives 1 each.')}
        </div>`;
    } else if (S.settings.judge === 'hand') {
      body = `<div class="brief-steps">
          ${step(1, 'Play two cards', 'You get four crisis cards and secretly play two. Your rival does the same, and one more crisis is drawn at random: five crises per duel.')}
          ${step(2, 'Send two ministers each', 'For every crisis, choose two different cabinet members. Each minister can be sent at most twice in the whole duel, so spread your people.')}
          ${step(3, 'Hidden priorities', 'Cards only tell the story. Behind each one, some ministries matter a lot, some a little. Out of 100: up to 60 for the minister\'s seat being relevant, 25 for their personal skills, 15 for matching region and era, plus small synergy and a 1–3 dice.')}
          ${step(4, 'Highest total wins', 'Add up your five crisis scores: the higher total wins the duel (3 tournament points), crises won break a tie. The reveal shows what each crisis really needed.')}
        </div>`;
    } else if (crisis) {
      const me = locals().find((id) => S.teams[id]) || S.players[0].id, ci = 0, ex = CC.CRISES[ci];
      let best;
      for (let a = 0; a < SEATS.length; a++) for (let b = a + 1; b < SEATS.length; b++) {
        const score = E.responseScore(S, me, ci, [a, b], 0);
        if (!best || score.tot > best.tot) best = score;
      }
      const whose = mine(me) && app.role !== 'local' ? 'your' : `${pname(me)}'s`;
      body = `<div class="brief-steps">
          ${step(1, 'Read three cards', 'All three crises are visible at the start of each duel. They show the primary and supporting skills, region and historical setting.')}
          ${step(2, 'Send two ministers', 'Take turns choosing two different cabinet members. Each minister can respond only once per duel, so save specialists for later. Choices are public; the first chooser alternates. You have 45 seconds, then the game chooses for you.')}
          ${step(3, 'Skills lead the score', 'For each minister: 2 × primary skill + supporting skill. Their assigned ministry adds +3 for primary or +2 for support. Matching country adds +2, otherwise matching continent +1; matching era adds +1. Add both ministers and one luck roll of 1–3.')}
          ${step(4, 'Win more crises', 'Higher response score wins each crisis; equal scores tie. More crisis wins takes the duel: 3 tournament points for a win, 1 each for a draw. Everyone is available again next duel.')}
        </div>
        <section class="panel example">
          <h2>Example with ${whose} cabinet</h2>
          <p><span class="ci">${ex.i}</span> <b>${esc(ex.n)}</b> · ${crisisSeats(ex)}</p>
          <p class="small">${crisisContext(ex)}. Country and continent bonuses do not stack.</p>
          ${best.parts.map((p) => responsePart(p, ex)).join('')}
          <p><b>${best.tot} from the ministers + 1–3 luck = ${best.tot + 1}–${best.tot + 3} response score.</b></p>
          <p class="small">This is the strongest pair for this one card. Saving one of them for a later crisis may be wiser. Cabinet Power, chemistry and fame do not add to a crisis response. Response scores are separate from tournament points.</p>
        </section>
        <section class="panel cdeck-wrap">
          <h2>The crisis deck <small>${CC.CRISES.length} fictional scenarios</small></h2>
          <p class="small">The country and era describe the scenario, not an event that these politicians necessarily faced. Biographical background uses the same broad countries and eras as the politician deck.</p>
          <div class="cdeck">${CC.CRISES.map((c) => `<div class="cc"><span class="ci">${c.i}</span><b>${esc(c.n)}</b><small>${crisisSeats(c)}</small><small>${crisisContext(c)}</small></div>`).join('')}</div>
        </section>`;
    } else {
      body = `<div class="brief-steps">
          ${step(1, 'Face-off', 'Two cabinets meet head-to-head. Everyone sees both line-ups.')}
          ${step(2, 'Argue out loud', 'The two owners defend their cabinets. No timer: press Ready when you are done.')}
          ${step(3, 'Everyone else votes', 'Players outside the duel vote for the better government. With only two players, both vote — disagreement is a draw.')}
          ${step(4, 'Tournament points', 'Win = 3 tournament points, draw = 1 each. Cabinet Power is a reference and tie-breaker; persuasion decides the duel.')}
        </div>`;
    }
    return topbar('Before the showdown') + `<main class="brief">
      <h1 class="h1">How the showdown works</h1>
      <p class="lead">${S.settings.judge === 'auto' ? '🎲 Sit back: the crises decide.' : S.settings.judge === 'hand' ? '🎴 Play your crisis cards, then send in your ministers.' : crisis ? '🃏 Choose who tackles each crisis.' : '🗣️ Argue it out and vote.'} ${len}</p>
      ${body}
      <div class="start-row">${isAdmin() ? '<button class="btn big" data-a="next">Got it — start the duels →</button>' : '<p class="muted">Waiting for the host to start the duels…</p>'}</div>
    </main>`;
  }

  /* ---------- crisis decisions ---------- */
  function responseDraft() {
    const S = app.S, key = `${S.di}:${S.crisisIndex}:${S.responseTurn}`;
    if (app.responseDraft.key !== key) app.responseDraft = { key, seats: [] };
    return app.responseDraft.seats;
  }
  function toggleResponder(seat) {
    const S = app.S;
    if (!S || S.phase !== 'respond' || !mine(S.responseTurn)) return;
    const d = S.duels[S.di];
    if (!Number.isInteger(seat) || seat < 0 || seat >= SEATS.length || d.used[S.responseTurn].includes(seat)) return;
    const selected = responseDraft(), at = selected.indexOf(seat);
    if (at >= 0) selected.splice(at, 1);
    else if (selected.length < 2) selected.push(seat);
    else { toast('Choose two ministers — deselect one to change your response.'); return; }
    render();
  }
  function vRespond() {
    const S = app.S, d = S.duels[S.di], pid = S.responseTurn, ci = d.cards[S.crisisIndex], cr = CC.CRISES[ci];
    const canPick = mine(pid), selected = responseDraft(), used = d.used[pid];
    const pair = selected.length === 2 ? E.responseScore(S, pid, ci, selected, 0) : null;
    const locked = [d.a, d.b].filter((id) => d.responses[id]);
    const controls = canPick ? `<div class="response-grid">${SEATS.map((s, i) => {
      const f = pol(S.teams[pid].seats[i]), spent = used.includes(i), on = selected.includes(i);
      const part = E.responseScore(S, pid, ci, [i], 0).parts[0];
      return `<button class="response-option ${on ? 'selected' : ''}" data-a="chooseResponder" data-seat="${i}" aria-pressed="${on}" ${spent ? 'disabled' : ''}>
        <span class="response-person">${portrait(f, 'xs')}<b>${esc(f.n)}</b><strong>${spent ? 'Used' : part.v}</strong></span>
        <span>${s.icon} ${esc(s.name)} · ${esc(D.COUNTRIES[f.c].name)} · ${CC.ERAS[f.e]}</span>
        <small>${spent ? 'Already responded in this duel' : `Skills ${f.sk[cr.p]} × 2 + ${f.sk[cr.q]} = ${part.ability} · ministry +${part.portfolio} · geography +${part.geography} · era +${part.era}`}</small>
      </button>`;
    }).join('')}</div>
    <div class="response-confirm" aria-live="polite"><p>${pair ? `<b>${pair.tot + 1}–${pair.tot + 3}</b> response score, including 1–3 luck` : `Choose ${2 - selected.length} ${selected.length ? 'more minister' : 'ministers'}`}</p>
      <button class="btn" data-a="submitResponse" ${pair ? '' : 'disabled'}>Send these two →</button></div>` : `<p class="lead">Waiting for ${who(pid)} to choose two ministers…</p>`;
    return topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length} · crisis ${S.crisisIndex + 1}/3`) + `<main class="duel">
      <h1 class="h1">${pname(d.a)} vs ${pname(d.b)}</h1>
      <p class="lead">Plan ahead: each minister can respond <b>once per duel</b>. The two ministers you send now cannot answer later cards.</p>
      ${crisisSchedule(S, d)}
      <section class="panel response-panel" style="--c:${P(pid).color}">
        <h2>${cr.i} ${esc(cr.n)}</h2><p>${esc(cr.desc)}</p>
        <p><b>${crisisSeats(cr)}</b> · ${crisisContext(cr)}</p>
        <p class="small">Per minister: relevant skills + assigned ministry (+3 primary / +2 support) + geography (country +2 or continent +1) + era (+1). One 1–3 luck roll for the pair.</p>
        <h3>${who(pid)}${canPick ? ', choose your response' : ' is responding'}</h3>
        ${controls}${fuse(S)}
        <p class="small">Choices are public; the first chooser alternates. At 45 seconds, the game selects a response while saving specialists for the remaining cards.</p>
        ${locked.length ? `<div class="locked-responses">${locked.map((id) => `<p><b>${pname(id)} has sent:</b> ${d.responses[id].map((i) => esc(pol(S.teams[id].seats[i]).n)).join(' + ')}</p>`).join('')}</div>` : ''}
      </section>
      ${cabs([d.a, d.b])}
      ${standingsMini()}
    </main>`;
  }

  /* ---------- Crisis hand ---------- */
  function handDraft(key, init) {
    if (app.hand.key !== key) app.hand = { key, v: init };
    return app.hand.v;
  }
  const seatOf = (k) => SEATS.find((s) => s.k === k);
  const where = (c) => `${c.c ? `${flag(c.c, 'sm')} ${esc(D.COUNTRIES[c.c].name)}` : esc(c.cont)} · ${CC.ERAS[c.e]}`;
  const handHeader = (S, d) => topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length}`) + `<main class="duel"><h1 class="h1">${pname(d.a)} vs ${pname(d.b)}</h1>`;
  function vHand() {
    const S = app.S, d = S.duels[S.di], me = [d.a, d.b].find((id) => mine(id) && !d.picks[id]);
    let body;
    if (me) {
      const sel = handDraft(`pick${S.di}${me}`, []);
      body = `<h2>${pname(me)}, play two of your four crises</h2>
        <p class="small">${app.role === 'local' ? 'Everyone else: look away! ' : ''}Your rival plays two of theirs and one more is drawn at random. Then you both send ministers to all five — so play crises your cabinet can handle.</p>
        <div class="hand">${d.hand[me].map((ci) => {
          const c = CC.CRISES[ci], on = sel.includes(ci);
          return `<button class="hcard ${on ? 'on' : ''}" data-a="handCard" data-c="${ci}" aria-pressed="${on}"><span class="ci">${c.i}</span><b>${esc(c.n)}</b><small>${esc(c.desc)}</small><small class="where">${where(c)}</small></button>`;
        }).join('')}</div>
        <div class="start-row"><button class="btn big" data-a="submitPick" ${sel.length === 2 ? '' : 'disabled'}>Play these two →</button></div>`;
    } else {
      body = `<p class="lead">Waiting for ${[d.a, d.b].filter((id) => !d.picks[id]).map((id) => who(id)).join(' and ')} to choose crises…</p>`;
    }
    return handHeader(S, d) + `<section class="panel">${body}${fuse(S)}</section>${cabs([d.a, d.b])}${standingsMini()}</main>`;
  }
  function vDeploy() {
    const S = app.S, d = S.duels[S.di], me = [d.a, d.b].find((id) => mine(id) && !d.plans[id]);
    if (!me) {
      return handHeader(S, d) + `<section class="panel"><p class="lead">Waiting for ${[d.a, d.b].filter((id) => !d.plans[id]).map((id) => who(id)).join(' and ')} to send their ministers…</p>${fuse(S)}</section>${cabs([d.a, d.b])}${standingsMini()}</main>`;
    }
    const plan = handDraft(`plan${S.di}${me}`, d.cards.map(() => [null, null]));
    const uses = SEATS.map((_, i) => plan.reduce((n, pr) => n + pr.filter((x) => x === i).length, 0));
    const done = plan.every((pr) => pr.every((x) => x != null));
    const team = S.teams[me];
    const rows = d.cards.map((ci, c) => {
      const cr = CC.CRISES[ci], by = d.picks[d.a].includes(ci) ? `played by ${pname(d.a)}` : d.picks[d.b].includes(ci) ? `played by ${pname(d.b)}` : 'drawn at random';
      const select = (slot) => `<select class="plan-sel" data-a="planSel" data-c="${c}" data-s="${slot}" aria-label="Minister ${slot + 1} for ${esc(cr.n)}">
        <option value="">Choose a minister…</option>${SEATS.map((st, i) => {
          const f = pol(team.seats[i]), left = E.HAND_USES - uses[i] + (plan[c][slot] === i ? 1 : 0);
          return `<option value="${i}" ${plan[c][slot] === i ? 'selected' : ''} ${left <= 0 || plan[c][1 - slot] === i ? 'disabled' : ''}>${st.icon} ${esc(f.s)} — ${esc(st.name)}</option>`;
        }).join('')}</select>`;
      return `<div class="plan-row"><div class="plan-card"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${esc(cr.desc)}</small><small class="where">${where(cr)} · ${by}</small></div>
        <div class="plan-picks">${select(0)}${select(1)}</div></div>`;
    }).join('');
    return handHeader(S, d) + `<section class="panel">
      <h2>${pname(me)}, send two ministers into each crisis</h2>
      <p class="small">${app.role === 'local' ? 'Everyone else: look away! ' : ''}Send two different ministers to each crisis. Each minister can be used at most ${E.HAND_USES}× in this duel.</p>
      <div class="uses">${SEATS.map((st, i) => `<span class="${uses[i] >= E.HAND_USES ? 'full' : ''}">${st.icon} ${esc(pol(team.seats[i]).s)} <b>${uses[i]}/${E.HAND_USES}</b></span>`).join('')}</div>
      ${rows}
      <div class="start-row"><button class="btn big" data-a="submitPlan" ${done ? '' : 'disabled'}>Send them in →</button></div>${fuse(S)}
    </section>${cabs([me])}${standingsMini()}</main>`;
  }
  function handSide(side) {
    return side.slots.map((sl) => `<div class="response-part"><b>${esc(pol(sl.f).s)} <span>${seatOf(sl.k).icon} ${esc(seatOf(sl.k).name)}</span></b>
      <small>seat ${sl.seat} + skill ${sl.skill} + background ${sl.bg} <strong>= ${sl.v}</strong></small></div>`).join('') +
      `<p class="small score-sum">Average ${side.tot - side.synergy - side.roll}${side.synergy ? ` + synergy ${side.synergy}` : ''} + dice ${side.roll} = <b>${side.tot}/100</b></p>`;
  }
  function vReveal() {
    const S = app.S, d = S.duels[S.di], r = d.r, shown = S.phase === 'duelres' ? r.crises.length : S.step;
    const rev = r.crises.slice(0, shown), ta = rev.reduce((s, c) => s + c.A.tot, 0), tb = rev.reduce((s, c) => s + c.B.tot, 0);
    const rows = d.cards.map((ci, i) => {
      const c = CC.CRISES[ci], x = r.crises[i];
      const by = d.picks[d.a].includes(ci) ? `played by ${pname(d.a)}` : d.picks[d.b].includes(ci) ? `played by ${pname(d.b)}` : 'drawn at random';
      if (i >= shown) return `<div class="crisis hidden"><span class="ci">${c.i}</span><b>${esc(c.n)}</b><small>${by}</small></div>`;
      return `<div class="crisis w-${x.w} ${i === shown - 1 && S.phase === 'reveal' ? 'flipped' : ''}">
        <div class="side a"><b class="tot">${x.A.tot}</b><small>${pname(d.a)} · out of 100</small>${handSide(x.A)}</div>
        <div class="cmid"><span class="ci">${c.i}</span><b>${esc(c.n)}</b><small>${where(c)} · ${by}</small>
          <small>Needed most: ${seatOf(c.p).icon} ${esc(seatOf(c.p).name)}, then ${seatOf(c.q).icon} ${esc(seatOf(c.q).name)}</small>
          <strong>${x.w === 't' ? 'Tied crisis' : `${pname(x.w === 'a' ? d.a : d.b)} handles it better`}</strong></div>
        <div class="side b"><b class="tot">${x.B.tot}</b><small>${pname(d.b)} · out of 100</small>${handSide(x.B)}</div>
      </div>`;
    }).join('');
    let res = '';
    if (S.phase === 'duelres') {
      const w = d.w;
      res = `<div class="result">${w === 't' ? '<div class="stamp">Draw</div><p>1 tournament point each.</p>' : `<div class="stamp gold">${pname(w === 'a' ? d.a : d.b)} wins!</div><p>${r.ta} – ${r.tb} crisis points · +3 tournament points</p>`}
        ${fuse(S)}${isAdmin() ? `<button class="btn" data-a="next">${S.di + 1 < S.duels.length ? 'Next duel →' : 'Final results →'}</button>` : ''}</div>`;
    }
    return topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length}`) + `<main class="duel">
      <div class="vs-row">
        ${cabinet(d.a, { cls: d.w === 'a' ? 'won' : '' })}
        <div class="vs"><span>VS</span><div class="score"><b>${ta}</b>–<b>${tb}</b></div><small>crisis points</small></div>
        ${cabinet(d.b, { cls: d.w === 'b' ? 'won' : '' })}
      </div>
      <section class="crises">${rows}</section>${res}
      ${S.phase === 'reveal' && isAdmin() ? '<div class="start-row"><button class="lnk" data-a="next">Skip to the result →</button></div>' : ''}
      ${standingsMini()}
    </main>`;
  }

  /* ---------- Auto crises ---------- */
  function autoParts(side) {
    const by = {};
    side.parts.forEach((x) => { by[x.k] = by[x.k] ? Object.assign({}, by[x.k], { n: 2 }) : Object.assign({ n: 1 }, x); });
    return Object.values(by).map((x) => `${esc(pol(x.f).s)} ${x.v}${x.n > 1 ? '×2' : ''}`).join(' + ') + (side.ch ? ` + chem ${side.ch}` : '') + ` + 🎲${side.roll}`;
  }
  const autoSeats = (cr) => [cr.p, cr.q].map((k) => { const st = SEATS.find((x) => x.k === k); return `${st.icon} ${esc(st.name)}`; }).join(' + ');
  function vAutoDuel() {
    const S = app.S, d = S.duels[S.di], r = d.r, shown = S.phase === 'duelres' ? 3 : S.step;
    // The newest crisis keeps "?" scores for a moment before the numbers flip in.
    const revealAt = S.phase === 'autoduel' && shown > 0 ? S.deadline - S.dur + SUSPENSE_MS : 0;
    const suspense = revealAt > Date.now() + app.offset;
    app.sig.revealAt = suspense ? revealAt : 0;
    if (suspense && app.sig.revealTimerFor !== revealAt) {
      app.sig.revealTimerFor = revealAt;
      setTimeout(() => { if (app.sig.revealAt === revealAt) { app.sig.revealAt = 0; Sound.play('bid'); render(); } }, revealAt - (Date.now() + app.offset) + 30);
    }
    const rev = r.crises.slice(0, suspense ? shown - 1 : shown);
    const wa = rev.filter((c) => c.w === 'a').length, wb = rev.filter((c) => c.w === 'b').length;
    const current = shown > 0 && S.phase === 'autoduel' ? CC.CRISES[r.crises[shown - 1].ci] : null;
    const rows = r.crises.map((c, i) => {
      const cr = CC.CRISES[c.ci], newest = i === shown - 1 && S.phase === 'autoduel';
      if (i >= shown) return `<div class="crisis hidden"><span class="ci">❓</span><b>Crisis ${i + 1}</b></div>`;
      if (newest && suspense) return `<div class="crisis fresh suspense">
        <div class="side a"><b class="tot">?</b><small>${pname(d.a)}'s ministers step up…</small></div>
        <div class="cmid"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${autoSeats(cr)}</small></div>
        <div class="side b"><b class="tot">?</b><small>${pname(d.b)}'s ministers step up…</small></div></div>`;
      return `<div class="crisis w-${c.w} ${newest ? 'flipped' : ''}">
        <div class="side a"><b class="tot">${c.A.tot}</b><small>${autoParts(c.A)}</small></div>
        <div class="cmid"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${autoSeats(cr)}</small></div>
        <div class="side b"><b class="tot">${c.B.tot}</b><small>${autoParts(c.B)}</small></div></div>`;
    }).join('');
    let res = '';
    if (S.phase === 'duelres') {
      const w = d.w;
      res = `<div class="result">${w === 't' ? '<div class="stamp">Draw</div><p>1 tournament point each.</p>' : `<div class="stamp gold">${pname(w === 'a' ? d.a : d.b)} wins!</div><p>+3 tournament points</p>`}
        ${fuse(S)}${isAdmin() ? `<button class="btn" data-a="next">${S.di + 1 < S.duels.length ? 'Next duel →' : 'Final results →'}</button>` : ''}</div>`;
    }
    const hl = current ? [current.p, current.q] : null;
    return topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length}`) + `<main class="duel">
      <div class="vs-row">
        ${cabinet(d.a, { hl, cls: d.w === 'a' ? 'won' : '' })}
        <div class="vs"><span>VS</span><div class="score"><b>${wa}</b>–<b>${wb}</b></div><small>crises won</small></div>
        ${cabinet(d.b, { hl, cls: d.w === 'b' ? 'won' : '' })}
      </div>
      <section class="crises">${rows}</section>${res}
      ${S.phase === 'autoduel' && isAdmin() ? '<div class="start-row"><button class="lnk" data-a="next">Skip animation</button></div>' : ''}
      ${standingsMini()}
    </main>`;
  }

  /* ---------- Who's who ---------- */
  // Who's who: birth periods for the filter, read from each person's years ("1874–1965", "c. 600–530 BC", "b. 1954").
  const BIRTH = [['anc', 'Ancient world'], ['early', '1300–1799'], ['1800', '1800s'], ['1900', '1900–1949'], ['1950', '1950 or later']];
  function birthPeriod(f) {
    if (f._bp) return f._bp;
    const m = /(\d{1,4})/.exec(f.y || ''), rest = m ? f.y.slice(m.index + m[1].length) : '';
    const y = !m ? null : /^[^A]*BC/.test(rest) ? -m[1] : +m[1];
    return (f._bp = y == null || y < 1000 ? 'anc' : y < 1800 ? 'early' : y < 1900 ? '1800' : y < 1950 ? '1900' : '1950');
  }
  const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : arr.concat(v));
  function vAtlas() {
    const q = app.atlasQ.trim().toLowerCase(), k = app.atlasSeat;
    const plain = (x) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const { atlasCont: conts, atlasCty: ctys, atlasEra: eras } = app;
    const contOk = (f) => !conts.length || conts.includes(D.COUNTRIES[f.c].cont);
    const list = D.POLS.filter((f) => (!k || f.sk[k] >= 7) && contOk(f) &&
      (!ctys.length || ctys.includes(f.c)) && (!eras.length || eras.includes(birthPeriod(f))) &&
      (!q || plain(`${f.n} ${D.COUNTRIES[f.c].name} ${f.r}`).includes(plain(q))))
      .sort((a, b) => (k ? b.sk[k] - a.sk[k] : 0) || a.t - b.t || a.n.localeCompare(b.n));
    const active = (k ? 1 : 0) + conts.length + ctys.length + eras.length;
    const count = (pred) => D.POLS.filter(pred).length;
    // Countries are listed only for the chosen continents (or all of them), grouped, behind their own toggle.
    const byCont = D.CONTINENTS.filter((ct) => !conts.length || conts.includes(ct)).map((ct) => {
      const cs = Object.keys(D.COUNTRIES).filter((c) => D.COUNTRIES[c].cont === ct)
        .map((c) => [c, count((f) => f.c === c)]).filter(([, n]) => n).sort((a, b) => D.COUNTRIES[a[0]].name.localeCompare(D.COUNTRIES[b[0]].name));
      return cs.length ? `<div class="cgroup"><h4>${esc(ct)}</h4><div class="chips">${cs.map(([c, n]) => chip(ctys.includes(c), 'atlasCty', `data-v="${c}"`, `${flag(c, 'sm')} ${esc(D.COUNTRIES[c].name)}<small>${n}</small>`)).join('')}</div></div>` : '';
    }).join('');
    const picked = [k && SEATS.find((s) => s.k === k).name, ...conts, ...ctys.map((c) => D.COUNTRIES[c].name), ...eras.map((e) => BIRTH.find((b) => b[0] === e)[1])].filter(Boolean);
    const filters = `<section class="atlas-filters ${app.atlasOpen ? 'open' : ''}">
        <button class="atlas-toggle" data-a="atlasOpen" aria-expanded="${app.atlasOpen}">Filters${active ? ` <b>${active}</b>` : ''}<span aria-hidden="true">${app.atlasOpen ? '▴' : '▾'}</span></button>
        ${active ? `<span class="atlas-picked">${picked.map(esc).join(' · ')}</span><button class="lnk" data-a="atlasClear">Clear all</button>` : ''}
        ${app.atlasOpen ? `<div class="atlas-panel">
          <h3>Best ministry</h3><div class="chips">${chip(!k, 'atlasSeat', 'data-v=""', 'Any')}${SEATS.map((s) => chip(k === s.k, 'atlasSeat', `data-v="${s.k}"`, `${s.icon} ${esc(s.name)}`)).join('')}</div>
          <h3>Born</h3><div class="chips">${BIRTH.map(([v, l]) => chip(eras.includes(v), 'atlasEra', `data-v="${v}"`, `${l}<small>${count((f) => birthPeriod(f) === v)}</small>`)).join('')}</div>
          <h3>Continent</h3><div class="chips">${D.CONTINENTS.map((ct) => chip(conts.includes(ct), 'atlasCont', `data-v="${esc(ct)}"`, `${esc(ct)}<small>${count((f) => D.COUNTRIES[f.c].cont === ct)}</small>`)).join('')}</div>
          <h3><button class="atlas-sub" data-a="atlasCtyOpen" aria-expanded="${app.atlasCtyOpen}">Countries${ctys.length ? ` (${ctys.length} picked)` : ''} <span aria-hidden="true">${app.atlasCtyOpen ? '▴' : '▾'}</span></button></h3>
          ${app.atlasCtyOpen ? `<div class="atlas-countries">${byCont}</div>` : ''}
        </div>` : ''}
      </section>`;
    return topbar("Who's who") + `<main class="atlas">
      <button class="btn ghost small back" data-a="home">← Back</button>
      <h1 class="h1">Who's who</h1>
      <p class="lead">Every politician in the game with their skill in each ministry (1–9). Ratings come from their real careers: 7+ means real experience, 4–5 useful background.</p>
      <div class="row wrap"><input id="ws" class="search" placeholder="Search name, country or role…" value="${esc(app.atlasQ)}" autocomplete="off"></div>
      ${filters}
      <p class="small">${list.length} ${k ? `strong in ${esc(SEATS.find((s) => s.k === k).name)} (7+), best first` : 'politicians'} · tap one for the full profile</p>
      ${list.length ? '' : '<p class="lead">Nobody matches these filters. <button class="lnk" data-a="atlasClear">Clear all</button></p>'}
      <div class="atlas-grid">${list.map((f) => `<button class="atlas-card" data-a="profile" data-i="${f.i}">${portrait(f, 'md')}<b>${esc(f.n)}</b><small>${flag(f.c, 'sm')} ${esc(f.r)}</small>
        ${k ? `<span class="atlas-score">${SEATS.find((s) => s.k === k).icon} ${f.sk[k]}</span>` : ''}</button>`).join('')}</div>
    </main>`;
  }
  function profileModal() {
    const f = pol(app.profile);
    if (!f) return '';
    return `<div class="modal" data-a="closeModal"><div class="sheet profile" data-stop>
      <div class="profile-head">${portrait(f, 'md')}<div>
        <h2>${esc(f.n)}</h2>
        <p>${flag(f.c)} ${esc(D.COUNTRIES[f.c].name)} · ${CC.ERAS[f.e]} · ${stars(f.t)}</p>
        <p>${esc(f.r)}</p><p class="small">${esc(f.y)}</p>
      </div></div>
      <h3 class="sub">Skills by ministry</h3>
      <ul class="skill-bars">${SEATS.map((s) => `<li class="${f.sk[s.k] >= 7 ? 'strong' : ''}"><span>${s.icon} ${esc(s.name)}</span><i><b style="width:${(f.sk[s.k] / 9) * 100}%"></b></i><strong>${f.sk[s.k]}</strong></li>`).join('')}</ul>
      <p class="small">In a seat, a minister scores their rating there, plus 1 for a ★★★ household name.</p>
      <div class="row"><a class="btn ghost" href="https://en.wikipedia.org/wiki/${encodeURIComponent(f.w.replace(/ /g, '_'))}" target="_blank" rel="noopener">Wikipedia ↗</a><button class="btn" data-a="closeModal">Close</button></div>
    </div></div>`;
  }

  /* ---------- room leaderboard ---------- */
  function roomTable(S) {
    const room = S.room;
    if (!room || !room.games) return '';
    const rows = Object.values(room.rows).sort((a, b) => b.pts - a.pts || b.wins - a.wins);
    return `<section class="room-board"><h3>Room leaderboard · ${room.games} ${room.games === 1 ? 'game' : 'games'}</h3>
      <table class="table"><thead><tr><th></th><th>Player</th><th>Wins</th><th>Points</th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td><span class="who"><span class="dot" style="--c:${r.color}"></span>${esc(r.name)}</span></td><td>${r.wins}</td><td><b>${r.pts}</b></td></tr>`).join('')}
      </tbody></table><p class="small">Adds up every game while the same people keep playing.</p></section>`;
  }

  /* ---------- duels ---------- */
  const SUSPENSE_MS = 1800;
  function vDuel() {
    const S = app.S, d = S.duels[S.di], r = d.r, shown = r.crises.length;
    const revealAt = S.phase === 'duel' ? S.deadline - S.dur + SUSPENSE_MS : 0;
    const suspense = revealAt > Date.now() + app.offset;
    app.sig.revealAt = suspense ? revealAt : 0;
    if (suspense && app.sig.revealTimerFor !== revealAt) {
      app.sig.revealTimerFor = revealAt;
      setTimeout(() => { if (app.sig.revealAt === revealAt) { app.sig.revealAt = 0; Sound.play('bid'); render(); } }, revealAt - (Date.now() + app.offset) + 30);
    }
    const rev = r.crises.slice(0, suspense ? shown - 1 : shown);
    const wa = rev.filter((c) => c.w === 'a').length, wb = rev.filter((c) => c.w === 'b').length;
    const current = CC.CRISES[d.cards[S.crisisIndex]], curK = S.phase === 'duel' ? [current.p, current.q] : null;
    const rows = d.cards.map((ci, i) => {
      const cr = CC.CRISES[ci], c = r.crises[i], newest = i === shown - 1 && S.phase === 'duel';
      if (!c) return `<div class="crisis hidden"><span class="ci">${cr.i}</span><b>Next: ${esc(cr.n)}</b><small>${crisisSeats(cr)}</small></div>`;
      if (newest && suspense) return `<div class="crisis fresh suspense">
        <div class="side a"><b class="tot">?</b><small>${pname(d.a)}'s ministers step up…</small></div>
        <div class="cmid"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${crisisSeats(cr)}</small></div>
        <div class="side b"><b class="tot">?</b><small>${pname(d.b)}'s ministers step up…</small></div></div>`;
      return `<div class="crisis w-${c.w} ${newest ? 'flipped' : ''}">
        <div class="side a"><b class="tot">${c.A.tot}</b><small>${pname(d.a)} · response score</small>${scoreBreakdown(c.A, cr)}</div>
        <div class="cmid"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${crisisSeats(cr)}</small><small>${crisisContext(cr)}</small><strong>${c.w === 't' ? 'Tied crisis' : `${pname(c.w === 'a' ? d.a : d.b)} wins this crisis`}</strong></div>
        <div class="side b"><b class="tot">${c.B.tot}</b><small>${pname(d.b)} · response score</small>${scoreBreakdown(c.B, cr)}</div>
      </div>`;
    }).join('');
    let res = '';
    if (S.phase === 'duelres') {
      const w = d.w;
      res = `<div class="result">${w === 't' ? '<div class="stamp">Draw</div><p>1 tournament point each.</p>' : `<div class="stamp gold">${pname(w === 'a' ? d.a : d.b)} wins!</div><p>+3 tournament points</p>`}
        ${fuse(S)}${isAdmin() ? `<button class="btn" data-a="next">${S.di + 1 < S.duels.length ? 'Next duel →' : 'Final results →'}</button>` : ''}</div>`;
    }
    return topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length}`) + `<main class="duel">
      <div class="vs-row">
        ${cabinet(d.a, { hl: curK, cls: d.w === 'a' ? 'won' : '' })}
        <div class="vs"><span>VS</span><div class="score"><b>${wa}</b>–<b>${wb}</b></div><small>crises won</small></div>
        ${cabinet(d.b, { hl: curK, cls: d.w === 'b' ? 'won' : '' })}
      </div>
      <section class="crises">${rows}</section>${res}
      ${S.phase === 'duel' && isAdmin() ? `<div class="start-row"><button class="lnk" data-a="next">${shown < 3 ? 'Next crisis →' : 'Duel result →'}</button></div>` : ''}
      ${standingsMini()}
    </main>`;
  }
  function vDebate() {
    const S = app.S, d = S.duels[S.di], local = app.role === 'local' || app.role === 'solo';
    const voters = E.voters(S);
    let panel;
    if (S.phase === 'debate') {
      panel = `<h2>Debate time!</h2><p>${who(d.a)} and ${who(d.b)}: argue out loud why <i>your</i> cabinet would govern better. Everyone else — grill them.</p>`;
      if (local) panel += '<button class="btn big" data-a="skip">Done arguing — vote now</button>';
      else {
        const me = app.me[0], done = S.ready.includes(me);
        panel += done ? '<p class="muted">You are ready. Waiting for the others…</p>' : '<button class="btn big" data-a="ready">I\'m ready to vote</button>';
        panel += `<p class="small">Ready: ${S.ready.map((id) => pname(id)).join(', ') || 'nobody yet'}</p>`;
        if (isAdmin()) panel += '<button class="lnk" data-a="skip">Skip to the vote</button>';
      }
    } else if (S.phase === 'vote') {
      if (local) {
        panel = `<h2>Who governs better?</h2><p>Decide together:</p><div class="vote3">
          <button class="vbtn" style="--c:${P(d.a).color}" data-a="gvote" data-v="a">${pname(d.a)}'s cabinet</button>
          <button class="vbtn tie" data-a="gvote" data-v="t">Too close — draw</button>
          <button class="vbtn" style="--c:${P(d.b).color}" data-a="gvote" data-v="b">${pname(d.b)}'s cabinet</button></div>`;
      } else {
        const me = app.me[0];
        panel = '<h2>Who governs better?</h2>';
        if (voters.includes(me) && !S.votes[me]) {
          panel += `${S.players.length === 2 ? '<p class="small">Two players: if you vote differently, it\'s a draw.</p>' : ''}<div class="vote3">
            <button class="vbtn" style="--c:${P(d.a).color}" data-a="vote" data-v="a">${pname(d.a)}'s cabinet</button>
            <button class="vbtn" style="--c:${P(d.b).color}" data-a="vote" data-v="b">${pname(d.b)}'s cabinet</button></div>`;
        } else panel += `<p class="muted">${voters.includes(me) ? 'Vote cast.' : 'Your cabinet is on trial — the others are voting.'}</p>`;
        panel += `<p class="small">Voted: ${voters.filter((id) => S.votes[id]).map((id) => pname(id)).join(', ') || 'nobody yet'} · waiting for ${voters.filter((id) => !S.votes[id]).map((id) => pname(id)).join(', ') || 'nobody'}</p>`;
        if (isAdmin()) panel += '<button class="lnk" data-a="skip">Close the vote now</button>';
      }
    } else {
      const w = d.w, votes = (d.r && d.r.votes) || {};
      panel = `${w === 't' ? '<div class="stamp">Draw</div>' : `<div class="stamp gold">${pname(w === 'a' ? d.a : d.b)} wins!</div>`}
        ${Object.keys(votes).length ? `<p class="small">${Object.entries(votes).map(([v, k]) => `${pname(v)} → ${pname(k === 'a' ? d.a : d.b)}`).join(' · ')}</p>` : ''}
        ${fuse(S)}${isAdmin() ? `<button class="btn" data-a="next">${S.di + 1 < S.duels.length ? 'Next duel →' : 'Final results →'}</button>` : ''}`;
    }
    return topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length}`) + `<main class="duel">
      <div class="vs-row">${cabinet(d.a, { cls: d.w === 'a' ? 'won' : '' })}<div class="vs"><span>VS</span></div>${cabinet(d.b, { cls: d.w === 'b' ? 'won' : '' })}</div>
      <section class="panel debate">${panel}</section>
      ${standingsMini()}
    </main>`;
  }
  function standingsMini() {
    const S = app.S;
    return `<section class="mini-table" aria-label="Tournament standings"><small>Tournament points</small>${E.standings(S).map((r, i) => `<span>${i + 1}. ${who(r.p.id)} <b>${r.pts}</b></span>`).join('')}</section>`;
  }

  /* ---------- final ---------- */
  function vFinal() {
    const S = app.S, st = E.standings(S), win = st[0];
    const sameRank = (a, b) => a.pts === b.pts && a.rec.cw === b.rec.cw && a.pow === b.pow && a.cr === b.cr;
    const winners = st.filter((r) => sameRank(r, win));
    const tie = winners.length > 1;
    const crisis = S.settings.judge !== 'vote';
    const youWon = winners.some((r) => mine(r.p.id)) && app.role !== 'local';
    const rows = st.map((r, i) => `<tr class="${mine(r.p.id) && app.role !== 'local' ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][st.findIndex((other) => sameRank(other, r))] || st.findIndex((other) => sameRank(other, r)) + 1}</td><td>${who(r.p.id)}</td><td><b>${r.pts}</b></td><td>${r.rec.w}-${r.rec.d}-${r.rec.l}</td>${crisis ? `<td>${r.rec.cw}</td>` : ''}<td>${r.pow}</td><td>${r.cr}</td></tr>`).join('');
    const results = S.duels.map((d) => `<span>${pname(d.a)} <b>${d.r && d.r.crises ? d.r.wa + '–' + d.r.wb : d.w === 'a' ? 'W–L' : d.w === 'b' ? 'L–W' : 'D'}</b> ${pname(d.b)}</span>`).join('');
    return topbar('Final results') + `<main class="final">
      <section class="winner" style="--c:${win.p.color}">
        <small>${tie ? 'Equal after every tie-breaker' : 'Election night result'}</small>
        <h1>${tie ? 'Shared victory!' : youWon ? 'Your cabinet takes power!' : `${esc(win.p.name)}'s cabinet takes power`}</h1>
        ${tie ? `<p>${winners.map((r) => esc(r.p.name)).join(' &amp; ')}</p>` : ''}
        <p>${win.pts} tournament points · ${win.rec.w} wins · cabinet power ${win.pow}</p>
      </section>
      <div class="final-grid">
        <section class="panel">
          <h2>Standings</h2>
          <table class="table"><thead><tr><th></th><th>Player</th><th title="3 per duel win, 1 per draw">Tournament pts</th><th>W-D-L</th>${crisis ? '<th>Crises</th>' : ''}<th>Power</th><th>Cr left</th></tr></thead><tbody>${rows}</tbody></table>
          <p class="small">Order: tournament points → crises won → cabinet Power → unspent credits. Equal on all four means a shared placing.</p>
          <h3>Awards</h3>
          <ul class="awards">${E.awards(S).map((a) => `<li><span>${a.i}</span><div><b>${esc(a.t)}</b> · ${who(a.by)}<small>${esc(a.d)}</small></div></li>`).join('')}</ul>
          <h3>All duels</h3><div class="results">${results}</div>
          ${roomTable(S)}
        </section>
        ${punditPanel()}
      </div>
      ${cabs(st.map((r) => r.p.id), { cls: 'big' })}
      <div class="start-row">${isAdmin() ? '<button class="btn big" data-a="again">Play again (same players)</button>' : '<p class="muted">The host can start another round.</p>'}<button class="btn ghost" data-a="home">Leave</button></div>
    </main>`;
  }

  /* ---------- render ---------- */
  function view() {
    if (app.view === 'home') return vHome();
    if (app.view === 'atlas') return vAtlas();
    if (app.view === 'connecting') return vConnecting();
    const S = app.S;
    if (!S) return vHome();
    const lost = app.lost ? `<div class="banner">The host's game is offline — it continues by itself when the host is back. <button class="btn small" data-a="reconnect">Reconnect</button></div>`
      : app.netDown ? '<div class="banner">Connection to the game server dropped — reconnecting…</div>' : '';
    let v;
    switch (S.phase) {
      case 'lobby': v = vLobby(); break;
      case 'auction': case 'assign': case 'sold': v = vAuction(); break;
      case 'cabinets': v = vCabinets(); break;
      case 'briefing': v = vBriefing(); break;
      case 'respond': v = vRespond(); break;
      case 'hand': v = vHand(); break;
      case 'deploy': v = vDeploy(); break;
      case 'reveal': v = vReveal(); break;
      case 'autoduel': v = vAutoDuel(); break;
      case 'duel': v = vDuel(); break;
      case 'duelres': v = S.settings.judge === 'auto' ? vAutoDuel() : S.settings.judge === 'hand' ? vReveal() : S.settings.judge === 'crisis' ? vDuel() : vDebate(); break;
      case 'debate': case 'vote': v = vDebate(); break;
      case 'final': v = vFinal(); break;
      default: v = vHome();
    }
    return lost + v;
  }
  let pending = false;
  function render() {
    if (pending) return;
    pending = true;
    const go = () => { if (!pending) return; pending = false; draw(); };
    requestAnimationFrame(go);
    setTimeout(go, 100); // animation frames don't run in hidden tabs
  }
  function draw() {
    const ae = document.activeElement;
    const keep = ae && ae.id && ae.tagName === 'INPUT' ? { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd } : null;
    const scroll = window.scrollY;
    const oldSheet = root.querySelector('.sheet'), sheetScroll = oldSheet ? oldSheet.scrollTop : 0, openModal = oldSheet && app.lastModal;
    const oldCard = root.querySelector('.stage-card .pcard'), oldLot = oldCard && oldCard.parentNode.dataset.lot;
    root.innerHTML = view() + modal() + (app.toast ? `<div class="toast">${esc(app.toast)}</div>` : '');
    // Re-use the candidate card while the lot is the same, so bids don't replay its entrance or reload the photo.
    const slot = root.querySelector('.stage-card');
    if (oldCard && slot && slot.dataset.lot === oldLot) slot.replaceChildren(oldCard);
    else if (slot && slot.firstElementChild) { const c = slot.firstElementChild; setTimeout(() => c.classList.add('dealt'), 450); }
    // A modal that stays open keeps its scroll position.
    const sheet = root.querySelector('.sheet');
    if (sheet && openModal === app.modal) sheet.scrollTop = sheetScroll;
    app.lastModal = app.modal;
    if (keep) {
      const el = document.getElementById(keep.id);
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not text */ } }
    }
    if (app.S && app.S.phase !== app.sig.drawnPhase) { app.sig.drawnPhase = app.S.phase; window.scrollTo(0, 0); }
    else window.scrollTo(0, scroll);
    filterCountries();
    document.body.dataset.phase = app.S ? app.S.phase : 'home';
  }
  function filterCountries() {
    const q = app.csearch.trim().toLowerCase();
    document.querySelectorAll('.cty').forEach((el) => { el.hidden = !!q && !el.dataset.name.includes(q); });
    document.querySelectorAll('.cgroup').forEach((g) => { g.hidden = !!q && !g.querySelector('.cty:not([hidden])'); });
  }
  function toast(msg) {
    app.toast = msg;
    render();
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { app.toast = ''; render(); }, 2200);
  }

  // Timers and countdown ticks update every frame without re-rendering.
  function frame() {
    const now = Date.now() + app.offset;
    document.querySelectorAll('[data-dl]').forEach((el) => {
      const left = Math.max(0, +el.dataset.dl - now), dur = +el.dataset.dur || 1;
      const bar = el.firstElementChild;
      if (bar) bar.style.transform = `scaleX(${Math.min(1, left / dur)})`;
      const s = el.querySelector('.secs');
      if (s) s.textContent = Math.ceil(left / 1000) + 's';
      el.classList.toggle('hot', left < 3000);
    });
    if (app.sig.revealAt && now >= app.sig.revealAt) { app.sig.revealAt = 0; Sound.play('bid'); render(); }
    const S = app.S;
    if (S && S.phase === 'auction') {
      const sec = Math.ceil((S.deadline - now) / 1000);
      if (sec >= 1 && sec <= 3 && sec !== app.sig.tick) { app.sig.tick = sec; Sound.play('tick'); }
    }
    requestAnimationFrame(frame);
  }

  function sfx() {
    const S = app.S, g = app.sig;
    if (!S) return;
    const bidv = S.bid ? S.bid.v : 0;
    if (S.phase === 'auction' && S.lot === g.lot && bidv > (g.bid || 0)) Sound.play('bid');
    if (S.phase !== g.phase) {
      if (S.phase === 'assign' || (S.phase === 'sold' && g.phase === 'auction' && S.sold && S.sold.by)) Sound.play('gavel');
      else if (S.phase === 'sold' && S.sold && !S.sold.by) Sound.play('thud');
      else if (S.phase === 'final' || (S.phase === 'duelres' && S.duels[S.di] && mine(S.duels[S.di][S.duels[S.di].w]))) Sound.play('win');
    }
    if (S.phase === 'duel' && S.step !== g.step && S.step > 0) Sound.play('reveal');
    Object.assign(g, { lot: S.lot, bid: bidv, phase: S.phase, step: S.step });
    if (S.phase === 'auction' && !g.prefetched) {
      g.prefetched = true;
      CC.Img.prefetch(S.deck.slice().reverse().map(pol)); // next-up politicians first
    }
  }

  /* ---------- controller ---------- */
  function changed() {
    const S = app.S;
    S.v++;
    sfx();
    if (app.role === 'host') Net.broadcast(S);
    render();
  }
  function hostTick() {
    const S = app.S;
    if (!S || app.role === 'client') return;
    const now = Date.now();
    let ch = E.tick(S, now);
    for (const [pid, a] of CC.Bots.think(S, now)) if (E.act(S, pid, a, now)) ch = true;
    if (ch) changed();
  }
  // A worker's timer keeps ticking when the host's tab is in the background,
  // where browsers throttle setInterval on the page itself.
  function startLoop() {
    stopLoop();
    try {
      const src = URL.createObjectURL(new Blob(['setInterval(function(){postMessage(0)},120)'], { type: 'text/javascript' }));
      app.worker = new Worker(src);
      app.worker.onmessage = hostTick;
      URL.revokeObjectURL(src);
    } catch (e) {
      app.loop = setInterval(hostTick, 120);
    }
  }
  function stopLoop() {
    if (app.worker) { app.worker.terminate(); app.worker = null; }
    if (app.loop) clearInterval(app.loop);
    app.loop = null;
  }

  function dispatch(pid, a) {
    if (app.role === 'client') { Net.send({ t: 'act', a }); return; }
    if (E.act(app.S, pid, a, Date.now())) changed();
  }
  const admin = (a) => dispatch(adminPid(), a);

  function teardown() {
    stopLoop();
    clearTimeout(app.joinTimer);
    Net.close();
    Object.assign(app, { S: null, role: null, me: [], code: '', lost: false, netDown: false, tokens: {}, offset: 0, pundBusy: false, pundErr: '', sig: {}, responseDraft: { key: '', seats: [] } });
  }
  function goHome(err) {
    teardown();
    app.view = 'home';
    app.err = err || '';
    if (location.search) history.replaceState(null, '', location.pathname);
    render();
  }
  function needName() {
    app.name = app.name.trim();
    if (!app.name) { app.err = 'Type your name first.'; render(); setTimeout(() => { const el = document.getElementById('nm'); if (el) el.focus(); }); return false; }
    LS.set('cc-name', app.name);
    return true;
  }
  function begin(role) {
    teardown();
    app.role = role;
    app.err = '';
    app.S = E.newState(role === 'solo' ? 'solo' : role === 'local' ? 'local' : 'online');
    Object.assign(app.S.settings, myRules()); // Settings → New games start with
    app.view = 'game';
  }
  function startSolo() {
    if (!needName()) return;
    begin('solo');
    const me = E.addPlayer(app.S, { name: app.name, color: myColor() });
    app.me = [me.id];
    ['easy', 'normal', 'hard'].forEach((l) => E.addBot(app.S, l));
    startLoop();
    render();
  }
  function startLocal() {
    begin('local');
    const me = E.addPlayer(app.S, { name: app.name.trim() || 'Player 1', color: myColor() });
    app.me = [me.id];
    E.addPlayer(app.S, { name: 'Player 2' });
    startLoop();
    render();
  }
  function createRoom() {
    if (!needName()) return;
    if (!window.mqtt) { app.err = 'The online library did not load — check your internet connection and reload.'; render(); return; }
    begin('host');
    const me = E.addPlayer(app.S, { name: app.name, color: myColor() });
    app.me = [me.id];
    app.view = 'connecting';
    render();
    const attempt = (tries) => {
      const code = Net.makeCode();
      Net.host(code, {
        open: () => { app.code = code; app.view = 'game'; startLoop(); render(); },
        error: (e) => {
          if (e && e.type === 'unavailable-id' && tries < 4) attempt(tries + 1);
          else if (app.view === 'connecting') goHome(Net.describe(e));
          else toast(Net.describe(e));
        },
        status: (online) => { app.netDown = !online; render(); if (online) changed(); },
        join: onJoin, act: onAct, leave: onLeave,
      });
    };
    attempt(0);
  }
  function onJoin(conn, msg) {
    const S = app.S;
    if (!S) return;
    const token = String(msg.token || '').slice(0, 40);
    let p = app.tokens[token] && P(app.tokens[token]);
    if (!p) {
      if (S.phase !== 'lobby') { conn.send({ t: 'err', m: 'That game has already started.' }); setTimeout(() => conn.close(), 400); return; }
      if (S.players.length >= CC.MAXP) { conn.send({ t: 'err', m: 'That room is full.' }); setTimeout(() => conn.close(), 400); return; }
      let name = String(msg.name || 'Friend').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Friend';
      for (let n = 2; S.players.some((x) => x.name === name); n++) name = String(msg.name).slice(0, 15) + ' ' + n;
      p = E.addPlayer(S, { name, color: msg.color });
      app.tokens[token] = p.id;
    }
    p.off = false;
    conn.pid = p.id;
    const old = Net.conns.get(p.id);
    if (old && old !== conn) try { old.close(); } catch (e) { /* gone */ }
    Net.conns.set(p.id, conn);
    conn.send({ t: 'welcome', pid: p.id, code: app.code });
    changed();
  }
  function onAct(conn, a) {
    if (!conn.pid || E.ADMIN.has(a.t)) return; // lobby and flow controls belong to the host
    dispatch(conn.pid, a);
  }
  function onLeave(conn) {
    const S = app.S;
    if (!S || !conn.pid || Net.conns.get(conn.pid) !== conn) return;
    Net.conns.delete(conn.pid);
    if (S.phase === 'lobby') {
      S.players = S.players.filter((p) => p.id !== conn.pid);
      for (const k in app.tokens) if (app.tokens[k] === conn.pid) delete app.tokens[k];
    } else {
      const p = P(conn.pid);
      if (p) p.off = true;
      if (S.phase === 'vote' && E.voters(S).every((id) => S.votes[id])) E.act(S, adminPid(), { t: 'skip' }, Date.now());
    }
    changed();
  }
  function joinRoom() {
    if (!needName()) return;
    const code = app.joinCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) { app.err = 'Room codes have 4 characters.'; render(); return; }
    if (!window.mqtt) { app.err = 'The online library did not load — check your internet connection and reload.'; render(); return; }
    teardown();
    Object.assign(app, { role: 'client', code, view: 'connecting', err: '' });
    render();
    let token = LS.get('cc-tok-' + code, '');
    if (!token) { token = Math.random().toString(36).slice(2) + Date.now().toString(36); LS.set('cc-tok-' + code, token); }
    Net.join(code, { name: app.name, token, color: myColor() }, {
      msg: (m) => {
        if (m.t === 'welcome') { app.me = [m.pid]; clearTimeout(app.joinTimer); }
        else if (m.t === 'state') {
          app.S = m.s;
          app.offset = (m.now || Date.now()) - Date.now();
          app.view = 'game';
          app.lost = false;
          sfx();
          render();
        } else if (m.t === 'err') goHome(m.m);
      },
      close: () => { if (app.role === 'client' && app.view === 'game') { app.lost = true; render(); } },
      error: (e) => { if (app.view === 'connecting') goHome(Net.describe(e)); else { app.lost = true; render(); } },
    });
    app.joinTimer = setTimeout(() => { if (app.view === 'connecting') goHome('Could not join that room. Check the code and your internet connection, then try again.'); }, 25000);
  }

  async function askPundit(useAI) {
    const S = app.S;
    if (!S || app.pundBusy) return;
    app.pundErr = '';
    if (!useAI) { S.pundit = CC.Pundit.house(S); app.ptab = 'serious'; changed(); return; }
    app.pundBusy = true;
    app.pundProgress = '';
    CC.Pundit.tone = LS.get('cc-tone', '');
    render();
    try {
      const res = await CC.Pundit.askFree(S, (msg) => { app.pundProgress = msg; render(); });
      if (app.S === S) { S.pundit = res; app.ptab = 'serious'; }
    } catch (e) {
      app.pundErr = (e && e.message) || 'The pundit could not be reached.';
    } finally {
      app.pundBusy = false;
      if (app.S === S) changed();
    }
  }

  /* ---------- events ---------- */
  const PRESETS = { G7: ['US', 'GB', 'FR', 'DE', 'IT', 'JP', 'CA'], BIG5: ['DE', 'FR', 'IT', 'ES', 'PL'], V4: ['CZ', 'SK', 'PL', 'HU'], CZSK: ['CZ', 'SK'], BRICS: ['BR', 'RU', 'IN', 'CN', 'ZA'], NA: ['US', 'CA', 'MX', 'CU'] };
  const num = (v) => (/^-?\d+$/.test(v) ? +v : v);

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el) return;
    if (el.dataset.a === 'closeModal' && ev.target.closest('[data-stop]') && !ev.target.closest('button[data-a="closeModal"]')) return;
    if (el.disabled) return;
    const a = el.dataset.a, S = app.S, st = S && S.settings;
    switch (a) {
      case 'solo': return startSolo();
      case 'local': return startLocal();
      case 'create': return createRoom();
      case 'join': return joinRoom();
      case 'reconnect': app.joinCode = app.code; return joinRoom();
      case 'home':
        if (app.S && app.S.phase !== 'lobby' && app.S.phase !== 'final' && !confirm('Leave this game?')) return;
        if (app.role === 'host' && app.S && Net.conns.size && !confirm('You are hosting — leaving ends the game for everyone. Leave?')) return;
        return goHome();
      case 'rules': app.modal = 'rules'; return render();
      case 'bonus': app.modal = 'bonus'; return render();
      case 'atlas': app.view = 'atlas'; CC.Img.prefetch(D.POLS); window.scrollTo(0, 0); return render();
      case 'atlasSeat': app.atlasSeat = el.dataset.v; return render();
      case 'atlasOpen': app.atlasOpen = !app.atlasOpen; return render();
      case 'atlasCtyOpen': app.atlasCtyOpen = !app.atlasCtyOpen; return render();
      case 'atlasCont': app.atlasCont = toggleIn(app.atlasCont, el.dataset.v);
        app.atlasCty = app.atlasCty.filter((c) => !app.atlasCont.length || app.atlasCont.includes(D.COUNTRIES[c].cont)); return render();
      case 'atlasCty': app.atlasCty = toggleIn(app.atlasCty, el.dataset.v); return render();
      case 'atlasEra': app.atlasEra = toggleIn(app.atlasEra, el.dataset.v); return render();
      case 'atlasClear': Object.assign(app, { atlasSeat: '', atlasCont: [], atlasCty: [], atlasEra: [] }); return render();
      case 'profile': app.modal = 'profile'; app.profile = +el.dataset.i; return render();
      case 'aiSettings': app.modal = 'ai'; return render();
      case 'closeModal': app.modal = null; return render();
      case 'mute': Sound.toggle(); return render();
      case 'settings': app.modal = 'settings'; return render();
      case 'theme': setTheme(el.dataset.v); return render();
      case 'pref': setPref(el.dataset.k, el.dataset.v); return render();
      case 'clearData': return clearData();
      case 'ptab': app.ptab = el.dataset.v; return render();
      case 'askFree': return askPundit('free');
      case 'askHouse': return askPundit(false);
      case 'copy':
        (navigator.clipboard ? navigator.clipboard.writeText(el.dataset.v) : Promise.reject()).then(() => toast('Invite link copied!'), () => prompt('Copy this link:', el.dataset.v));
        return;
      case 'share': navigator.share({ title: 'Cabinet Clash', text: `Join my Cabinet Clash room ${app.code}`, url: el.dataset.v }).catch(() => {}); return;
      case 'set': return admin({ t: 'set', patch: { [el.dataset.k]: num(el.dataset.v) } });
      case 'country': {
        const c = el.dataset.c, list = st.countries.includes(c) ? st.countries.filter((x) => x !== c) : st.countries.concat(c);
        return admin({ t: 'set', patch: { countries: list } });
      }
      case 'preset': return admin({ t: 'set', patch: { countries: PRESETS[el.dataset.v] } });
      case 'clearCountries': return admin({ t: 'set', patch: { countries: [] } });
      case 'continent': {
        const c = el.dataset.v, list = st.continents.includes(c) ? st.continents.filter((x) => x !== c) : st.continents.concat(c);
        return admin({ t: 'set', patch: { continents: list } });
      }
      case 'addBot': return admin({ t: 'addBot', level: app.botTier });
      case 'addHuman': { const name = app.addName.trim(); app.addName = ''; return admin({ t: 'addHuman', name }); }
      case 'remove': return admin({ t: 'remove', id: el.dataset.id });
      case 'botLevel': return admin({ t: 'botLevel', id: el.dataset.id });
      case 'rename': {
        const p = P(el.dataset.id), name = p && prompt('New name', p.name);
        if (name) { if (el.dataset.id === app.me[0]) { app.name = name.trim().slice(0, 18); LS.set('cc-name', app.name); } admin({ t: 'rename', id: el.dataset.id, name }); }
        return;
      }
      case 'start': CC.Img.prefetch(E.poolFor(st).map(pol)); return admin({ t: 'start' });
      case 'bid': return dispatch(el.dataset.p, { t: 'bid', v: +el.dataset.v });
      case 'pass': return dispatch(el.dataset.p, { t: 'pass' });
      case 'seat': return dispatch(el.dataset.p, { t: 'seat', seat: +el.dataset.seat });
      case 'chooseResponder': return toggleResponder(+el.dataset.seat);
      case 'submitResponse':
        if (S.phase !== 'respond' || !mine(S.responseTurn) || responseDraft().length !== 2) return;
        return dispatch(S.responseTurn, { t: 'respond', seats: responseDraft().slice() });
      case 'handCard': {
        const d = S.duels[S.di], me = d && [d.a, d.b].find((id) => mine(id) && !d.picks[id]);
        if (S.phase !== 'hand' || !me) return;
        const sel = handDraft(`pick${S.di}${me}`, []), ci = +el.dataset.c, at = sel.indexOf(ci);
        if (at >= 0) sel.splice(at, 1);
        else if (sel.length < 2) sel.push(ci);
        else return toast('Two cards only — tap one to put it back.');
        return render();
      }
      case 'submitPick': {
        const d = S.duels[S.di], me = d && [d.a, d.b].find((id) => mine(id) && !d.picks[id]);
        if (S.phase !== 'hand' || !me) return;
        return dispatch(me, { t: 'pick', cards: handDraft(`pick${S.di}${me}`, []).slice() });
      }
      case 'submitPlan': {
        const d = S.duels[S.di], me = d && [d.a, d.b].find((id) => mine(id) && !d.plans[id]);
        if (S.phase !== 'deploy' || !me) return;
        return dispatch(me, { t: 'deploy', plan: handDraft(`plan${S.di}${me}`, null).map((pr) => pr.slice()) });
      }
      case 'ready': return dispatch(app.me[0], { t: 'ready' });
      case 'vote': return dispatch(app.me[0], { t: 'vote', w: el.dataset.v });
      case 'gvote': return admin({ t: 'gvote', w: el.dataset.v });
      case 'next': case 'skip': case 'again': return admin({ t: a });
    }
  });

  document.addEventListener('change', (ev) => {
    const t = ev.target, S = app.S;
    if (t.dataset.a !== 'planSel' || !S || S.phase !== 'deploy') return;
    const plan = app.hand.v;
    if (!Array.isArray(plan)) return;
    const pr = plan[+t.dataset.c], slot = +t.dataset.s;
    pr[slot] = t.value === '' ? null : +t.value;
    if (pr[slot] != null && pr[1 - slot] === pr[slot]) pr[1 - slot] = null; // never the same minister twice
    render();
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'nm') { app.name = t.value; app.err = ''; }
    else if (t.id === 'jc') { t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); app.joinCode = t.value; }
    else if (t.id === 'cs') { app.csearch = t.value; filterCountries(); }
    else if (t.id === 'hn') app.addName = t.value;
    else if (t.id === 'ws') { app.atlasQ = t.value; render(); }
    else if (t.id === 'bt') { app.botTier = +t.value; LS.set('cc-bot-tier', t.value); document.getElementById('btl').textContent = tierLabel(app.botTier); }
    else if (t.id === 'pn') { app.name = t.value; LS.set('cc-name', t.value.trim()); }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && app.modal) { app.modal = null; render(); return; }
    const t = ev.target;
    if (t.tagName === 'INPUT') {
      if (ev.key === 'Enter') {
        if (t.id === 'jc') joinRoom();
        else if (t.id === 'hn') document.querySelector('[data-a="addHuman"]').click();
      }
      return;
    }
    const S = app.S, loc = locals();
    if (!S || loc.length !== 1 || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const me = loc[0], k = ev.key.toLowerCase();
    if (app.modal || ev.repeat) return;
    if (S.phase === 'auction' && S.teams[me]) {
      const cur = S.bid ? S.bid.v : 0, mx = E.maxBid(S, me);
      const v = { 1: cur + 1, 2: cur + 2, 3: cur + 3, m: mx }[k];
      if (v) { ev.preventDefault(); dispatch(me, { t: 'bid', v: Math.min(v, mx) }); }
      else if (k === 'p') dispatch(me, { t: 'pass' });
    } else if (S.phase === 'assign' && S.sold.by === me && /^[1-7]$/.test(k)) {
      dispatch(me, { t: 'seat', seat: +k - 1 });
    } else if (S.phase === 'respond' && S.responseTurn === me && /^[1-7]$/.test(k)) {
      ev.preventDefault(); toggleResponder(+k - 1);
    }
  });

  CC.Img.onUpdate = render;

  /* ---------- boot ---------- */
  const params = new URLSearchParams(location.search);
  if (params.get('room')) app.joinCode = params.get('room').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const legends = D.POLS.filter((f) => f.t === 1).map((f) => f.i);
  for (let i = 0; i < 6; i++) app.ballot.push(legends.splice(Math.floor(Math.random() * legends.length), 1)[0]);
  CC.Img.prefetch(app.ballot.map(pol)).then(() => CC.Img.prefetch(D.POLS.filter((f) => f.t === 1)));
  window.addEventListener('beforeunload', (ev) => {
    if (app.role === 'host' && Net.conns.size) { ev.preventDefault(); ev.returnValue = ''; }
  });
  render();
  requestAnimationFrame(frame);
  CC.app = app; // handy for debugging in the console
})();
