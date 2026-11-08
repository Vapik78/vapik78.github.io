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

  const app = {
    view: 'home', role: null, S: null, me: [], offset: 0, code: '', err: '', toast: '',
    name: LS.get('cc-name', ''), joinCode: '', csearch: '', addName: '', modal: null, ptab: 'serious',
    pundBusy: false, pundErr: '', pundProgress: '', lost: false, tokens: {}, loop: null, joinTimer: null,
    ballot: [], sig: {}, netDown: false,
    sample: ['Alex', 'Sam', 'Robin', 'Charlie', 'Jordan', 'Kim', 'Max', 'Nova', 'Riley', 'Luca', 'Mila', 'Toni'][Math.floor(Math.random() * 12)],
  };

  /* ---------- small pieces ---------- */
  function hue(c) { let h = 7; for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; }
  function initials(n) {
    return n.split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).map((w) => w[0]).slice(0, 2).join('') || n[0];
  }
  function portrait(f, cls) {
    const u = CC.Img.get(f);
    // The big card shows the whole photo, with a blurred copy filling the empty space around it.
    const img = !u ? `<b>${esc(initials(f.n))}</b>`
      : cls === 'lg' ? `<img class="bg" src="${esc(u)}" alt="" aria-hidden="true"><img class="fg" src="${esc(u)}" alt="" decoding="async">`
      : `<img src="${esc(u)}" alt="" loading="lazy" decoding="async">`;
    return `<span class="pt ${cls || ''}" style="--h:${hue(f.c)}">${img}</span>`;
  }
  const flag = (c, cls) => `<img class="flag ${cls || ''}" src="https://flagcdn.com/w40/${c.toLowerCase()}.png" alt="" title="${esc(D.COUNTRIES[c].name)}" loading="lazy">`;
  const FAME_TIP = { 1: 'Household name: 7 base points', 2: 'Well known: 5 base points', 3: 'Deep cut: 3 base points' };
  const stars = (t) => `<span class="stars" title="Fame — ${FAME_TIP[t]}. Famous politicians score more but usually cost more."><small>Fame</small>${'★'.repeat(4 - t)}<i>${'★'.repeat(t - 1)}</i></span>`;
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
    return `<div class="fits">${SEATS.map((s) => `<span class="fit ${f.tags.includes(s.k) ? 'on' : ''}" title="${esc(s.name)}${f.tags.includes(s.k) ? ': fits' : ''}">${s.icon}<small>${s.short}</small></span>`).join('')}</div>`;
  }
  // Without hints, who fits which seat stays hidden until the cabinets are sworn in.
  const hintsOn = () => !!(app.S && app.S.settings.hints);
  const revealed = () => hintsOn() || !['auction', 'assign', 'sold'].includes(app.S.phase);
  function bigCard(fi, extra) {
    const f = pol(fi);
    return `<article class="pcard">
      ${portrait(f, 'lg')}
      <div class="pc-body">
        <div class="pc-meta">${flag(f.c)}<span>${esc(D.COUNTRIES[f.c].name)}</span><span class="sep">·</span><span>${CC.ERAS[f.e]}</span>${stars(f.t)}</div>
        <h2 class="pc-name">${esc(f.n)}</h2>
        <p class="pc-role">${esc(hintsOn() ? f.r : f.rn)}</p>
        <p class="pc-yrs">${esc(f.y)}</p>
        ${hintsOn() ? `<p class="pc-fit-label">Experience fits</p>${fits(f)}` : ''}
        ${extra || ''}
      </div>
    </article>`;
  }
  // The badge is the points this minister scores in this seat, not the price paid.
  function mini(fi, k, paid) {
    const f = pol(fi), fit = f.tags.includes(k), seat = SEATS.find((s) => s.k === k).name;
    const tip = `Scores ${E.seatScore(fi, k)} points as ${seat}: ${{ 1: 'household name', 2: 'well known', 3: 'deep cut' }[f.t]} (${{ 1: 7, 2: 5, 3: 3 }[f.t]})${fit ? ' + real experience for this seat (4)' : ', no experience for this seat'}.${paid ? ` Bought for ${paid} ${paid === 1 ? 'credit' : 'credits'}.` : ''}`;
    const score = revealed() ? `<i class="sc ${fit ? 'fit' : ''}" title="${esc(tip)}">${E.seatScore(fi, k)}<small>pts</small></i>` : '';
    return `<span class="mini" title="${esc(f.n)} — ${esc(revealed() ? f.r : f.rn)}">${portrait(f, 'xs')}<b>${esc(f.s)}</b>${flag(f.c, 'sm')}${score}</span>`;
  }
  function cabinet(id, opts) {
    const S = app.S, p = P(id), t = S.teams[id];
    opts = opts || {};
    const lead = S.phase === 'auction' && S.bid && S.bid.by === id;
    const out = S.phase === 'auction' && !lead && (S.passed.includes(id) || E.free(S, id) === 0);
    const tag = lead ? '<em class="tag state lead">Leading</em>' : S.phase === 'auction' && S.passed.includes(id) ? '<em class="tag state">Passed</em>' : E.free(S, id) === 0 && S.phase === 'auction' ? '<em class="tag state">Full</em>' : '';
    const chem = E.chemistry(t.seats);
    return `<div class="cab ${lead ? 'is-lead' : ''} ${out ? 'is-out' : ''} ${mine(id) ? 'is-me' : ''} ${opts.cls || ''}" style="--c:${p.color}">
      <header>${dot(id)}<b class="cab-name">${esc(p.name)}</b>${p.bot ? `<em class="tag ai" title="AI rival · ${esc(p.bot)}">AI</em>` : ''}${p.off ? '<em class="tag">offline</em>' : ''}${tag}
        <span class="cr" title="Credits left">${t.cr}<small>cr</small></span></header>
      <div class="crbar"><i style="width:${Math.min(100, (t.cr / S.settings.budget) * 100)}%"></i></div>
      <ul>${SEATS.map((s, i) => `<li class="${opts.hl && opts.hl.includes(s.k) ? 'hl' : ''}"><span class="si" title="${esc(s.name)}">${s.icon}</span>${t.seats[i] != null ? mini(t.seats[i], s.k, (t.buys.find((b) => b.seat === i) || {}).v) : `<span class="vac">${esc(s.name)}</span>`}</li>`).join('')}</ul>
      ${revealed() ? `<footer><button class="power" data-a="bonus" title="How Power is counted">Power <b>${E.power(t.seats)}</b></button>${chem.map((c) => `<button class="chem" data-a="bonus" title="What is this bonus?">${esc(c.label)} +${c.v}</button>`).join('')}</footer>` : ''}
    </div>`;
  }
  const cabs = (ids, opts) => `<section class="cabs n${ids.length}">${ids.map((id) => cabinet(id, opts)).join('')}</section>`;
  const fuse = (S) => (S.deadline ? `<div class="fuse" data-dl="${S.deadline}" data-dur="${S.dur}"><i></i><span class="secs"></span></div>` : '');
  const chip = (on, a, attrs, label, dis) => `<button class="chip ${on ? 'on' : ''}" data-a="${a}" ${attrs} ${dis ? 'disabled' : ''}>${label}</button>`;

  /* ---------- top bar & modals ---------- */
  function topbar(status) {
    const room = app.role === 'host' || app.role === 'client' ? `<span class="room" title="Room code">Room <b>${esc(app.code)}</b></span>` : '';
    return `<header class="bar">
      <button class="brand" data-a="home" title="Back to the start">Cabinet <em>Clash</em></button>
      <div class="bar-mid">${status || ''}</div>
      <div class="bar-r">${room}
        <button class="icon" data-a="rules" title="How to play" aria-label="How to play">?</button>
        <button class="icon" data-a="mute" title="Sound" aria-label="Toggle sound">${Sound.muted ? '🔇' : '🔊'}</button>
      </div>
    </header>`;
  }
  function modal() {
    if (app.modal === 'rules') {
      return `<div class="modal" data-a="closeModal"><div class="sheet" data-stop>
        <h2>How to play</h2>
        <ol class="rules">
          <li><b>Pick a deck.</b> Legends, the whole world, your own mix of countries, continents, the modern world or the history books.</li>
          <li><b>Auction.</b> Everyone gets ${app.S ? app.S.settings.budget : 20} credits to fill five seats: 🏛️ Leader, 💰 Economy, 🌐 Foreign Affairs, 🛡️ Interior, ⚖️ Justice. Politicians come up one at a time; every bid restarts the timer and the highest bid when it runs out wins. You always keep 1 credit for each empty seat.</li>
          <li><b>Fame stars.</b> ★★★ household name (7 base points), ★★ well known (5), ★ deep cut (3). Famous politicians score more — and usually cost more.</li>
          <li><b>Seats matter.</b> A politician scores more in a seat that matches their real experience — use your own knowledge, or turn on <i>Experience hints</i> in the house rules. Famous names score more but cost more. Cabinets from one country, from four continents, from one era, or with every seat fitting earn chemistry bonuses.</li>
          <li><b>Nobody bids?</b> The politician is discarded. Once the discards run out, they go to a random player for 1 credit.</li>
          <li><b>Showdown.</b> Cabinets meet head-to-head. With <i>crisis cards</i> each duel draws 3 crises that test two seats each, plus a dice roll for public mood. With <i>group vote</i> the two players argue out loud and everyone else votes. Win = 3 points, draw = 1.</li>
          <li><b>Cabinet bonuses.</b> Extra points for a cabinet from one country, from four continents, from one era, or where everyone fits their seat. <button class="lnk" data-a="bonus">See all bonuses →</button></li>
          <li><b>The Pundit</b> rates every cabinet seriously, then roasts them all — with a free AI that runs in your browser, or the instant house pundit.</li>
        </ol>
        <button class="btn" data-a="closeModal">Got it</button>
      </div></div>`;
    }
    if (app.modal === 'bonus') return bonusModal();
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
      progress = `<h3 class="sub">${app.role === 'local' ? `${pname(me)}'s` : 'Your'} cabinet so far (${fs.length}/5 ministers)</h3><ul class="bprog">
        ${row('🏳️', nC ? `${nC} from ${esc(D.COUNTRIES[topC].name)}${nC >= 3 ? ` — <b>+${nC - 1}</b>` : ` — ${3 - nC} more for +2`}` : 'No ministers yet', nC >= 3)}
        ${row('🌍', `${conts} ${conts === 1 ? 'continent' : 'continents'}${conts >= 4 ? ` — <b>+${conts - 2}</b>` : ` — ${4 - conts} more for +2`}`, conts >= 4)}
        ${row('⏳', nE ? `${nE} of 5 from ${CC.ERAS[topE]}${nE === 5 ? ' — <b>+2</b>' : ''}` : 'No ministers yet', nE === 5)}
        ${row('🧩', revealed() ? `${fitN} of 5 fit their seat${fitN === 5 ? ' — <b>+3</b>' : ''}` : 'Seat fit stays secret until the cabinets are sworn in', fitN === 5 && revealed())}
      </ul>`;
    }
    return `<div class="modal" data-a="closeModal"><div class="sheet" data-stop>
      <h2>Power &amp; cabinet bonuses</h2>
      <p><b>Power</b> is your cabinet's strength. Each minister scores points in their seat: fame (★★★ 7, ★★ 5, ★ 3) plus 4 if they have real experience for that job. Add the cabinet bonuses below and you get Power. In crisis duels the bonus is added to <i>every</i> crisis your cabinet faces.</p>
      <table class="btable">
        <tr><td>🏳️</td><td><b>Country united</b><small>3 or more ministers from the same country</small></td><td>+2 / +3 / +4<small>for 3 / 4 / 5 ministers</small></td></tr>
        <tr><td>🌍</td><td><b>Global coalition</b><small>Ministers from 4 or more continents</small></td><td>+2 / +3<small>for 4 / 5 continents</small></td></tr>
        <tr><td>⏳</td><td><b>Era dream team</b><small>All 5 from one era: before 1945, 1945–1999 or the 21st century</small></td><td>+2</td></tr>
        <tr><td>🧩</td><td><b>Perfect fit</b><small>Every minister has real experience for their seat</small></td><td>+3</td></tr>
      </table>
      <p class="small">Bonuses stack — a cabinet can earn several at once. ${S && S.settings && !S.settings.hints ? 'With Experience hints off, Power and bonuses appear when the cabinets are sworn in.' : ''}</p>
      ${progress}
      <div class="row"><button class="btn" data-a="closeModal">Got it</button></div>
    </div></div>`;
  }

  /* ---------- home ---------- */
  function vHome() {
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `<main class="home">
      <section class="mast">
        <div class="mast-rule"><span>Vol. I · No. ${D.POLS.length}</span><span class="hide-sm">The fantasy government auction</span><span>${today}</span></div>
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
        <div><b>2</b><h3>Bid for ministers</h3><p>Live auction with a ticking timer. ${D.POLS.length} real politicians, five seats, limited credits.</p></div>
        <div><b>3</b><h3>Survive the crises</h3><p>Cabinets duel through crisis cards — or you argue it out and vote.</p></div>
        <div><b>4</b><h3>Face the pundit</h3><p>An AI rates every government, then roasts them against each other.</p></div>
      </section>
      <section class="ballot">
        <h2>On today's ballot</h2>
        <div class="ballot-row">${app.ballot.map((i) => { const f = pol(i); return `<div class="bcard">${portrait(f, 'md')}<b>${esc(f.n)}</b><small>${flag(f.c, 'sm')} ${esc(f.r)}</small></div>`; }).join('')}</div>
      </section>
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
        ${p.bot ? `<button class="tag ai" data-a="botLevel" data-id="${p.id}" ${adm ? '' : 'disabled'} title="Change difficulty">AI · ${p.bot}</button>` : mine(p.id) ? '<em class="tag">you</em>' : ''}
        ${p.off ? '<em class="tag">offline</em>' : ''}
        ${adm && p.id !== app.me[0] && !(app.role === 'local' && S.players.filter((x) => !x.bot).length <= 1 && !p.bot) ? `<button class="x" data-a="remove" data-id="${p.id}" aria-label="Remove ${esc(p.name)}">✕</button>` : ''}
      </li>`).join('');
    const full = S.players.length >= CC.MAXP;
    const addRow = adm ? `<div class="row wrap">
        ${app.role === 'local' ? `<input id="hn" class="search" maxlength="18" placeholder="Friend's name" value="${esc(app.addName)}"><button class="btn small" data-a="addHuman" ${full ? 'disabled' : ''}>+ Add player</button>` : ''}
        <button class="btn small ghost" data-a="addBot" ${full ? 'disabled' : ''}>+ Add AI rival</button>
      </div>` : '';

    const solo = S.kind === 'solo';
    const rules = `
      <h3>Budget</h3><div class="chips">${[15, 20, 30].map((v) => chip(st.budget === v, 'set', `data-k="budget" data-v="${v}"`, v + ' credits', !adm)).join('')}</div>
      <h3>Bid timer</h3><div class="chips">${[5, 8, 12].map((v) => chip(st.timer === v, 'set', `data-k="timer" data-v="${v}"`, v + ' s', !adm)).join('')}</div>
      <h3>Discards allowed</h3><div class="chips">${[0, 3, 5, 10, -1].map((v) => chip(st.discards === v, 'set', `data-k="discards" data-v="${v}"`, v < 0 ? 'No limit' : v, !adm)).join('')}</div>
      <p class="small">${st.discards < 0 ? 'Unwanted politicians are always discarded (until the deck runs dry).' : 'After that, unwanted politicians go to a random player for 1 credit.'}</p>
      ${solo ? '' : `<h3>Who wins a duel?</h3><div class="chips">${chip(st.judge === 'crisis', 'set', 'data-k="judge" data-v="crisis"', '🎲 Crisis cards', !adm)}${chip(st.judge === 'vote', 'set', 'data-k="judge" data-v="vote"', '🗣️ Argue &amp; vote', !adm)}</div>
      <p class="small">${st.judge === 'crisis' ? 'Automatic: seat fit, fame and chemistry vs. three random crises, plus a dice roll.' : 'The two players defend their cabinets out loud; everyone else votes.'}</p>`}
      <h3>Experience hints</h3><div class="chips">${chip(!st.hints, 'set', 'data-k="hints" data-v="0"', 'Off · trust your knowledge', !adm)}${chip(!!st.hints, 'set', 'data-k="hints" data-v="1"', 'On · show who fits where', !adm)}</div>
      <p class="small">${st.hints ? 'Cards show which seats match each politician\'s real experience, with live scores.' : 'Seat fit and scores stay secret until the cabinets are sworn in.'}</p>
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
    if (S.passed.includes(pid)) return `<div class="bc muted">${label}<span>Passed on this one</span></div>`;
    const cur = S.bid ? S.bid.v : 0, mx = E.maxBid(S, pid);
    if (mx <= cur) return `<div class="bc muted">${label}<span>Can't outbid — your max is ${mx}</span><button class="btn small ghost" data-a="pass" data-p="${pid}">Pass</button></div>`;
    const opts = [...new Set([cur + 1, cur + 2, cur + 5, mx])].filter((v) => v <= mx).sort((a, b) => a - b);
    return `<div class="bc">${label}<div class="bids">${opts.map((v) => `<button class="bidb ${v === mx && v > cur + 5 ? 'max' : ''}" data-a="bid" data-p="${pid}" data-v="${v}"><b>${v}</b><small>${v === mx && v > cur + 5 ? 'all in' : cur ? '+' + (v - cur) : v === 1 ? 'credit' : 'credits'}</small></button>`).join('')}
      <button class="passb" data-a="pass" data-p="${pid}">Pass</button></div>${compact ? '' : `<p class="keys">Keys: <kbd>1</kbd> <kbd>2</kbd> <kbd>5</kbd> raise · <kbd>M</kbd> max · <kbd>P</kbd> pass · max bid ${mx}</p>`}</div>`;
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
      const head = s.rnd ? `<div class="stamp red">Nobody wanted ${esc(f.s)}</div><p>Discards are used up — ${who(s.by)} gets them for <b>1 credit</b>.</p>`
        : `<div class="stamp">Sold!</div><p>${who(s.by)} wins ${esc(f.s)} for <b>${s.v}</b> ${s.v === 1 ? 'credit' : 'credits'}.</p>`;
      if (!mine(s.by)) return `<div class="soldbox">${head}<p class="muted">Choosing a seat…</p>${fuse(S)}</div>`;
      return `<div class="soldbox">${head}
        <h3>${app.role === 'local' ? pname(s.by) + ', pick' : 'Pick'} a seat for ${esc(f.s)}</h3>
        <div class="seatpick">${SEATS.map((st, i) => {
          const taken = t.seats[i] != null, sc = E.seatScore(s.f, st.k), fit = hintsOn() && f.tags.includes(st.k);
          return `<button class="seat ${fit ? 'fit' : ''}" data-a="seat" data-p="${s.by}" data-seat="${i}" ${taken ? 'disabled' : ''}>
            <span class="si">${st.icon}</span><b>${st.name}</b><small>${taken ? esc(pol(t.seats[i]).s) : hintsOn() ? `${sc} pts${fit ? ' · fits' : ''}` : 'free'}</small><kbd>${i + 1}</kbd></button>`;
        }).join('')}</div>
        ${fuse(S)}<p class="small">Time runs out → a seat is picked for you.</p></div>`;
    }
    if (S.phase === 'sold') {
      const s = S.sold, f = pol(s.f);
      if (!s.by) return `<div class="soldbox"><div class="stamp red">Discarded</div><p>Nobody bid on ${esc(f.s)}.</p><p class="small">Discards used: ${S.discUsed}${S.settings.discards >= 0 ? ' of ' + S.settings.discards : ''}</p></div>`;
      return `<div class="soldbox"><div class="stamp ${s.rnd ? 'red' : ''}">${s.rnd ? 'Assigned' : 'Sold!'}</div>
        <p>${esc(f.s)} joins ${who(s.by)} as <b>${SEATS[s.seat].icon} ${SEATS[s.seat].name}</b> for ${s.v} ${s.v === 1 ? 'credit' : 'credits'}.</p>
        ${hintsOn() ? `<p class="small">${E.seatScore(s.f, SEATS[s.seat].k)} points in that seat${f.tags.includes(SEATS[s.seat].k) ? ' — a natural fit' : ''}.</p>` : ''}</div>`;
    }
    return '';
  }
  function vAuction() {
    const S = app.S;
    const fi = S.phase === 'auction' ? S.cur : S.sold && S.sold.f;
    const lim = S.settings.discards;
    const status = `Lot <b>${S.lot}</b> · ${S.deck.length} left · discards ${S.discUsed}${lim >= 0 && !S.noDisc ? '/' + lim : ''}`;
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
    const free = Pundit().freeSupported(), fm = Pundit().FREE_MODELS[Pundit().freeModel()];
    if (app.pundBusy) body = `<div class="think"><div class="spin sm"></div><p>${esc(app.pundProgress || 'The pundit is studying the cabinets…')}</p></div>`;
    else if (!R) {
      body = `<p>Get a verdict on every cabinet: first a serious analysis, then a roast that pits them against each other.</p>
        ${adm ? `<div class="row wrap">
          <button class="btn" data-a="askFree" ${free ? '' : 'disabled'}>🆓 Free AI pundit</button>
          <button class="btn ghost" data-a="askHouse">⚡ House pundit (instant)</button>
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
    const how = S.settings.judge === 'crisis'
      ? 'Each duel draws three crises. Every crisis tests two seats; add chemistry and a roll of the dice for public mood. Best of three wins.'
      : 'Each duel, the two players defend their cabinets out loud — then everyone else votes.';
    return topbar('All seats filled') + `<main class="sworn">
      <h1 class="h1">The cabinets are sworn in</h1>
      <p class="lead">${how} Win = 3 points, draw = 1. <button class="lnk" data-a="bonus">What are Power and cabinet bonuses?</button></p>
      ${cabs(S.players.map((p) => p.id), { cls: 'big' })}
      ${punditPanel()}
      <div class="start-row">${isAdmin() ? '<button class="btn big" data-a="next">Start the showdown →</button>' : '<p class="muted">Waiting for the host to start the showdown…</p>'}</div>
    </main>`;
  }

  /* ---------- showdown briefing ---------- */
  function crisisSeats(cr) {
    const twice = cr.s[0] === cr.s[1];
    return [...new Set(cr.s)].map((k) => SEATS.find((s) => s.k === k)).map((s) => `${s.icon} ${esc(s.name)}${twice ? ' ×2' : ''}`).join(' + ');
  }
  function vBriefing() {
    const S = app.S, crisis = S.settings.judge === 'crisis';
    const len = S.settings.rounds === 'quick' ? 'Three rounds — each cabinet plays up to three duels.' : 'Every cabinet meets every other cabinet once.';
    const step = (n, h, p) => `<div class="bstep"><b>${n}</b><h3>${h}</h3><p>${p}</p></div>`;
    let body;
    if (crisis) {
      // A worked example with the viewer's own cabinet (or the first one when watching).
      const me = locals().find((id) => S.teams[id]) || S.players[0].id, t = S.teams[me];
      const ex = CC.CRISES.find((c) => c.n === 'Border standoff');
      const parts = ex.s.map((k) => { const i = CC.SK.indexOf(k); return { f: t.seats[i], v: E.seatScore(t.seats[i], k), fit: pol(t.seats[i]).tags.includes(k) }; });
      const ch = E.chemTotal(t.seats), base = parts.reduce((a, p) => a + p.v, 0) + ch;
      const whose = mine(me) && app.role !== 'local' ? 'your' : `${esc(P(me).name)}'s`;
      body = `<div class="brief-steps">
          ${step(1, 'Three crises per duel', 'Each duel draws 3 random crises from the deck below. Every crisis tests two seats — sometimes the same seat twice.')}
          ${step(2, 'Ministers score points', 'Points in a seat = fame (★★★ 7, ★★ 5, ★ 3) + 4 if the minister has real experience for that job.')}
          ${step(3, 'Chemistry and luck', 'Add your cabinet\'s chemistry bonus and a dice roll 🎲 from 1 to 6 for public mood. The higher total wins the crisis.')}
          ${step(4, 'Best of three', 'Win more of the three crises than your rival to take the duel. Win = 3 points, draw = 1 each.')}
        </div>
        <section class="panel example">
          <h2>Example with ${whose} cabinet</h2>
          <p><span class="ci">${ex.i}</span> <b>${esc(ex.n)}</b> tests ${crisisSeats(ex)}:</p>
          <div class="eq">
            ${parts.map((p) => `<span class="term">${portrait(pol(p.f), 'xs')}<b>${esc(pol(p.f).s)}</b><i class="sc ${p.fit ? 'fit' : ''}">${p.v}<small>pts</small></i></span>`).join('<span class="op">+</span>')}
            <span class="op">+</span><span class="term">🧪 chemistry <b>${ch}</b></span>
            <span class="op">+</span><span class="term">🎲 dice <b>1–6</b></span>
            <span class="op">=</span><span class="term total"><b>${base + 1}–${base + 6}</b></span>
          </div>
          <p class="small">Your rival does the same with their own Interior and Foreign Affairs ministers — the higher total wins this crisis.</p>
        </section>
        <section class="panel cdeck-wrap">
          <h2>The crisis deck <small>${CC.CRISES.length} crises</small></h2>
          <div class="cdeck">${CC.CRISES.map((c) => `<div class="cc"><span class="ci">${c.i}</span><b>${esc(c.n)}</b><small>${crisisSeats(c)}</small></div>`).join('')}</div>
        </section>`;
    } else {
      body = `<div class="brief-steps">
          ${step(1, 'Face-off', 'Two cabinets meet head-to-head. Everyone sees both line-ups.')}
          ${step(2, 'Argue out loud', 'The two owners defend their cabinets — why their ministers would govern better. No timer: press Ready when you\'re done.')}
          ${step(3, 'Everyone else votes', 'The players not in the duel vote for the better government. With only two players, both vote — if you disagree, it\'s a draw.')}
          ${step(4, 'Points', 'Win = 3 points, draw = 1 each. The scores on the cards are a hint, but persuasion decides.')}
        </div>`;
    }
    return topbar('Before the showdown') + `<main class="brief">
      <h1 class="h1">How the showdown works</h1>
      <p class="lead">${crisis ? '🎲 Crisis cards decide the duels.' : '🗣️ You argue it out and vote.'} ${len}</p>
      ${body}
      <div class="start-row">${isAdmin() ? '<button class="btn big" data-a="next">Got it — start the duels →</button>' : '<p class="muted">Waiting for the host to start the duels…</p>'}</div>
    </main>`;
  }

  /* ---------- duels ---------- */
  function partsText(side) {
    const by = {};
    side.parts.forEach((p) => { by[p.k] = by[p.k] ? Object.assign({}, by[p.k], { n: 2 }) : Object.assign({ n: 1 }, p); });
    return Object.values(by).map((p) => `${esc(pol(p.f).s)} ${p.v}${p.n > 1 ? '×2' : ''}`).join(' + ') + (side.ch ? ` + chem ${side.ch}` : '') + ` + 🎲${side.roll}`;
  }
  const SUSPENSE_MS = 1800; // a new crisis shows "?" scores for this long before the numbers flip in
  function vDuel() {
    const S = app.S, d = S.duels[S.di], r = d.r, shown = S.phase === 'duelres' ? 3 : S.step;
    // The newest crisis keeps its scores hidden for a moment.
    const revealAt = S.phase === 'duel' && shown > 0 ? S.deadline - S.dur + SUSPENSE_MS : 0;
    const suspense = revealAt > Date.now() + app.offset;
    app.sig.revealAt = suspense ? revealAt : 0;
    if (suspense && app.sig.revealTimerFor !== revealAt) { // backup for when animation frames don't run
      app.sig.revealTimerFor = revealAt;
      setTimeout(() => { if (app.sig.revealAt === revealAt) { app.sig.revealAt = 0; Sound.play('bid'); render(); } }, revealAt - (Date.now() + app.offset) + 30);
    }
    const rev = r.crises.slice(0, suspense ? shown - 1 : shown);
    const wa = rev.filter((c) => c.w === 'a').length, wb = rev.filter((c) => c.w === 'b').length;
    const curK = shown > 0 && shown <= 3 && S.phase === 'duel' ? CC.CRISES[r.crises[shown - 1].ci].s : null;
    const rows = r.crises.map((c, i) => {
      const cr = CC.CRISES[c.ci];
      if (i >= shown) return `<div class="crisis hidden"><span class="ci">❓</span><b>Crisis ${i + 1}</b></div>`;
      const seats = [...new Set(cr.s)].map((k) => SEATS.find((s) => s.k === k)).map((s) => `${s.icon} ${s.name}${cr.s[0] === cr.s[1] ? ' ×2' : ''}`).join(' + ');
      const newest = i === shown - 1 && S.phase === 'duel';
      if (newest && suspense) {
        return `<div class="crisis fresh suspense">
          <div class="side a"><b class="tot">?</b><small>${pname(d.a)}'s ministers step up…</small></div>
          <div class="cmid"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${seats}</small></div>
          <div class="side b"><b class="tot">?</b><small>${pname(d.b)}'s ministers step up…</small></div>
        </div>`;
      }
      return `<div class="crisis w-${c.w} ${newest ? 'flipped' : ''}">
        <div class="side a"><b class="tot">${c.A.tot}</b><small>${partsText(c.A)}</small></div>
        <div class="cmid"><span class="ci">${cr.i}</span><b>${esc(cr.n)}</b><small>${seats}</small></div>
        <div class="side b"><b class="tot">${c.B.tot}</b><small>${partsText(c.B)}</small></div>
      </div>`;
    }).join('');
    let res = '';
    if (S.phase === 'duelres') {
      const w = d.w;
      res = `<div class="result">${w === 't' ? '<div class="stamp">Draw</div><p>One point each.</p>' : `<div class="stamp gold">${pname(w === 'a' ? d.a : d.b)} wins!</div><p>+3 points</p>`}
        ${fuse(S)}${isAdmin() ? `<button class="btn" data-a="next">${S.di + 1 < S.duels.length ? 'Next duel →' : 'Final results →'}</button>` : ''}</div>`;
    }
    return topbar(`Duel <b>${S.di + 1}</b> of ${S.duels.length}`) + `<main class="duel">
      <div class="vs-row">
        ${cabinet(d.a, { hl: curK, cls: d.w === 'a' ? 'won' : '' })}
        <div class="vs"><span>VS</span><div class="score"><b>${wa}</b>–<b>${wb}</b></div><small>crises won</small></div>
        ${cabinet(d.b, { hl: curK, cls: d.w === 'b' ? 'won' : '' })}
      </div>
      <section class="crises">${rows}</section>
      ${res}
      ${S.phase === 'duel' && isAdmin() ? '<div class="start-row"><button class="lnk" data-a="next">Skip animation</button></div>' : ''}
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
    return `<section class="mini-table">${E.standings(S).map((r, i) => `<span>${i + 1}. ${who(r.p.id)} <b>${r.pts}</b></span>`).join('')}</section>`;
  }

  /* ---------- final ---------- */
  function vFinal() {
    const S = app.S, st = E.standings(S), win = st[0];
    const tie = st.length > 1 && st[1].pts === win.pts && st[1].rec.cw === win.rec.cw && st[1].pow === win.pow;
    const crisis = S.settings.judge === 'crisis';
    const youWon = mine(win.p.id) && app.role !== 'local';
    const rows = st.map((r, i) => `<tr class="${mine(r.p.id) && app.role !== 'local' ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${who(r.p.id)}</td><td><b>${r.pts}</b></td><td>${r.rec.w}-${r.rec.d}-${r.rec.l}</td>${crisis ? `<td>${r.rec.cw}</td>` : ''}<td>${r.pow}</td><td>${r.cr}</td></tr>`).join('');
    const results = S.duels.map((d) => `<span>${pname(d.a)} <b>${d.r && d.r.crises ? d.r.wa + '–' + d.r.wb : d.w === 'a' ? 'W–L' : d.w === 'b' ? 'L–W' : 'D'}</b> ${pname(d.b)}</span>`).join('');
    return topbar('Final results') + `<main class="final">
      <section class="winner" style="--c:${win.p.color}">
        <small>${tie ? 'Dead heat — but on tie-breaks…' : 'Election night result'}</small>
        <h1>${youWon ? 'Your cabinet takes power!' : `${esc(win.p.name)}'s cabinet takes power`}</h1>
        <p>${win.pts} points · ${win.rec.w} wins · cabinet power ${win.pow}</p>
      </section>
      <div class="final-grid">
        <section class="panel">
          <h2>Standings</h2>
          <table class="table"><thead><tr><th></th><th>Player</th><th>Pts</th><th>W-D-L</th>${crisis ? '<th>Crises</th>' : ''}<th>Power</th><th>Cr left</th></tr></thead><tbody>${rows}</tbody></table>
          <h3>Awards</h3>
          <ul class="awards">${E.awards(S).map((a) => `<li><span>${a.i}</span><div><b>${esc(a.t)}</b> · ${who(a.by)}<small>${esc(a.d)}</small></div></li>`).join('')}</ul>
          <h3>All duels</h3><div class="results">${results}</div>
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
      case 'duel': v = vDuel(); break;
      case 'duelres': v = S.settings.judge === 'crisis' ? vDuel() : vDebate(); break;
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
    const oldCard = root.querySelector('.stage-card .pcard'), oldLot = oldCard && oldCard.parentNode.dataset.lot;
    root.innerHTML = view() + modal() + (app.toast ? `<div class="toast">${esc(app.toast)}</div>` : '');
    // Re-use the candidate card while the lot is the same, so bids don't replay its entrance or reload the photo.
    const slot = root.querySelector('.stage-card');
    if (oldCard && slot && slot.dataset.lot === oldLot) slot.replaceChildren(oldCard);
    else if (slot && slot.firstElementChild) { const c = slot.firstElementChild; setTimeout(() => c.classList.add('dealt'), 450); }
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
    Object.assign(app, { S: null, role: null, me: [], code: '', lost: false, netDown: false, tokens: {}, offset: 0, pundBusy: false, pundErr: '', sig: {} });
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
    app.view = 'game';
  }
  function startSolo() {
    if (!needName()) return;
    begin('solo');
    const me = E.addPlayer(app.S, { name: app.name });
    app.me = [me.id];
    ['easy', 'normal', 'hard'].forEach((l) => E.addBot(app.S, l));
    startLoop();
    render();
  }
  function startLocal() {
    begin('local');
    const me = E.addPlayer(app.S, { name: app.name.trim() || 'Player 1' });
    app.me = [me.id];
    E.addPlayer(app.S, { name: 'Player 2' });
    startLoop();
    render();
  }
  function createRoom() {
    if (!needName()) return;
    if (!window.mqtt) { app.err = 'The online library did not load — check your internet connection and reload.'; render(); return; }
    begin('host');
    const me = E.addPlayer(app.S, { name: app.name });
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
      p = E.addPlayer(S, { name });
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
    Net.join(code, { name: app.name, token }, {
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
      case 'aiSettings': app.modal = 'ai'; return render();
      case 'closeModal': app.modal = null; return render();
      case 'mute': Sound.toggle(); return render();
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
      case 'addBot': return admin({ t: 'addBot', level: 'normal' });
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
      case 'ready': return dispatch(app.me[0], { t: 'ready' });
      case 'vote': return dispatch(app.me[0], { t: 'vote', w: el.dataset.v });
      case 'gvote': return admin({ t: 'gvote', w: el.dataset.v });
      case 'next': case 'skip': case 'again': return admin({ t: a });
    }
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'nm') { app.name = t.value; app.err = ''; }
    else if (t.id === 'jc') { t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); app.joinCode = t.value; }
    else if (t.id === 'cs') { app.csearch = t.value; filterCountries(); }
    else if (t.id === 'hn') app.addName = t.value;
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
    if (S.phase === 'auction' && S.teams[me]) {
      const cur = S.bid ? S.bid.v : 0, mx = E.maxBid(S, me);
      const v = { 1: cur + 1, 2: cur + 2, 5: cur + 5, m: mx }[k];
      if (v) { ev.preventDefault(); dispatch(me, { t: 'bid', v: Math.min(v, mx) }); }
      else if (k === 'p') dispatch(me, { t: 'pass' });
    } else if (S.phase === 'assign' && S.sold.by === me && /^[1-5]$/.test(k)) {
      dispatch(me, { t: 'seat', seat: +k - 1 });
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
