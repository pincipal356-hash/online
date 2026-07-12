// transport.js — Capa de transporte para multijugador online
// Soporta dos modos:
//   1. BroadcastChannel (default, zero-config, solo mismo navegador)
//   2. WebSocket relay (cross-device, requiere server/relay.js)

const Transport = (function() {

  // ---- BroadcastChannel transport ----
  function createBroadcastTransport(roomCode) {
    const channelName = "afterdark_" + roomCode;
    let channel = null;
    let listeners = [];

    try {
      channel = new BroadcastChannel(channelName);
    } catch(e) {
      console.error("BroadcastChannel no soportado", e);
    }

    function onMessage(handler) { listeners.push(handler); }
    function send(msg) {
      if (!channel) return;
      channel.postMessage(msg);
    }
    function close() {
      listeners = [];
      if (channel) { channel.onmessage = null; channel.close(); channel = null; }
    }

    if (channel) {
      channel.onmessage = (e) => {
        const data = e.data;
        listeners.forEach(l => { try { l(data); } catch(err) { console.error(err); } });
      };
    }

    return { onMessage, send, close, type: "broadcast" };
  }

  // ---- WebSocket relay transport ----
  function createWebSocketTransport(roomCode, wsUrl, role, playerId, playerName) {
    let ws = null;
    let listeners = [];
    let connected = false;
    let reconnectTimer = null;
    let connectPromise = null;

    function onMessage(handler) { listeners.push(handler); }

    function send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }

    function connect() {
      return new Promise((resolve, reject) => {
        try {
          ws = new WebSocket(wsUrl);
        } catch(e) {
          reject(e);
          return;
        }
        const timeout = setTimeout(() => {
          if (!connected) reject(new Error("timeout"));
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          connected = true;
          // Enviar handshake: unirse a la sala
          send({ type: "join", room: roomCode, role, playerId, playerName, ts: Date.now() });
          resolve();
        };
        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            listeners.forEach(l => { try { l(data); } catch(err) { console.error(err); } });
          } catch(err) { console.error("parse error", err); }
        };
        ws.onclose = () => {
          clearTimeout(timeout);
          connected = false;
          // Reconnect automático tras 2s
          if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              connect().catch(() => {});
            }, 2000);
          }
        };
        ws.onerror = (err) => {
          clearTimeout(timeout);
          if (!connected) reject(err);
        };
      });
    }

    function close() {
      listeners = [];
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (ws) { ws.onclose = null; ws.close(); ws = null; }
      connected = false;
    }

    return { onMessage, send, close, connect, type: "websocket",
      isConnected: () => connected };
  }

  // ---- Factory ----
  function create(config) {
    // config: { roomCode, mode: "broadcast"|"ws", wsUrl?, role, playerId, playerName }
    if (config.mode === "ws" && config.wsUrl) {
      return createWebSocketTransport(config.roomCode, config.wsUrl, config.role, config.playerId, config.playerName);
    }
    return createBroadcastTransport(config.roomCode);
  }

  return { create };
})();

if (typeof window !== "undefined") window.Transport = Transport;
