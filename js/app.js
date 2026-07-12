// app.js — Entry point: orquesta transporte, estado y UI

const App = (function() {

  const app = {
    state: null,
    client: null,
    transport: null,
    container: null,
    wsUrl: null,
    transportMode: "broadcast",  // broadcast | ws | mqtt
    connectionLog: [],
    lastError: null
  };

  function logConnection(msg, type = "info") {
    const entry = { msg, type, ts: new Date().toLocaleTimeString() };
    app.connectionLog.push(entry);
    if (app.connectionLog.length > 20) app.connectionLog.shift();
    console.log(`[App:${type}]`, msg);
    // Si estamos en pantalla de diagnóstico, actualizar
    const logEl = document.getElementById("diag-log");
    if (logEl) {
      logEl.innerHTML = app.connectionLog.map(e =>
        `<div class="log-entry log-${e.type}">[${e.ts}] ${e.msg}</div>`
      ).join("");
    }
  }

  // Captura global de errores
  window.addEventListener("error", (e) => {
    app.lastError = e.error ? e.error.message : e.message;
    logConnection("Error JS: " + app.lastError, "error");
  });
  window.addEventListener("unhandledrejection", (e) => {
    app.lastError = e.reason ? (e.reason.message || e.reason) : "Promise rechazada";
    logConnection("Promise rechazada: " + app.lastError, "error");
  });

  function init() {
    app.container = document.getElementById("app");

    // Detectar modo de transporte desde URL
    // ?server=ws://host:port   → WebSocket relay propio
    // ?online=1                 → MQTT broker público (cross-network)
    // ?auto=1                   → Detectar relay en mismo host (para server_all.js)
    // (default sin parámetros)  → Si la URL es http(s)://host, intentar wss://host/ws automáticamente
    const params = new URLSearchParams(location.search);
    const server = params.get("server");
    const online = params.get("online");
    const auto = params.get("auto");
    if (server) {
      app.transportMode = "ws";
      app.wsUrl = server;
      logConnection(`Modo WebSocket relay: ${server}`, "info");
    } else if (online === "1" || online === "true") {
      app.transportMode = "mqtt";
      logConnection("Modo MQTT broker público", "info");
    } else if (auto === "1" || (!server && !online && location.protocol.startsWith("http") && location.hostname && location.hostname !== "localhost" && location.hostname !== "127.0.0.1" && location.hostname !== "pincipal356-hash.github.io")) {
      // Auto-detectar: usar el mismo host con path /ws
      // Construir wss:// o ws:// según el protocolo
      const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
      app.transportMode = "ws";
      app.wsUrl = `${wsProtocol}//${location.host}/ws`;
      logConnection(`Auto-detectado relay en mismo host: ${app.wsUrl}`, "info");
    } else {
      logConnection("Modo BroadcastChannel (local)", "info");
    }

    // Cargar client meta desde localStorage
    const saved = loadClientMeta();
    app.client = Object.assign(State.defaultClientMeta(), saved);

    // Detectar si hay código en la URL
    const code = params.get("code");
    if (code) {
      // Modo "unirse"
      showJoinScreen(code.toUpperCase());
    } else {
      // Pantalla inicial
      showHomeScreen();
    }
  }

  function loadClientMeta() {
    try {
      const raw = localStorage.getItem("afterdark_client");
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return {};
  }
  function saveClientMeta() {
    try { localStorage.setItem("afterdark_client", JSON.stringify(app.client)); } catch(e) {}
  }

  // ============ HOME / CREATE / JOIN ============
  function showHomeScreen() {
    const wrap = UI.el("div", { class: "fade-in home-screen" },
      UI.el("div", { class: "brand" },
        UI.el("div", { class: "brand-gem" }),
        UI.el("div", {},
          UI.el("div", { class: "brand-name" }, "After Dark"),
          UI.el("div", { class: "brand-tag" }, "Online · Multijugador")
        )
      ),
      UI.el("h1", { class: "page-title" }, "After Dark Online"),
      UI.el("p", { class: "page-sub" }, "Crea una sala o únete con un código. Multijugador real por código de partida.")
    );

    // Tu perfil
    wrap.appendChild(UI.el("div", { class: "section-title" }, "Tu perfil"));
    const profileCard = UI.el("div", { class: "card" });
    const nameInput = UI.el("input", {
      class: "input", type: "text", placeholder: "Tu nombre",
      value: app.client.playerName || "",
      oninput: (e) => { app.client.playerName = e.target.value; saveClientMeta(); }
    });
    const genderSelect = UI.el("select", {
      class: "select", style: "max-width: 200px; margin-top: 8px;",
      onchange: (e) => { app.client.gender = e.target.value; saveClientMeta(); }
    },
      UI.el("option", { value: "f" }, "Femenino"),
      UI.el("option", { value: "m" }, "Masculino"),
      UI.el("option", { value: "otro", selected: app.client.gender === "otro" }, "Otro")
    );
    if (app.client.gender === "f") genderSelect.querySelectorAll("option")[0].selected = true;
    if (app.client.gender === "m") genderSelect.querySelectorAll("option")[1].selected = true;
    profileCard.appendChild(nameInput);
    profileCard.appendChild(genderSelect);
    wrap.appendChild(profileCard);

    // Acciones
    wrap.appendChild(UI.el("div", { class: "section-title" }, "Comenzar"));
    const actionsGrid = UI.el("div", { class: "home-actions" });
    actionsGrid.appendChild(UI.el("button", {
      class: "btn btn-primary btn-lg btn-block",
      onclick: () => {
        if (!app.client.playerName.trim()) { UI.toast("Escribe tu nombre", "error"); return; }
        createRoom();
      }
    }, "➕ Crear sala"));
    actionsGrid.appendChild(UI.el("button", {
      class: "btn btn-ghost btn-lg btn-block",
      onclick: () => showJoinScreen()
    }, "🔑 Unirse con código"));
    actionsGrid.appendChild(UI.el("button", {
      class: "btn btn-ghost btn-block",
      style: "font-size: 13px; padding: 10px;",
      onclick: () => showDiagScreen()
    }, "🔧 Diagnóstico"));
    wrap.appendChild(actionsGrid);

    // Selector de modo de conexión
    wrap.appendChild(UI.el("div", { class: "section-title" }, "Modo de conexión"));
    const modeCard = UI.el("div", { class: "card" });

    const modes = [
      { v: "broadcast", label: "📡 Mismo navegador", desc: "Varias pestañas en este dispositivo. Sin internet.", url: null },
      { v: "mqtt", label: "🌐 Internet (público)", desc: "Entre dispositivos y redes distintas. Sin registro. Usa broker MQTT público.", url: "?online=1" },
      { v: "ws", label: "🔌 Relay propio", desc: "Tu servidor node relay.js. Máximo control.", url: "?server=ws://localhost:8080" }
    ];

    modes.forEach(m => {
      const isCurrent = app.transportMode === m.v;
      const row = UI.el("div", {
        class: "mode-option " + (isCurrent ? "active" : ""),
        onclick: () => {
          if (m.url) {
            location.href = m.url;
          } else {
            // Quitar query params
            location.href = location.pathname;
          }
        }
      },
        UI.el("div", { class: "mo-label" }, m.label + (isCurrent ? " ✓" : "")),
        UI.el("div", { class: "mo-desc" }, m.desc)
      );
      modeCard.appendChild(row);
    });

    // Info extra
    if (app.transportMode === "mqtt") {
      modeCard.appendChild(UI.el("div", { class: "mo-info" },
        UI.el("div", {}, "🔗 Broker: wss://broker.emqx.io:8084/mqtt"),
        UI.el("div", { style: "margin-top:4px;" }, "Funciona entre cualquier red (WiFi, 4G, etc.). Sin servidor propio.")
      ));
    } else if (app.transportMode === "ws") {
      modeCard.appendChild(UI.el("div", { class: "mo-info" },
        UI.el("div", {}, "🔗 Relay: " + app.wsUrl),
        UI.el("div", { style: "margin-top:4px;" }, "Necesitas server/relay.js ejecutándose. Ver README.")
      ));
    } else {
      modeCard.appendChild(UI.el("div", { class: "mo-info" },
        UI.el("div", {}, "🔗 BroadcastChannel nativo del navegador"),
        UI.el("div", { style: "margin-top:4px;" }, "Solo pestañas del mismo navegador. Sin red.")
      ));
    }

    wrap.appendChild(modeCard);

    app.container.innerHTML = "";
    app.container.appendChild(wrap);
  }

  function showJoinScreen(prefillCode) {
    const wrap = UI.el("div", { class: "fade-in home-screen" },
      UI.el("h1", { class: "page-title" }, "Unirse a sala"),
      UI.el("p", { class: "page-sub" }, "Introduce el código de 5 caracteres que te dio el host.")
    );

    const card = UI.el("div", { class: "card" });
    const nameInput = UI.el("input", {
      class: "input", type: "text", placeholder: "Tu nombre",
      value: app.client.playerName || "",
      oninput: (e) => { app.client.playerName = e.target.value; saveClientMeta(); }
    });
    const codeInput = UI.el("input", {
      class: "input code-input", type: "text", maxlength: "5", placeholder: "ABCDE",
      value: prefillCode || "",
      style: "letter-spacing: 0.4em; text-align: center; font-size: 22px; font-weight: 700; text-transform: uppercase;",
      oninput: (e) => { e.target.value = e.target.value.toUpperCase(); }
    });
    const genderSelect = UI.el("select", { class: "select", style: "max-width: 200px;" },
      UI.el("option", { value: "f" }, "Femenino"),
      UI.el("option", { value: "m" }, "Masculino"),
      UI.el("option", { value: "otro", selected: true }, "Otro")
    );
    card.appendChild(UI.el("div", { class: "field" }, UI.el("label", {}, "Tu nombre"), nameInput));
    card.appendChild(UI.el("div", { class: "field" }, UI.el("label", {}, "Código de partida"), codeInput));
    card.appendChild(UI.el("div", { class: "field" }, UI.el("label", {}, "Género"), genderSelect));
    card.appendChild(UI.el("button", {
      class: "btn btn-primary btn-block btn-lg",
      onclick: () => {
        const name = nameInput.value.trim();
        const code = codeInput.value.trim().toUpperCase();
        const gender = genderSelect.value;
        if (!name) { UI.toast("Escribe tu nombre", "error"); return; }
        if (code.length !== 5) { UI.toast("Código debe tener 5 caracteres", "error"); return; }
        app.client.playerName = name;
        app.client.gender = gender;
        app.client.isHost = false;
        saveClientMeta();
        joinRoom(code);
      }
    }, "Unirse"));
    wrap.appendChild(card);

    wrap.appendChild(UI.el("button", {
      class: "btn btn-ghost",
      style: "margin-top: 14px;",
      onclick: () => showHomeScreen()
    }, "← Volver"));

    app.container.innerHTML = "";
    app.container.appendChild(wrap);
  }

  // ============ CREATE / JOIN ROOM ============
  function createRoom() {
    const code = Engine.generateGameCode();
    app.client.isHost = true;
    saveClientMeta();

    // Inicializar estado del host
    app.state = State.defaultGameState();
    app.state.roomCode = code;
    app.state.hostId = app.client.playerId;
    app.state.screen = "lobby";
    // Añadir host como jugador
    app.state.players = [{
      id: app.client.playerId,
      name: app.client.playerName,
      gender: app.client.gender,
      garments: app.state.initialGarments,
      online: true,
      joinedAt: Date.now()
    }];

    // Crear transporte
    setupTransport(code);
    UI.toast("Sala creada: " + code, "ok");
    goto("lobby");
  }

  function joinRoom(code) {
    app.state = State.defaultGameState();
    app.state.roomCode = code;
    app.state.screen = "lobby";

    setupTransport(code);

    // Enviar petición de join
    app.transport.send({
      type: "join",
      room: code,
      playerId: app.client.playerId,
      playerName: app.client.playerName,
      gender: app.client.gender,
      ts: Date.now()
    });

    // Si es WebSocket, esperar confirmación del host vía relay
    // Si es BroadcastChannel, esperar state_sync del host
    UI.toast("Conectando a sala " + code + "...", "warn");

    // Timeout: si en 5s no hay respuesta, mostrar error
    setTimeout(() => {
      if (app.state && app.state.players.length === 0 && !app.client.isHost) {
        UI.toast("No se pudo conectar. ¿Está el host en la sala?", "error");
      }
    }, 5000);

    goto("lobby");
  }

  function setupTransport(code) {
    if (app.transport) app.transport.close();
    logConnection(`Configurando transporte: modo=${app.transportMode}, sala=${code}`, "info");

    if (app.transportMode === "mqtt") {
      // MQTT broker público
      logConnection("Creando transporte MQTT...", "info");
      app.transport = TransportMQTT.create({
        roomCode: code,
        role: app.client.isHost ? "host" : "guest",
        playerId: app.client.playerId,
        playerName: app.client.playerName
      });
    } else {
      // BroadcastChannel o WebSocket relay propio
      logConnection(`Creando transporte ${app.transportMode}...` + (app.wsUrl ? ` URL=${app.wsUrl}` : ""), "info");
      app.transport = Transport.create({
        roomCode: code,
        mode: app.transportMode,
        wsUrl: app.wsUrl,
        role: app.client.isHost ? "host" : "guest",
        playerId: app.client.playerId,
        playerName: app.client.playerName
      });
    }

    app.transport.onMessage(handleMessage);

    if (app.transport.connect) {
      // MQTT o WebSocket necesitan connect explícito
      logConnection("Conectando...", "info");
      const connectStart = Date.now();
      app.transport.connect().then(() => {
        const elapsed = Date.now() - connectStart;
        logConnection(`Conectado en ${elapsed}ms`, "ok");
        UI.toast(app.transportMode === "mqtt" ? "Conectado al broker público" : "Conectado al relay", "ok");
        // Re-enviar join si era guest
        if (!app.client.isHost) {
          logConnection("Enviando join como guest...", "info");
          app.transport.send({
            type: "join",
            room: code,
            playerId: app.client.playerId,
            playerName: app.client.playerName,
            gender: app.client.gender,
            ts: Date.now()
          });
        }
      }).catch(err => {
        const msg = err.message || String(err);
        logConnection(`Error de conexión: ${msg}`, "error");
        UI.toast("Error de conexión: " + msg, "error");
        // Reintentar después de 3s
        setTimeout(() => {
          logConnection("Reintentando conexión...", "warn");
          setupTransport(code);
        }, 3000);
      });
    } else {
      logConnection("Transporte BroadcastChannel listo (sin connect explícito)", "ok");
      // BroadcastChannel no necesita connect, pero si somos guest enviamos join
      if (!app.client.isHost) {
        setTimeout(() => {
          app.transport.send({
            type: "join",
            room: code,
            playerId: app.client.playerId,
            playerName: app.client.playerName,
            gender: app.client.gender,
            ts: Date.now()
          });
          logConnection("Join enviado (broadcast)", "info");
        }, 200);
      }
    }
  }

  // ============ MESSAGE HANDLER ============
  function handleMessage(msg) {
    if (!msg || !msg.type) return;
    logConnection(`Recibido: ${msg.type}` + (msg.action ? ` (${msg.action.type})` : "") + (msg.gameState ? ` [screen=${msg.gameState.screen}, mode=${msg.gameState.mode || "-"}]` : ""), "info");

    switch(msg.type) {
      case "join": {
        // Solo el host procesa joins
        if (app.client.isHost) {
          logConnection(`Join de ${msg.playerName} (${msg.playerId})`, "info");
          app.state = State.applyAction(app.state, { type: "join", playerName: msg.playerName, gender: msg.gender }, msg.playerId);
          // Responder al cliente con state_sync (él se añadirá a sí mismo al recibir el estado)
          app.transport.send({ type: "state_sync", gameState: State.serialize(app.state), target: msg.playerId });
          // Broadcast a todos
          broadcastState();
        }
        break;
      }
      case "state_sync": {
        // Si es para mí (target = mi playerId) o broadcast (sin target)
        if (!msg.target || msg.target === app.client.playerId) {
          if (msg.gameState) {
            const oldScreen = app.currentScreen;
            app.state = msg.gameState;
            logConnection(`Estado aplicado: screen=${app.state.screen}, mode=${app.state.mode || "-"}, currentQ=${app.state.currentQ ? "sí" : "no"}, players=${app.state.players.length}`, "ok");
            // Forzar sincronización de pantalla SIEMPRE
            if (app.state.screen !== app.currentScreen) {
              logConnection(`Cambio de pantalla: ${oldScreen} → ${app.state.screen}`, "info");
              goto(app.state.screen);
            } else {
              rerender();
            }
          }
        }
        break;
      }
      case "action": {
        // Solo el host procesa acciones
        if (app.client.isHost && msg.action) {
          logConnection(`Acción de ${msg.playerId}: ${msg.action.type}`, "info");
          app.state = State.applyAction(app.state, msg.action, msg.playerId);
          // Si es start, asegurar screen=game
          if (msg.action.type === "start") {
            app.state.screen = "game";
          }
          broadcastState();
          rerender();
        }
        break;
      }
      case "chat": {
        if (app.client.isHost) {
          app.state = State.applyAction(app.state, { type: "chat", text: msg.text }, msg.playerId);
          broadcastState();
        }
        break;
      }
      case "presence": {
        if (app.client.isHost) {
          if (msg.online === false) {
            app.state = State.applyAction(app.state, { type: "leave" }, msg.playerId);
            broadcastState();
          }
        }
        break;
      }
    }
  }

  function broadcastState() {
    if (!app.transport || !app.client.isHost) return;
    app.transport.send({ type: "state_sync", gameState: State.serialize(app.state) });
  }

  // ============ CLIENT ACTIONS ============
  function sendAction(action) {
    logConnection(`Enviando acción: ${action.type}`, "info");
    if (app.client.isHost) {
      // Host aplica localmente
      app.state = State.applyAction(app.state, action, app.client.playerId);
      // Caso especial: si es start, gestionar screen
      if (action.type === "start") {
        app.state.screen = "game";
        logConnection("Partida iniciada, screen=game", "ok");
      }
      broadcastState();
      // Forzar sincronización de pantalla en el host también
      if (app.state.screen && app.state.screen !== app.currentScreen) {
        goto(app.state.screen);
      } else {
        rerender();
      }
    } else {
      // Cliente envía al host
      app.transport.send({ type: "action", action, playerId: app.client.playerId });
    }
  }

  function sendAnswer(answerAction) {
    if (!app.state.currentQ) return;
    const q = app.state.currentQ;
    const actor = app.state.currentActor;
    const target = app.state.currentTarget;
    if (app.client.isHost) {
      app.state = State.applyAction(app.state, { type: "answer", action: answerAction, q, actor, target }, app.client.playerId);
      broadcastState();
      rerender();
    } else {
      app.transport.send({
        type: "action",
        action: { type: "answer", action: answerAction, q, actor, target },
        playerId: app.client.playerId
      });
    }
  }

  function hostPickNext() {
    if (!app.client.isHost || !app.state) return;
    if (app.state.currentQ) return; // ya hay pregunta
    logConnection("Host eligiendo siguiente pregunta...", "info");
    const picked = Engine.pickNextQuestion(QUESTION_BANK, app.state);
    if (!picked) {
      logConnection("No hay más preguntas disponibles", "error");
      UI.toast("Se acabaron las preguntas. Reinicia la partida.", "error");
      return;
    }
    app.state.currentQ = picked.q;
    app.state.currentActor = picked.actor;
    app.state.currentTarget = picked.target;
    app.state.lastParsedText = Engine.parseText(picked.q.text, picked.actor, picked.target);
    logConnection(`Pregunta elegida: ${picked.q.id} (N${picked.q.level}), actor=${picked.actor?.name}, target=${picked.target?.name}`, "ok");
    broadcastState();
    rerender();
  }

  function goto(screen) {
    app.currentScreen = screen;
    rerender();
  }

  function rerender() {
    if (!app.state || !app.container) return;
    // Sincronizar currentScreen con state.screen (para que host y cliente siempre coincidan)
    if (app.state.screen && app.state.screen !== app.currentScreen) {
      app.currentScreen = app.state.screen;
    }
    const screen = app.currentScreen || app.state.screen || "lobby";
    switch(screen) {
      case "lobby": UI.renderLobby(app.container, app); break;
      case "game": UI.renderGame(app.container, app); break;
      case "players": UI.renderPlayers(app.container, app); break;
      case "history": UI.renderHistory(app.container, app); break;
      default: UI.renderLobby(app.container, app);
    }
  }

  function showDiagScreen() {
    const wrap = UI.el("div", { class: "fade-in home-screen" },
      UI.el("h1", { class: "page-title" }, "Diagnóstico"),
      UI.el("p", { class: "page-sub" }, "Estado de la conexión y errores.")
    );

    const card = UI.el("div", { class: "card" });
    card.appendChild(UI.el("div", { class: "diag-row" },
      UI.el("span", {}, "Modo de transporte:"),
      UI.el("strong", {}, app.transportMode)
    ));
    card.appendChild(UI.el("div", { class: "diag-row" },
      UI.el("span", {}, "URL del servidor:"),
      UI.el("strong", {}, app.wsUrl || "(broadcast local)")
    ));
    card.appendChild(UI.el("div", { class: "diag-row" },
      UI.el("span", {}, "Player ID:"),
      UI.el("strong", {}, app.client.playerId)
    ));
    card.appendChild(UI.el("div", { class: "diag-row" },
      UI.el("span", {}, "Nombre:"),
      UI.el("strong", {}, app.client.playerName || "(sin nombre)")
    ));
    card.appendChild(UI.el("div", { class: "diag-row" },
      UI.el("span", {}, "Es host:"),
      UI.el("strong", {}, app.client.isHost ? "Sí" : "No")
    ));
    if (app.transport) {
      card.appendChild(UI.el("div", { class: "diag-row" },
        UI.el("span", {}, "Transporte activo:"),
        UI.el("strong", {}, app.transport.type || "?")
      ));
      card.appendChild(UI.el("div", { class: "diag-row" },
        UI.el("span", {}, "Conectado:"),
        UI.el("strong", {}, app.transport.isConnected ? (app.transport.isConnected() ? "Sí" : "No") : "N/A")
      ));
    } else {
      card.appendChild(UI.el("div", { class: "diag-row" },
        UI.el("span", {}, "Transporte:"),
        UI.el("strong", { style: "color: var(--text-mute);" }, "(no creado)")
      ));
    }
    if (app.state) {
      card.appendChild(UI.el("div", { class: "diag-row" },
        UI.el("span", {}, "Sala:"),
        UI.el("strong", {}, app.state.roomCode || "(ninguna)")
      ));
      card.appendChild(UI.el("div", { class: "diag-row" },
        UI.el("span", {}, "Jugadores:"),
        UI.el("strong", {}, String(app.state.players.length))
      ));
    }
    if (app.lastError) {
      card.appendChild(UI.el("div", { class: "diag-row" },
        UI.el("span", {}, "Último error:"),
        UI.el("strong", { style: "color: var(--danger);" }, app.lastError)
      ));
    }
    wrap.appendChild(card);

    // Log
    wrap.appendChild(UI.el("div", { class: "section-title" }, "Log de conexión"));
    const logBox = UI.el("div", { class: "diag-log", id: "diag-log" });
    app.connectionLog.forEach(e => {
      logBox.appendChild(UI.el("div", { class: `log-entry log-${e.type}` }, `[${e.ts}] ${e.msg}`));
    });
    wrap.appendChild(logBox);

    // Acciones
    wrap.appendChild(UI.el("div", { class: "section-title" }, "Acciones"));
    wrap.appendChild(UI.el("div", { style: "display:flex; gap:10px; flex-wrap:wrap;" },
      UI.el("button", {
        class: "btn btn-primary",
        onclick: () => {
          // Test directo: intentar conectar al WebSocket relay
          if (!app.wsUrl) { UI.toast("No hay URL de servidor configurada", "error"); return; }
          logConnection("Test directo: conectando a " + app.wsUrl, "info");
          try {
            const testWs = new WebSocket(app.wsUrl);
            const start = Date.now();
            testWs.onopen = () => {
              logConnection(`Test OK: conectado en ${Date.now() - start}ms`, "ok");
              UI.toast("Conexión OK", "ok");
              testWs.close();
            };
            testWs.onerror = (err) => {
              logConnection("Test FAIL: error de WebSocket", "error");
              UI.toast("Conexión fallida", "error");
            };
            testWs.onclose = (ev) => {
              logConnection(`Test cerrado: code=${ev.code}, reason=${ev.reason || "(sin razón)"}`, "info");
            };
            setTimeout(() => {
              if (testWs.readyState !== WebSocket.OPEN && testWs.readyState !== WebSocket.CLOSED) {
                logConnection("Test: timeout tras 10s", "error");
                testWs.close();
              }
            }, 10000);
          } catch(err) {
            logConnection("Test error: " + err.message, "error");
          }
        }
      }, "🔌 Probar conexión"),
      UI.el("button", {
        class: "btn btn-ghost",
        onclick: () => {
          if (app.state && app.state.roomCode) {
            setupTransport(app.state.roomCode);
            UI.toast("Reconectando...", "warn");
          } else {
            UI.toast("No hay sala activa", "error");
          }
        }
      }, "🔄 Reconectar"),
      UI.el("button", {
        class: "btn btn-ghost",
        onclick: () => {
          app.connectionLog = [];
          app.lastError = null;
          showDiagScreen();
        }
      }, "🧹 Limpiar log"),
      UI.el("button", { class: "btn btn-ghost", onclick: () => showHomeScreen() }, "← Volver")
    ));

    app.container.innerHTML = "";
    app.container.appendChild(wrap);
  }

  function leave() {
    if (app.transport) {
      if (!app.client.isHost) {
        app.transport.send({ type: "presence", playerId: app.client.playerId, online: false });
      }
      app.transport.close();
      app.transport = null;
    }
    app.state = null;
    app.client.isHost = false;
    showHomeScreen();
  }

  // Expose
  app.init = init;
  app.goto = goto;
  app.rerender = rerender;
  app.sendAction = sendAction;
  app.sendAnswer = sendAnswer;
  app.hostPickNext = hostPickNext;
  app.leave = leave;
  app.showHomeScreen = showHomeScreen;
  app.showDiagScreen = showDiagScreen;
  app.logConnection = logConnection;

  // Cleanup al cerrar
  window.addEventListener("beforeunload", () => {
    if (app.transport && !app.client.isHost) {
      try { app.transport.send({ type: "presence", playerId: app.client.playerId, online: false }); } catch(e) {}
    }
  });

  return app;
})();

if (typeof window !== "undefined") {
  window.App = App;
  document.addEventListener("DOMContentLoaded", () => App.init());
}
