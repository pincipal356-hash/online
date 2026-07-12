// server/relay.js — Servidor WebSocket relay para After Dark Online
//
// Uso:
//   node server/relay.js [puerto]
//   (por defecto puerto 8080)
//
// Función:
//   - Acepta conexiones WebSocket de clientes.
//   - Cada cliente se une a una "room" identificada por el código de partida.
//   - Reenvía mensajes entre todos los clientes de la misma room.
//   - No guarda estado del juego: el host es la autoridad.
//
// Dependencias: ninguna (usa el módulo 'ws' si está disponible, si no, fallback a http+WebSocket nativo).

const PORT = parseInt(process.argv[2] || "8080", 10);

// Intentar usar el módulo 'ws' si está instalado, si no, usar implementación nativa
let WebSocketServer = null;
try {
  const WS = require("ws");
  WebSocketServer = WS.WebSocketServer || WS.Server;
} catch(e) {
  console.log("Módulo 'ws' no encontrado. Para instalarlo: npm install ws");
  console.log("Usando implementación nativa (Node 22+ con --experimental-websocket)...");
}

if (!WebSocketServer) {
  // Fallback: usar el WebSocket nativo de Node 22+
  // Requiere Node v22+ con flag --experimental-websocket
  console.error("No se pudo iniciar el servidor. Instala 'ws' con: npm install ws");
  process.exit(1);
}

const wss = new WebSocketServer({ port: PORT });
const rooms = new Map(); // roomCode -> Set<WebSocket>

wss.on("connection", (ws, req) => {
  let currentRoom = null;
  let playerId = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch(e) { return; }

    // Join: el cliente se une a una room
    if (msg.type === "join" && msg.room) {
      currentRoom = msg.room;
      playerId = msg.playerId || playerId;
      if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
      rooms.get(currentRoom).add(ws);
      console.log(`[JOIN] ${playerId} → room ${currentRoom} (${rooms.get(currentRoom).size} clientes)`);
      // Reenviar el mensaje de join al resto de la room (para que el host lo procese)
      broadcast(currentRoom, msg, ws);
      return;
    }

    // Cualquier otro mensaje: reenviar a todos en la room
    if (currentRoom) {
      broadcast(currentRoom, msg, ws);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
      // Notificar离开 al resto
      if (playerId) {
        broadcast(currentRoom, { type: "presence", playerId, online: false });
      }
      if (rooms.get(currentRoom).size === 0) {
        rooms.delete(currentRoom);
        console.log(`[CLOSE] room ${currentRoom} eliminada (vacía)`);
      }
    }
  });

  ws.on("error", (err) => {
    console.error("[ERROR]", err.message);
  });
});

function broadcast(roomCode, msg, except) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = typeof msg === "string" ? msg : JSON.stringify(msg);
  room.forEach(client => {
    if (client !== except && client.readyState === 1 /* OPEN */) {
      try { client.send(data); } catch(e) {}
    }
  });
}

console.log(`🩸 After Dark relay escuchando en ws://0.0.0.0:${PORT}`);
console.log(`   Los clientes pueden conectarse con: ?server=ws://IP:${PORT}`);
console.log(`   (en localhost: ?server=ws://localhost:${PORT})`);
