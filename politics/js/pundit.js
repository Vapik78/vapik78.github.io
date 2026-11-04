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
  const FREE_MODELS = {
    better: { base: 'Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B', size: '≈1.8 GB' },
    light: { base: 'Llama-3.2-1B-Instruct', label: 'Llama 3.2 1B', size: '≈0.9 GB' }, // faster, but sillier and less accurate
  };

  const store = {
    get: (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* blocked */ } },
  };
  // Earlier versions could store an Anthropic API key here; make sure none lingers.
  store.set('cc-ai-key', '');
  store.set('cc-ai-proxy', '');

  const Pundit = {
    FREE_MODELS,
    freeModel: () => (store.get('cc-free-model') === 'light' ? 'light' : 'better'),
    setFreeModel: (k) => store.set('cc-free-model', k === 'light' ? 'light' : ''),
    // WebLLM needs WebGPU: Chrome/Edge on desktop, recent Safari, some Android Chrome.
    freeSupported: () => typeof navigator !== 'undefined' && !!navigator.gpu,
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
Answer in English, using exactly the lines you are asked for. Each line is one short sentence.`;

  const FORMAT = `Answer with exactly these four lines, filling in your own words:
SCORE: <a number from 1.0 to 10.0 for how well this cabinet would govern>
HEADLINE: <a catchy title for this cabinet, 4 to 8 words>
STRENGTH: <its biggest strength, naming the minister responsible>
WEAKNESS: <its biggest weakness, naming the minister responsible>`;

  // The roast gets its own call with one line per seat, so every minister is covered.
  const SEAT_KEYS = ['LEADER', 'ECONOMY', 'FOREIGN', 'DEFENCE', 'HOME'];
  function roastFormat(S, p) {
    const t = S.teams[p.id];
    return `Roast this cabinet: write one funny, good-natured joke about EACH minister and how they would do in that job.\n${cabinetBrief(S, p, true)}\n\n` +
      `Rules: each joke is one or two short sentences, under 30 words, and starts with the minister's name. Joke only about their politics, public record, style and how they fit the job. Never invent quotes or tweets. Never joke about gender, looks, age, family, health, religion, ethnicity, death or violence.\n\nAnswer with exactly these six lines:\n` +
      CC.SEATS.map((s, i) => `${SEAT_KEYS[i]}: <a joke about ${CC.pol(t.seats[i]).n} as ${s.name}>`).join('\n') +
      `\nOVERALL: <one joke about this whole cabinet working together>`;
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
  const OFF_LIMITS = /\b(gender|woman|women|female|girl|wife|husband|housewife|household|chores?|kitchen|cook(ing)?|sandwich|smile|pretty|ugly|fat|weight|hair|bald|old age|senile|dementia|wrinkl|tomb|tombstone|grave|coffin|funeral|dead|death|die[ds]?|dying|kill\w*|murder\w*|assassin\w*|shot|genocide|holocaust|massacre|nuclear|bomb\w*|terror\w*|shoot\w*|gun\w*|tweet\w*|affair|lewinsky|intern|rape|sex\w*|race|racis\w*|religio\w*|muslim|jew\w*|christian|god)\b/i;
  const safe = (text) => (text && !OFF_LIMITS.test(text) ? text : '');

  async function chat(engine, user, maxTokens) {
    const r = await engine.chat.completions.create({
      messages: [{ role: 'system', content: FREE_SYSTEM }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return (r.choices[0] && r.choices[0].message.content) || '';
  }

  Pundit.askFree = async function (S, onProgress) {
    if (!Pundit.freeSupported()) throw new Error('This browser has no WebGPU, so the free AI can\'t run here. Try Chrome or Edge on a computer — or use the house pundit.');
    let got;
    try {
      got = await freeEngine(onProgress);
    } catch (e) {
      engine = null;
      throw new Error(/memory|device|lost/i.test(String(e && e.message)) ? 'Not enough graphics memory for this model. Pick the lighter model in Pundit settings.' : (e && e.message) || 'The free AI failed to start.');
    }
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
      const jokes = lines(await chat(got.engine, roastFormat(S, p), 420), SEAT_KEYS.concat('OVERALL'));
      for (const k in jokes) jokes[k] = safe(jokes[k]);
      const h = house.serious.cabinets.find((c) => c.id === p.id), hr = house.roast.cabinets.find((c) => c.id === p.id);
      const ms = parseFloat(f.SCORE);
      const own = SEAT_KEYS.filter((k) => jokes[k]).length;
      if (f.HEADLINE && own >= 3) usable++;
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
    const text = await chat(got.engine, `${S.phase === 'final' ? 'Final standings: ' + E.standings(S).map((r, i) => `${i + 1}. ${r.p.name} (${r.pts} pts)`).join(', ') + '.\n' : ''}The cabinets and their scores:\n${recap}\n\nAnswer with exactly these two lines:\nSUMMARY: <one serious sentence comparing the cabinets and naming the strongest one>\nHEADLINE: <one funny newspaper headline that compares the cabinets>`, 160);
    const f = lines(text, ['SUMMARY', 'HEADLINE']);
    return {
      source: 'free',
      model: got.pref.label,
      phase: S.phase,
      serious: { summary: f.SUMMARY || house.serious.summary, cabinets: serious },
      roast: { headline: f.HEADLINE || house.roast.headline, cabinets: roast, closer: house.roast.closer },
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

  // House quips: one per minister, depending on the seat and whether they have done the job before.
  const SEAT_JOKES = {
    L: { fit: ['{n} has run a country before and will mention it at every single meeting.', '{n} slips into the top job like an old pair of slippers.', '{n} already knows where the good biscuits are kept in the cabinet room.'],
         no: ['{n} as Leader: nobody is quite sure who is in charge, including {n}.', '{n} accepts the top job, then asks where the coffee machine is.', '{n} will chair cabinet meetings by reading the agenda very, very slowly.'] },
    E: { fit: ['{n} actually understands the budget, which makes the rest of the cabinet deeply nervous.', '{n} balances the books and still finds money for a victory parade.', '{n} reads spreadsheets for fun — and expects the cabinet to do the same.'],
         no: ['{n} at Economy: the budget will be balanced on vibes alone.', '{n} plans to beat inflation by asking it nicely to stop.', '{n} has promised a budget "with lots of numbers in it".'] },
    F: { fit: ['{n} has a passport thicker than most novels and a handshake for every occasion.', '{n} can open a summit in one language and close it in three.', '{n} has shaken more hands than a wedding photographer.'],
         no: ['{n} at Foreign Affairs: embassies are stocking up on apology letters.', '{n} thinks a diplomatic incident is just a lively lunch.', '{n} will bring a phrasebook to every summit and use the wrong page.'] },
    D: { fit: ['{n} at Defence: the generals finally have someone who reads their memos.', '{n} has redrawn maps before and keeps a red pen just in case.', '{n} salutes the flag, the troops and occasionally the coat rack.'],
         no: ['{n} at Defence: the army has been told to expect "interesting" orders.', '{n} will inspect the troops, then ask which end of the tank is the front.', '{n} has never commanded anything bigger than a dinner party.'] },
    I: { fit: ['{n} knows every law by heart, including the ones nobody follows.', '{n} keeps order so well that even cabinet meetings start on time.', '{n} has read the constitution twice and the small print three times.'],
         no: ['{n} at Home & Justice: the police are bracing themselves.', '{n} promises law and order, mostly in that order.', '{n} will learn the justice system the way everyone does — on the job.'] },
  };
  function houseJoke(f, k) {
    const set = SEAT_JOKES[k][f.tags.includes(k) ? 'fit' : 'no'];
    return pickOne(set).split('{n}').join(f.s);
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
    const roast = rows.map((r) => {
      const lines = [];
      const L = r.fs[0].f, Df = r.fs[3].f, Ec = r.fs[1].f;
      const years = r.fs.map((x) => yearOf(x.f));
      const span = Math.max(...years) - Math.min(...years);
      const oldest = r.fs[years.indexOf(Math.min(...years))].f;
      const paid = r.t.buys.filter((b) => !b.rnd).sort((a, b) => b.v - a.v)[0];
      const forced = r.t.buys.find((b) => b.rnd);
      const countries = new Set(r.fs.map((x) => x.f.c)).size;
      if (span > 150) lines.push(`${r.p.name}'s cabinet spans ${span} years of history — somebody has to explain email to ${oldest.s}.`);
      if (paid && paid.v >= 7) lines.push(`Spent ${paid.v} credits on ${CC.pol(paid.f).s}. The receipt is framed in the cabinet room.`);
      if (forced) lines.push(`${CC.pol(forced.f).s} arrived for 1 credit because nobody else would take them — a bargain nobody asked for.`);
      if (countries === 1) lines.push(`An all-${D.COUNTRIES[L.c].name} cabinet: the Foreign Minister's main job is booking the summit venue at home.`);
      else if (countries === 5) lines.push(`Five ministers, five countries: every cabinet meeting needs simultaneous interpretation and a lot of patience.`);
      lines.push(pickOne([
        `${L.s} chairs the meetings while ${Df.s} quietly redraws the map on a napkin.`,
        `${Ec.s} runs the economy, which means the budget speech will be long and the pie charts longer.`,
        `With ${L.s} in charge and ${Df.s} at Defence, the press conferences will be short and very loud.`,
        `${L.s} and ${Ec.s} agree on one thing: the other one should resign.`,
      ]));
      return {
        id: r.p.id,
        roast: lines.slice(0, 2).join(' '),
        lines: r.fs.map((x, i) => ({ seat: i, f: r.t.seats[i], joke: houseJoke(x.f, x.seat.k) })),
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
          `Breaking: ${rows.length} governments sworn in, zero coalition agreements signed.`,
          `Historians confirm: none of these cabinets could ever have existed. Voters relieved.`,
          `${rows.length} cabinets, ${rows.length * 5} egos, one country to run.`,
        ]),
        cabinets: roast,
        closer: pickOne([
          'The pundit has left the building. Recount requests will be ignored.',
          'Polls close when the snacks run out.',
          'Remember: in this game, the real winner is whoever argued the loudest.',
        ]),
      },
    };
  };

  CC.Pundit = Pundit;
})();
