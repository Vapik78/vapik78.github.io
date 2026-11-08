/* Cabinet Clash — the Pundit: rates every cabinet seriously, then roasts them.
   Two ways to get a verdict, both free:
   - free AI: a small open model (Llama 3.2) running in this browser via WebLLM —
     no key, no account, no server; downloaded once, then cached;
   - house pundit: instant offline verdict written from the game stats.
   In online games only the host runs the pundit; everyone sees the result. */
(function () {
  'use strict';
  const D = window.CC_DATA;
  const CC = (window.CC = window.CC || {});
  const E = CC.Engine;

  const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.86/+esm';
  // Only the 3B model: in testing, the smaller 1B model too often joked about race, gender or family.
  const FREE_MODELS = {
    better: { base: 'Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B', size: '≈1.8 GB' },
  };

  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* blocked */ } },
  };
  // Earlier versions could store an Anthropic API key here; make sure none lingers.
  store.set('cc-ai-key', '');
  store.set('cc-ai-proxy', '');
  store.set('cc-free-model', '');

  const Pundit = {
    FREE_MODELS,
    freeModel: () => 'better',
    // WebLLM needs WebGPU: Chrome/Edge on desktop, recent Safari, some Android Chrome.
    freeSupported: () => typeof navigator !== 'undefined' && !!navigator.gpu,
    lastRaw: [],
  };

  /* ---------- free AI in the browser (WebLLM) ---------- */
  let webllm = null, engine = null, engineModel = '';
  async function freeEngine(onProgress) {
    const pref = FREE_MODELS[Pundit.freeModel()];
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('WebGPU is switched off or unavailable on this device. Try the house pundit.');
    const modelId = pref.base + (adapter.features.has('shader-f16') ? '-q4f16_1-MLC' : '-q4f32_1-MLC');
    if (engine && engineModel === modelId) return { engine, pref };
    if (!webllm) {
      onProgress('Loading the AI library…');
      try { webllm = await import(WEBLLM_URL); } catch (e) { throw new Error('Could not load the free AI library. Check your internet connection.'); }
    }
    if (engine) { try { await engine.unload(); } catch (e) { /* replaced below */ } engine = null; }
    engine = await webllm.CreateMLCEngine(modelId, {
      initProgressCallback: (r) => onProgress(r.progress < 1
        ? `Downloading ${pref.label} (${pref.size}, first time only)… ${Math.round(r.progress * 100)}%`
        : 'Warming up the pundit…'),
    });
    engineModel = modelId;
    return { engine, pref };
  }

  // Small models do far better with one short, line-based task at a time than
  // with one big JSON answer, so each cabinet gets its own call.
  const FREE_SYSTEM = `You are "The Pundit", a witty political commentator for Cabinet Clash, a party game where friends draft fantasy cabinets of real politicians from any era. You give a serious verdict and a good-natured roast.
Only use the facts you are given plus very widely known facts. If you are not sure about something, joke about the seat fit, the mix of eras or the price paid instead.
Keep the humour playful: never mock ethnicity, religion, gender, disability or appearance, never joke about atrocities or deaths, never invent crimes or quotes.
Answer in English, using exactly the lines you are asked for. Each line is one or two short sentences.`;

  const FORMAT = `Answer with exactly these four lines, filling in your own words:
SCORE: <a number from 1.0 to 10.0 for how well this cabinet would govern>
HEADLINE: <a catchy title for this cabinet, 4 to 8 words>
STRENGTH: <its biggest strength, naming the minister responsible>
WEAKNESS: <its biggest weakness, naming the minister responsible>`;

  // The roast gets its own call with one line per seat, so every minister is covered.
  const SEAT_KEYS = ['LEADER', 'ECONOMY', 'FOREIGN', 'INTERIOR', 'JUSTICE'];
  // A made-up politician shows the tone without giving the model real lines to copy.
  const ROAST_STYLE = `Tone: you are a savage but good-natured roast comedian at a celebrity roast. Be sharp, specific and exaggerated. Use absurd comparisons, and put the twist at the end of the joke. Tease each minister's famous public image and how hilariously well or badly it fits the job.
Tone example, about a made-up politician (do not reuse it):
ECONOMY: Mayor Bloggs balanced the city budget once, by selling the city hall clock — so at least the cabinet will never be on time to see the debt.`;

  function roastFormat(S, p) {
    const t = S.teams[p.id];
    const rivals = S.players.filter((q) => q.id !== p.id)
      .map((q) => `${q.name}'s cabinet, led by ${CC.pol(S.teams[q.id].seats[0]).n} (power ${E.power(S.teams[q.id].seats)})`).join('; ');
    return `Roast this cabinet (power ${E.power(t.seats)}): write one funny joke about EACH minister and how they would do in that job.\n${cabinetBrief(S, p, true)}\n` +
      (rivals ? `Rival cabinets: ${rivals}.\n` : '') + `\n${ROAST_STYLE}\n\n` +
      `Rules: each joke is one or two short sentences, under 35 words, and starts with the minister's name. Joke only about their politics, public record, style and how they fit the job. Never invent quotes or tweets. Never joke about gender, looks, age, family, health, religion, ethnicity, death or violence.\n\nAnswer with exactly these six lines:\n` +
      CC.SEATS.map((s, i) => `${SEAT_KEYS[i]}: <a roast joke about ${CC.pol(t.seats[i]).n} as ${s.name}>`).join('\n') +
      `\nOVERALL: <one savage joke about this whole cabinet${rivals ? ', compared with the rival cabinets' : ''}>`;
  }

  function cabinetBrief(S, p, anonymous) {
    const t = S.teams[p.id];
    const rows = CC.SEATS.map((s, i) => {
      const f = CC.pol(t.seats[i]);
      if (!f) return `- ${s.name}: empty`;
      return `- ${s.name}: ${f.n} (${D.COUNTRIES[f.c].name}; ${f.r}; ${f.y}) — ${f.tags.includes(s.k) ? 'has real experience for this job' : 'no experience for this job'}`;
    });
    const big = t.buys.filter((b) => !b.rnd).sort((a, b) => b.v - a.v)[0];
    if (anonymous) return `The ministers:\n${rows.join('\n')}`;
    return `${p.name}'s cabinet${p.bot ? ' (a computer rival)' : ''}:\n${rows.join('\n')}` +
      (big ? `\n${p.name} paid the most for ${CC.pol(big.f).n}: ${big.v} credits.` : '');
  }

  function clip(v, max) {
    if (v.length <= max) return v;
    const cut = v.slice(0, max), end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    return end > max * 0.4 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }

  // Small models sometimes label jokes with the minister's name instead of the seat:
  // then take the labelled lines in order — five seats, then the overall joke.
  function byPosition(text) {
    const found = [];
    for (const row of String(text).split('\n')) {
      const m = row.match(/^[\s*#>-]*([^:：\n]{1,40})[:：]\s*(.+)$/);
      if (!m || /^(score|headline|strength|weakness|summary)\b/i.test(m[1].replace(/\*/g, '').trim())) continue;
      const v = clip(m[2].replace(/^[\s"*]+|[\s"*]+$/g, ''), 240);
      if (v.length >= 12 && !/[<>]/.test(v)) found.push(v);
    }
    const out = {};
    SEAT_KEYS.forEach((k, i) => { if (found[i]) out[k] = found[i]; });
    if (found[5]) out.OVERALL = found[5];
    return out;
  }

  function lines(text, keys) {
    const out = {};
    for (const k of keys) {
      const m = String(text).match(new RegExp('^[\\s*#>-]*' + k + '\\b[^:：\\n]{0,40}[:：]\\s*(.+)$', 'im'));
      if (!m) continue;
      const v = clip(m[1].replace(/^[\s"*]+|[\s"*]+$/g, ''), 240);
      // Drop placeholders and junk like "None" or "0.0" (the score line is numeric on purpose).
      if (k === 'SCORE' ? /\d/.test(v) : v.length >= 12 && !/[<>]/.test(v) && !/^(none|n\/a|unknown)\b/i.test(v)) out[k] = v;
    }
    return out;
  }

  // Small models sometimes ignore the rules; any joke that strays into these topics is swapped for a house joke.
  const OFF_LIMITS = /\b(gender|woman|women|female|girl|wife|husband|housewife|household|chores?|kitchen|cook(ing)?|sandwich|smile|pretty|ugly|fat|weight|hair|bald|old age|senile|dementia|wrinkl|tomb|tombstone|grave|coffin|funeral|dead|death|die[ds]?|dying|kill\w*|murder\w*|assassin\w*|shot|genocide|holocaust|massacre|nuclear|bomb\w*|terror\w*|shoot\w*|gun\w*|bullet\w*|wound\w*|blood\w*|feminis\w*|beautiful|gorgeous|handsome|sexy|black (person|man|woman|people|president)|white (person|man|woman|people)|african|asian|latin[oa]|hispanic|ethnic\w*|skin|children|child|kids?|mother|father|daughters?|sons?|grandk\w*|famil\w*|married|marriage|pregnan\w*|(air)?plane crash\w*|airplanes?|accident\w*|pinata|tweet\w*|affair|lewinsky|intern|rape|sex\w*|race|racis\w*|religio\w*|muslim|jew\w*|christian|god)\b/i;
  const safe = (text) => (text && !OFF_LIMITS.test(text) && !/bloggs|city hall clock/i.test(text) ? text : '');
  const words = (text) => String(text).split(/\s+/).filter(Boolean).length;
  const plain = (text) => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // A usable minister joke names that minister, is joke-sized, and isn't the briefing echoed back.
  function goodJoke(text, f) {
    const t = safe(String(text || '').replace(/\*+/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim());
    if (!t || words(t) < 7 || words(t) > 45 || /\([^)]*\d{3,4}/.test(t)) return '';
    const surname = plain(f.n.split(' ').pop()), short = plain(f.s.split(' ').pop());
    return plain(t).includes(surname) || plain(t).includes(short) ? t : '';
  }
  const oneLiner = (text, max) => { const t = safe(String(text || '').replace(/\*+/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()); return t && words(t) >= 4 && words(t) <= max ? t : ''; };

  async function chat(engine, user, maxTokens, temperature) {
    const r = await engine.chat.completions.create({
      messages: [{ role: 'system', content: FREE_SYSTEM }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature: temperature || 0.7,
    });
    const text = (r.choices[0] && r.choices[0].message.content) || '';
    Pundit.lastRaw.push(text); // the model's raw answers, for debugging in the console
    return text;
  }

  Pundit.askFree = async function (S, onProgress) {
    if (!Pundit.freeSupported()) throw new Error('This browser has no WebGPU, so the free AI can\'t run here. Try Chrome or Edge on a computer — or use the house pundit.');
    let got;
    try {
      got = await freeEngine(onProgress);
    } catch (e) {
      engine = null;
      throw new Error(/memory|device|lost/i.test(String(e && e.message)) ? 'Not enough graphics memory for the free AI on this device. Use the house pundit instead.' : (e && e.message) || 'The free AI failed to start.');
    }
    Pundit.lastRaw = [];
    // The house verdict fills any line the model fumbles and steadies its scores.
    const house = Pundit.house(S);
    const serious = [], roast = [];
    let usable = 0;
    for (let i = 0; i < S.players.length; i++) {
      const p = S.players[i];
      onProgress(`The pundit is judging ${p.name}'s cabinet… (${i + 1}/${S.players.length})`);
      const text = await chat(got.engine, `Judge this cabinet:\n${cabinetBrief(S, p)}\n\n${FORMAT}`, 240);
      const f = lines(text, ['SCORE', 'HEADLINE', 'STRENGTH', 'WEAKNESS']);
      onProgress(`The pundit is roasting ${p.name}'s cabinet… (${i + 1}/${S.players.length})`);
      const raw = await chat(got.engine, roastFormat(S, p), 480, 0.85);
      let jokes = lines(raw, SEAT_KEYS.concat('OVERALL'));
      if (SEAT_KEYS.filter((k) => jokes[k]).length < 3) jokes = byPosition(raw);
      SEAT_KEYS.forEach((k, s) => { jokes[k] = goodJoke(jokes[k], CC.pol(S.teams[p.id].seats[s])); });
      jokes.OVERALL = oneLiner(jokes.OVERALL, 45);
      const h = house.serious.cabinets.find((c) => c.id === p.id), hr = house.roast.cabinets.find((c) => c.id === p.id);
      const ms = parseFloat(f.SCORE);
      const own = SEAT_KEYS.filter((k) => jokes[k]).length;
      if (f.HEADLINE && own >= 2) usable++;
      serious.push({
        id: p.id,
        score: Math.round((Number.isFinite(ms) ? (Math.min(10, Math.max(1, ms)) + h.score) / 2 : h.score) * 10) / 10,
        headline: f.HEADLINE || h.headline,
        strengths: f.STRENGTH || h.strengths,
        weaknesses: f.WEAKNESS || h.weaknesses,
        verdict: h.verdict,
      });
      roast.push({
        id: p.id,
        roast: jokes.OVERALL || hr.roast,
        lines: hr.lines.map((l, k) => Object.assign({}, l, jokes[SEAT_KEYS[k]] ? { joke: jokes[SEAT_KEYS[k]] } : {})),
      });
    }
    if (usable * 2 < S.players.length) throw new Error('The free AI got tangled up in its own words. Try again, or use the house pundit.');
    serious.sort((a, b) => b.score - a.score);

    onProgress('The pundit is comparing the cabinets…');
    const name = (id) => S.players.find((p) => p.id === id).name;
    const recap = serious.map((c) => `- ${name(c.id)}: ${c.score.toFixed(1)}/10, "${c.headline}"`).join('\n');
    const text = await chat(got.engine, `${S.phase === 'final' ? 'Final standings: ' + E.standings(S).map((r, i) => `${i + 1}. ${r.p.name} (${r.pts} pts)`).join(', ') + '.\n' : ''}The cabinets and their scores:\n${recap}\n\nAnswer with exactly these three lines:\nSUMMARY: <one serious sentence comparing the cabinets and naming the strongest one>\nHEADLINE: <one savage, funny tabloid headline roasting all the cabinets at once>\nCLOSER: <one last cheeky one-liner to end the roast show>`, 220, 0.9);
    const f = lines(text, ['SUMMARY', 'HEADLINE', 'CLOSER']);
    return {
      source: 'free',
      model: got.pref.label,
      phase: S.phase,
      serious: { summary: f.SUMMARY || house.serious.summary, cabinets: serious },
      roast: { headline: oneLiner(f.HEADLINE, 16) || house.roast.headline, cabinets: roast, closer: oneLiner(f.CLOSER, 25) || house.roast.closer },
    };
  };

  /* ---------- house pundit (offline) ---------- */
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  function yearOf(f) {
    const m = f.y.match(/(\d{1,4})/);
    if (!m) return 2000;
    const bc = /BC/.test(f.y.split('–')[0]) || (/BC\s*$/.test(f.y) && !/AD/.test(f.y));
    return bc ? -m[1] : +m[1];
  }

  // House roast: one quip per minister, depending on the seat and whether they've done the job before.
  const SEAT_JOKES = {
    L: {
      fit: ['{n} has run a country before and will remind everyone at every single meeting. Twice.',
        '{n} slides into the top job like a favourite armchair — and refuses to get up for anyone.',
        '{n} knows exactly how to run a government. Unfortunately, so does everyone else in this cabinet.',
        '{n} will give a speech so long that the next election arrives before the applause.',
        'Give {n} the top job and you get experience, confidence and nobody else getting a word in.',
        '{n} has done this before. The country has survived {n} before, too. Mostly.'],
      no: ['{n} as Leader: nobody knows who is in charge, least of all {n}.',
        '{n} accepted the top job, then asked where the coffee machine is and who all these people are.',
        '{n} will chair cabinet meetings by reading the agenda out loud, very slowly, with feeling.',
        'Putting {n} in charge is a bold move, the way juggling chainsaws is a bold move.',
        "{n}'s first act as Leader: a forty-page memo titled 'So, What Does a Leader Actually Do?'",
        '{n} has a five-year plan. Four of those years are holidays.'],
    },
    E: {
      fit: ['{n} understands the budget, which is terrifying news for everyone else\'s pet projects.',
        '{n} balances the books, then charges the cabinet for the pens.',
        '{n} reads spreadsheets for fun and expects the whole cabinet to do the same.',
        '{n} will cut spending so hard that cabinet meetings become bring-your-own-chair.',
        '{n} knows where every coin is and has given each one a name.',
        '{n} can explain inflation in one sentence. It just takes three hours to say.'],
      no: ['{n} at Economy: the budget will be balanced on vibes alone.',
        '{n} plans to beat inflation by asking it nicely to stop.',
        "{n}'s economic plan fits on a napkin, and the napkin is mostly doodles.",
        "{n} thinks a 'deficit' is a type of French pastry.",
        "{n} has promised a budget 'with lots of really big numbers in it'.",
        'The Treasury has quietly hidden the calculator from {n}, just to be safe.'],
    },
    F: {
      fit: ['{n} has shaken more hands than a wedding photographer.',
        '{n} can open a summit in one language, complain in a second and close it in a third.',
        '{n} has a passport thicker than most novels and a handshake for every occasion.',
        '{n} has been to so many summits that airport staff wave on sight.',
        "{n} could negotiate peace between any two countries. Between this cabinet's egos? Not a chance.",
        '{n} arrives at every summit with flowers, a smile and a backup plan for the smile.'],
      no: ['{n} at Foreign Affairs: embassies are already stocking up on apology letters.',
        '{n} thinks a diplomatic incident is just a lively lunch.',
        '{n} will bring a phrasebook to every summit and open it on the wrong page.',
        "{n}'s idea of diplomacy is speaking louder and slower.",
        'Sending {n} to a summit is like sending a cat to a dog show: memorable, not productive.',
        '{n} has already started three trade wars, and it is only Tuesday.'],
    },
    I: {
      fit: ['{n} at Interior: the police finally have someone who reads their reports.',
        '{n} has guarded borders before and keeps a spare passport stamp in every pocket, just in case.',
        '{n} runs cabinet meetings like a security briefing — nobody leaves without being frisked.',
        '{n} knows every police chief by name and every police dog by birthday.',
        '{n} has a contingency plan for everything, including the seating plan and the biscuit rota.',
        '{n} could keep a whole country in order. Keeping this cabinet in order is the real challenge.'],
      no: ["{n} at Interior: the police have been told to expect 'interesting' orders.",
        '{n} will inspect the border, then ask which side is ours.',
        '{n} has never secured anything bigger than a bike lock, and even that went badly.',
        "{n}'s security plan is a strongly worded sign that says 'Please Behave'.",
        "{n} thinks 'border control' is a setting on the TV remote.",
        'The police have started briefing {n} with picture books and very big arrows.'],
    },
    J: {
      fit: ['{n} knows every law by heart, including the ones nobody has followed since 1850.',
        '{n} has read the constitution twice and the small print three times.',
        '{n} will fine the cabinet for every late arrival and keep the receipts forever.',
        '{n} runs cabinet meetings like a courtroom, and everyone else is the defendant.',
        '{n} could find a loophole in a parking ticket and close it the same afternoon.',
        '{n} objects to everything in cabinet meetings, including the coffee. Objection sustained.'],
      no: ['{n} at Justice: the judges are bracing themselves.',
        '{n} promises law and order, mostly in that order.',
        '{n} will learn the justice system the way everyone does — on the job, loudly.',
        "{n} thinks 'habeas corpus' is a spell from a wizard film.",
        "{n}'s legal reform: ask everyone to please stop breaking laws. Politely. Twice.",
        "{n} has the keys to the Supreme Court and no idea which door they open."],
    },
  };
  function houseJoke(f, k, used) {
    const set = SEAT_JOKES[k][f.tags.includes(k) ? 'fit' : 'no'];
    const fresh = set.filter((j) => !used.has(j));
    const j = pickOne(fresh.length ? fresh : set);
    used.add(j);
    return j.split('{n}').join(f.s);
  }

  Pundit.house = function (S) {
    const rows = S.players.map((p) => {
      const t = S.teams[p.id];
      const fs = t.seats.map((x, i) => ({ f: CC.pol(x), seat: CC.SEATS[i], sc: E.seatScore(x, CC.SK[i]), buy: t.buys.find((b) => b.seat === i) }));
      const pow = E.power(t.seats);
      return { p, t, fs, pow, chem: E.chemistry(t.seats) };
    });
    const maxPow = Math.max(...rows.map((r) => r.pow)), minPow = Math.min(...rows.map((r) => r.pow));

    const serious = rows.map((r) => {
      const fits = r.fs.filter((x) => x.f.tags.includes(x.seat.k));
      const ranked = r.fs.slice().sort((a, b) => b.sc - a.sc);
      const best = ranked[0], worst = ranked[ranked.length - 1];
      const countries = new Set(r.fs.map((x) => x.f.c)).size;
      const eras = new Set(r.fs.map((x) => x.f.e)).size;
      const spread = maxPow === minPow ? 0.5 : (r.pow - minPow) / (maxPow - minPow);
      const score = Math.round((4 + spread * 4.5 + fits.length * 0.25) * 10) / 10;
      const headline = fits.length >= 4 ? 'Square pegs, square holes'
        : fits.length <= 1 ? 'Everyone is in the wrong job'
        : countries === 1 ? `${D.COUNTRIES[r.fs[0].f.c].name} first, second and third`
        : eras === 3 ? 'A coalition across the centuries'
        : 'Solid on paper, untested in practice';
      return {
        id: r.p.id,
        score: Math.min(10, score),
        headline,
        strengths: (best.sc === worst.sc
          ? `Nobody stands out — every minister scores ${best.sc}`
          : `${best.f.n} at ${best.seat.name} is the anchor (${best.sc} pts)`) +
          (r.chem.length ? `; chemistry bonus: ${r.chem.map((c) => `${c.label} +${c.v}`).join(', ')}` : '') + '.',
        weaknesses: worst.f.tags.includes(worst.seat.k)
          ? `No real weak link — ${worst.f.n} at ${worst.seat.name} is the softest spot.`
          : `${worst.f.n} has little background for ${worst.seat.name} — expect a steep learning curve.`,
        verdict: `${fits.length} of 5 ministers sit in seats that match their experience, from ${countries} ${countries === 1 ? 'country' : 'countries'}.`,
      };
    }).sort((a, b) => b.score - a.score);

    const top = rows.find((r) => r.p.id === serious[0].id), bottom = rows.find((r) => r.p.id === serious[serious.length - 1].id);
    // Cabinet-level roast: the line-up, and the player's drafting choices.
    const used = new Set();
    const roast = rows.map((r) => {
      const name = r.p.name, lines = [];
      const L = r.fs[0].f, Ec = r.fs[1].f, Df = r.fs[3].f;
      const years = r.fs.map((x) => yearOf(x.f));
      const span = Math.max(...years) - Math.min(...years);
      const oldest = r.fs[years.indexOf(Math.min(...years))].f, newest = r.fs[years.indexOf(Math.max(...years))].f;
      const paid = r.t.buys.filter((b) => !b.rnd).sort((a, b) => b.v - a.v)[0];
      const bargain = r.t.buys.find((b) => !b.rnd && b.v === 1 && CC.pol(b.f).tags.includes(CC.SK[b.seat]));
      const forced = r.t.buys.find((b) => b.rnd);
      const countries = new Set(r.fs.map((x) => x.f.c)).size;
      const fits = r.fs.filter((x) => x.f.tags.includes(x.seat.k)).length;
      // Candidate angles, sharpest first; each cabinet prefers angles nobody else has had yet.
      const add = (k, text) => lines.push({ k, text });
      if (fits <= 1) add('wrong', `${name} put almost everyone in the wrong job. This isn't a cabinet, it's a costume party.`);
      else if (fits >= 4) add('right', `${name} put nearly everyone in the right job. Suspiciously competent — did ${name} actually read the rules?`);
      if (r === top && rows.length > 1) add('top', `${name}'s cabinet is the strongest on paper. Paper, famously, is not fireproof.`);
      else if (r === bottom && rows.length > 1) add('bottom', `${name}'s cabinet has the lowest power in the room. The dice have been asked to work overtime.`);
      else if (rows.length > 1) add('mid', `Next to ${top.p.name}'s cabinet, ${name}'s looks like a group project finished at 3 a.m.`);
      if (paid && paid.v >= 7) add('paid', `${name} paid ${paid.v} credits for ${CC.pol(paid.f).s}. Somewhere, a used-car salesman is weeping with pride.`);
      if (bargain) add('bargain', `${name} got ${CC.pol(bargain.f).s} for 1 credit — the only good deal this government will ever make.`);
      if (forced) add('forced', `${CC.pol(forced.f).s} joined because nobody else wanted them. ${name} didn't either, but here we are.`);
      if (r.t.cr >= 5) add('cash', `${name} finished with ${r.t.cr} credits unspent — the first government in history to underspend, and it still found a way to look broke.`);
      if (countries === 1) add('one', `An all-${D.COUNTRIES[L.c].name} cabinet: the Foreign Minister's main job is booking the summit venue down the road.`);
      else if (countries === 5) add('five', `Five ministers, five countries, zero shared jokes: every meeting needs three interpreters and a referee.`);
      if (span > 150) add('span', `${name}'s cabinet spans ${span} years: ${newest.s} has to explain Wi-Fi to ${oldest.s}, and ${oldest.s} has to explain quills to ${newest.s}.`);
      if (r.p.bot) add('bot', `${name} is a computer, and even a computer couldn't make this line-up add up.`);
      add('trio', pickOne([
        `${L.s} chairs the meetings while ${Df.s} puts up a border around the coffee machine and ${Ec.s} charges everyone to cross it.`,
        `With ${L.s} in charge and ${Df.s} at Interior, the press conferences will be short, loud and slightly terrifying.`,
        `${L.s} and ${Ec.s} agree on exactly one thing: the other one should resign.`,
        `${L.s}, ${Ec.s} and ${Df.s} walk into a cabinet meeting. That's the joke. That's the whole government.`,
      ]));
      const picked = lines.filter((l) => !used.has('angle:' + l.k)).slice(0, 3);
      for (const l of lines) if (picked.length < 3 && !picked.includes(l)) picked.push(l);
      picked.forEach((l) => used.add('angle:' + l.k));
      return {
        id: r.p.id,
        roast: picked.map((l) => l.text).join(' '),
        lines: r.fs.map((x, i) => ({ seat: i, f: r.t.seats[i], joke: houseJoke(x.f, x.seat.k, used) })),
      };
    });

    return {
      source: 'house',
      phase: S.phase,
      serious: {
        summary: `${top.p.name}'s cabinet leads on paper (power ${top.pow}); ${bottom.p.name}'s will need ${S.settings.judge === 'vote' ? 'a very persuasive speech' : 'the crisis dice to be very kind'} (power ${bottom.pow}).`,
        cabinets: serious,
      },
      roast: {
        headline: pickOne([
          `BREAKING: ${rows.length} governments sworn in, zero adults in the room.`,
          `Historians confirm none of these cabinets could ever have existed. Voters relieved.`,
          `${rows.length} cabinets, ${rows.length * 5} egos, one country and absolutely no chance.`,
          `Country declares state of emergency after seeing its possible governments.`,
          `Political scientists reach for something stronger than coffee.`,
        ]),
        cabinets: roast,
        closer: pickOne([
          'The pundit has left the building. Recount requests will be shredded.',
          'Polls close when the snacks run out.',
          'In this game the real winner is whoever argued the loudest. Good luck to the quiet ones.',
          'No ministers were harmed in the making of this roast. Their egos, however…',
          'Complaints can be submitted in writing, directly into the bin.',
        ]),
      },
    };
  };

  CC.Pundit = Pundit;
})();
