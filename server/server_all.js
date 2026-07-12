// server/server_all.js — Servidor único: estáticos + WebSocket relay
//
// Sirve los archivos de la web (index.html, js/, css/) Y el relay WebSocket
// en el mismo puerto. Una sola URL para todo.
//
// Uso:
//   node server/server_all.js [puerto]
//   (por defecto puerto 8080)
//
// Deploy:
//   - Local:   node server/server_all.js  →  http://localhost:8080
//   - Render:  startCommand: node server/server_all.js
//
// Una vez arrancado:
//   - Abre http://TU_IP:8080  (sin ?server=... porque el relay está en el mismo host)
//   - La página detecta automáticamente que el relay es wss://mismo-host/ws

const http = require("http");
const fs = require("fs");
const path = require("path");

let WebSocketServer = null;
try {
  const WS = require("ws");
  WebSocketServer = WS.WebSocketServer || WS.Server;
} catch(e) {
  console.error("Falta el módulo 'ws'. Instálalo con: npm install ws");
  process.exit(1);
}

const PORT = parseInt(process.argv[2] || process.env.PORT || "8080", 10);
const ROOT = path.join(__dirname, ".."); // carpeta online/

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".yaml": "text/yaml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const httpServer = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");

  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";

  // Seguridad: prevenir path traversal
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found: " + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

// WebSocket relay sobre el mismo servidor HTTP, en path /ws
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
const rooms = new Map(); // roomCode -> Set<WebSocket>

wss.on("connection", (ws, req) => {
  let currentRoom = null;
  let playerId = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch(e) { return; }

    if (msg.type === "join" && msg.room) {
      currentRoom = msg.room;
      playerId = msg.playerId || playerId;
      if (!rooms.has(currentRoom)) rooms.set(currentRoom, new Set());
      rooms.get(currentRoom).add(ws);
      console.log(`[JOIN] ${playerId} → room ${currentRoom} (${rooms.get(currentRoom).size} clientes)`);
      broadcast(currentRoom, msg, ws);
      return;
    }

    if (currentRoom) {
      broadcast(currentRoom, msg, ws);
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      rooms.get(currentRoom).delete(ws);
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
    if (client !== except && client.readyState === 1) {
      try { client.send(data); } catch(e) {}
    }
  });
}

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🩸 After Dark — Servidor único escuchando en http://0.0.0.0:${PORT}`);
  console.log(`   WebSocket relay en ws://0.0.0.0:${PORT}/ws`);
  console.log(`   Web estática en http://0.0.0.0:${PORT}/`);
  console.log(`   - Para local: abre http://localhost:${PORT}?server=ws://localhost:${PORT}/ws`);
  console.log(`   - Para Render: el servidor detecta la URL automáticamente`);
});
