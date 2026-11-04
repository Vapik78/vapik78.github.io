/* Cabinet Clash — online rooms through a free public MQTT broker.
   GitHub Pages can't run a server, and direct browser-to-browser (WebRTC)
   connections fail between many networks (mobile data especially) without a
   relay server. So every player connects *out* to a public MQTT broker over a
   secure WebSocket, which works on any network. The host's browser still runs
   the game; the broker only passes messages along.

   Topics for room CODE (prefix cabinetclash/v2/CODE/):
     room       retained "the host is here" marker, cleared when the host leaves
     state      retained latest game state, published by the host
     up         players -> host: hello / act / ping / bye
     to/<cid>   host -> one player: welcome / err */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
  const PREFIX = 'cabinetclash/v2/';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  const Net = { client: null, base: '', cid: '', hosting: false, lastS: null, peers: new Map(), conns: new Map(), timers: [] };

  Net.makeCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

  // Connect to the first broker that answers.
  function connect(i, opts, onUp, onFail) {
    if (!window.mqtt) return onFail({ type: 'no-library' });
    if (i >= BROKERS.length) return onFail({ type: 'network' });
    const c = window.mqtt.connect(BROKERS[i], Object.assign({
      clientId: 'cc_' + rid(), clean: true, keepalive: 20, connectTimeout: 6000, reconnectPeriod: 2000,
    }, opts));
    let up = false;
    const t = setTimeout(() => { if (!up) { c.end(true); connect(i + 1, opts, onUp, onFail); } }, 7000);
    c.once('connect', () => { up = true; clearTimeout(t); onUp(c, i); });
    c.on('error', () => { /* mqtt.js keeps retrying; the timeout above moves on to the next broker */ });
  }
  const pub = (topic, obj, retain) => {
    if (Net.client) Net.client.publish(topic, obj == null ? '' : JSON.stringify(obj), { qos: 0, retain: !!retain });
  };
  // null = an empty (cleared) message, undefined = garbage.
  const parse = (buf) => { const s = buf.toString(); if (!s) return null; try { return JSON.parse(s); } catch (e) { return undefined; } };

  /* ---------- host ---------- */
  function makeConn(cid) {
    return {
      cid, pid: null, open: true, seen: Date.now(),
      send(msg) { if (this.open) pub(Net.base + 'to/' + cid, msg); },
      close() { this.open = false; Net.peers.delete(cid); },
    };
  }
  function drop(conn, cb) {
    if (!Net.peers.has(conn.cid)) return;
    Net.peers.delete(conn.cid);
    conn.open = false;
    cb.leave(conn);
  }
  function publishState() {
    if (Net.lastS) pub(Net.base + 'state', { t: 'state', s: Net.lastS, now: Date.now() }, true);
  }

  Net.host = function (code, cb) {
    Net.close();
    const base = (Net.base = PREFIX + code + '/');
    // If the host's connection dies, the broker clears the room marker for everyone.
    const will = { topic: base + 'room', payload: '', qos: 1, retain: true };
    connect(0, { will }, (c) => {
      Net.client = c;
      let checked = false, taken = false;
      c.on('message', (topic, buf) => {
        const m = parse(buf);
        if (topic === base + 'room') { if (!checked && m) taken = true; return; }
        if (topic !== base + 'up' || !m || typeof m.cid !== 'string') return;
        let conn = Net.peers.get(m.cid);
        if (m.t === 'hello') {
          if (!conn) { conn = makeConn(m.cid); Net.peers.set(m.cid, conn); }
          conn.seen = Date.now();
          cb.join(conn, m);
          return;
        }
        // A player we had dropped (e.g. after the host's phone paused) — ask them to re-introduce themselves.
        if (!conn) { if (m.t !== 'bye') pub(base + 'to/' + m.cid, { t: 'rehello' }); return; }
        conn.seen = Date.now();
        if (m.t === 'act' && m.a && typeof m.a === 'object') cb.act(conn, m.a);
        else if (m.t === 'bye') drop(conn, cb);
      });
      // Make sure nobody else is using this code before claiming it.
      c.subscribe(base + 'room', () => setTimeout(() => {
        checked = true;
        c.unsubscribe(base + 'room');
        if (taken) { Net.close(); cb.error({ type: 'unavailable-id' }); return; }
        Net.hosting = true;
        pub(base + 'room', { t: 'room', at: Date.now() }, true);
        c.subscribe(base + 'up');
        c.on('connect', () => { // back after a dropped connection: re-announce the room
          pub(base + 'room', { t: 'room', at: Date.now() }, true);
          publishState();
          if (cb.status) cb.status(true);
        });
        c.on('offline', () => { if (cb.status) cb.status(false); });
        // Players ping every 5 s; silence for 20 s means they're gone.
        Net.timers.push(setInterval(() => {
          const now = Date.now();
          for (const conn of [...Net.peers.values()]) if (now - conn.seen > 20000) drop(conn, cb);
        }, 3000));
        cb.open(code);
      }, 1200));
    }, (e) => cb.error(e));
  };

  Net.broadcast = function (S) {
    Net.lastS = S;
    publishState();
  };

  /* ---------- player ---------- */
  Net.join = function (code, hello, cb) {
    Net.close();
    const base = (Net.base = PREFIX + code + '/');
    const cid = (Net.cid = 'c' + rid());
    const will = { topic: base + 'up', payload: JSON.stringify({ t: 'bye', cid }), qos: 0, retain: false };
    const attempt = (i) => connect(i, { will }, (c, used) => {
      Net.client = c;
      let found = false, hostUp = false, welcomed = false, pending = null;
      const sayHello = () => pub(base + 'up', Object.assign({ t: 'hello', cid }, hello));
      c.on('message', (topic, buf) => {
        const m = parse(buf);
        if (m === undefined) return;
        if (topic === base + 'room') {
          if (m && !found) { found = hostUp = true; sayHello(); }
          else if (!m && hostUp) { hostUp = false; cb.close(); } // the host went offline
          else if (m && !hostUp) { hostUp = true; sayHello(); } // ...and is back
          return;
        }
        if (!m) return;
        if (topic === base + 'to/' + cid) {
          if (m.t === 'rehello') { sayHello(); return; }
          cb.msg(m);
          if (m.t === 'welcome') { welcomed = true; if (pending) { cb.msg(pending); pending = null; } }
          return;
        }
        // Ignore the retained state until the host has let us in; keep the newest for then.
        if (topic === base + 'state') { if (welcomed) cb.msg(m); else pending = m; }
      });
      c.subscribe([base + 'room', base + 'state', base + 'to/' + cid], () => setTimeout(() => {
        if (found) return;
        // No room on this broker: try the next one, then give up.
        c.end(true);
        Net.client = null;
        if (used + 1 < BROKERS.length) attempt(used + 1);
        else cb.error({ type: 'peer-unavailable' });
      }, 2500));
      c.on('connect', () => { if (found) sayHello(); }); // after our own reconnect
      Net.timers.push(setInterval(() => { if (found && c.connected) pub(base + 'up', { t: 'ping', cid }); }, 5000));
    }, (e) => cb.error(e));
    attempt(0);
  };

  Net.send = (msg) => pub(Net.base + 'up', Object.assign({ cid: Net.cid }, msg));

  Net.close = function () {
    Net.timers.forEach(clearInterval);
    Net.timers = [];
    const c = Net.client;
    if (c) {
      if (Net.hosting) { pub(Net.base + 'room', null, true); pub(Net.base + 'state', null, true); }
      else if (Net.cid) pub(Net.base + 'up', { t: 'bye', cid: Net.cid });
      try { c.end(false); } catch (e) { /* already closed */ }
    }
    Object.assign(Net, { client: null, hosting: false, cid: '', lastS: null });
    Net.peers.clear();
    Net.conns.clear();
  };

  // Phones pause pages in the background; reconnect as soon as the game is visible again.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Net.client && !Net.client.connected) Net.client.reconnect();
  });
  window.addEventListener('pagehide', () => { if (Net.hosting) Net.close(); });

  Net.describe = function (e) {
    const t = (e && e.type) || '';
    if (t === 'peer-unavailable') return 'Room not found. Check the code — and the host needs to have the game open.';
    if (t === 'no-library') return 'The online library did not load — check your internet connection and reload.';
    if (t === 'network') return 'Could not reach the game server. Check your internet connection and try again.';
    return 'Connection problem: ' + ((e && e.message) || t || 'unknown error');
  };

  CC.Net = Net;
})();
