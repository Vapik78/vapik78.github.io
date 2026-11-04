/* Cabinet Clash — online rooms over WebRTC (PeerJS).
   The host's browser runs the game; friends connect to it directly with a
   4-letter room code. PeerJS's free public server is only used to introduce
   the browsers to each other, so this works on a static site like GitHub Pages. */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const PREFIX = 'cabinet-clash-v1-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const Net = { peer: null, conns: new Map(), hostConn: null };

  Net.makeCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

  Net.host = function (code, cb) {
    Net.close();
    const peer = new window.Peer(PREFIX + code, { debug: 0 });
    Net.peer = peer;
    peer.on('open', () => cb.open(code));
    peer.on('error', (e) => cb.error(e));
    // Losing the matchmaking server doesn't drop friends already connected.
    peer.on('disconnected', () => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { /* ignore */ } });
    peer.on('connection', (conn) => {
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        if (msg.t === 'hello') cb.join(conn, msg);
        else if (msg.t === 'act' && msg.a && typeof msg.a === 'object') cb.act(conn, msg.a);
      });
      conn.on('close', () => cb.leave(conn));
      conn.on('error', () => cb.leave(conn));
    });
  };

  Net.broadcast = function (S) {
    const msg = { t: 'state', s: S, now: Date.now() };
    for (const c of Net.conns.values()) if (c.open) c.send(msg);
  };

  Net.join = function (code, hello, cb) {
    Net.close();
    const peer = new window.Peer({ debug: 0 });
    Net.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      Net.hostConn = conn;
      conn.on('open', () => conn.send(Object.assign({ t: 'hello' }, hello)));
      conn.on('data', (m) => m && cb.msg(m));
      conn.on('close', () => cb.close());
      conn.on('error', (e) => cb.error(e));
    });
    peer.on('error', (e) => cb.error(e));
  };

  Net.send = (msg) => { if (Net.hostConn && Net.hostConn.open) Net.hostConn.send(msg); };

  Net.close = function () {
    try { if (Net.peer) Net.peer.destroy(); } catch (e) { /* already gone */ }
    Net.peer = null;
    Net.hostConn = null;
    Net.conns.clear();
  };

  Net.describe = function (e) {
    const t = (e && e.type) || '';
    if (t === 'peer-unavailable') return 'Room not found. Check the code — the host has to keep the game open.';
    if (t === 'browser-incompatible') return 'This browser does not support online play (WebRTC).';
    if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed')
      return 'Could not reach the matchmaking server. Check your internet connection and try again.';
    return 'Connection problem: ' + ((e && e.message) || t || 'unknown error');
  };

  CC.Net = Net;
})();
