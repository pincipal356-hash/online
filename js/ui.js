// ui.js — Renderizado de la interfaz (lobby, juego, historial, etc.)

const UI = (function() {

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    Object.keys(attrs).forEach(k => {
      if (k === "class") node.className = attrs[k];
      else if (k === "html") node.innerHTML = attrs[k];
      else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === "dataset") Object.keys(attrs[k]).forEach(d => node.dataset[d] = attrs[k][d]);
      else node.setAttribute(k, attrs[k]);
    });
    children.flat().forEach(c => {
      if (c == null || c === false) return;
      if (typeof c === "string" || typeof c === "number") node.appendChild(document.createTextNode(String(c)));
      else node.appendChild(c);
    });
    return node;
  }

  function gem(level, size = "", active = false) {
    return el("div", { class: `gem ${LEVELS[level]?.color || "lvl-1"} ${size} ${active ? "active" : ""}`.trim() });
  }

  function avatarLetter(name) {
    return (name || "?").trim().charAt(0).toUpperCase() || "?";
  }

  function toast(msg, type = "") {
    const t = el("div", { class: `toast ${type}`.trim() }, msg);
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 0.3s"; }, 2400);
    setTimeout(() => t.remove(), 2800);
  }

  function highlightNames(text, actor, target) {
    if (!text) return "";
    let html = escapeHtml(text);
    if (actor) html = html.replace(new RegExp(escapeReg(actor.name), "g"), `<span class="hl">${escapeHtml(actor.name)}</span>`);
    if (target) html = html.replace(new RegExp(escapeReg(target.name), "g"), `<span class="hl">${escapeHtml(target.name)}</span>`);
    return html;
  }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c])); }
  function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // ============ LOBBY ============
  function renderLobby(container, app) {
    const st = app.state;
    const isHost = app.client.isHost;

    const wrap = el("div", { class: "fade-in" },
      el("h1", { class: "page-title" }, isHost ? "Sala creada" : "Sala unida"),
      el("p", { class: "page-sub" }, `Código de partida: `),
      el("div", { class: "room-code-card" },
        el("div", { class: "room-code" }, st.roomCode),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(st.roomCode).then(() => toast("Código copiado", "ok"));
          }
        }}, "Copiar"),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => {
          const url = location.href.split("?")[0] + "?code=" + st.roomCode;
          if (navigator.share) navigator.share({ title: "After Dark", text: "Únete a mi partida: " + st.roomCode, url });
          else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast("Enlace copiado", "ok"));
        }}, "Compartir enlace")
      )
    );

    // Players list
    wrap.appendChild(el("div", { class: "section-title" }, `Jugadores (${st.players.length})`));
    const pl = el("div", { class: "player-list" });
    st.players.forEach(p => {
      pl.appendChild(el("div", { class: "player-row" },
        el("div", { class: "pr-avatar" }, avatarLetter(p.name)),
        el("div", { class: "pr-name" }, p.name + (p.id === st.hostId ? " 👑" : "")),
        el("div", { class: "pr-gender" }, p.gender),
        el("div", { class: "pr-garments" },
          el("span", {}, `${p.garments} 👕`)
        ),
        el("div", { class: "pr-status " + (p.online ? "online" : "offline") }, p.online ? "●" : "○")
      ));
    });
    wrap.appendChild(pl);

    // Chat
    wrap.appendChild(el("div", { class: "section-title" }, "Chat"));
    const chatBox = el("div", { class: "chat-box", id: "chat-box" });
    (st.chat || []).forEach(m => {
      chatBox.appendChild(el("div", { class: "chat-msg" },
        el("span", { class: "cm-author" }, m.playerName + ":"),
        el("span", { class: "cm-text" }, m.text)
      ));
    });
    wrap.appendChild(chatBox);
    const chatInput = el("input", {
      class: "input", type: "text", placeholder: "Escribe un mensaje...",
      onkeydown: (e) => {
        if (e.key === "Enter" && e.target.value.trim()) {
          app.sendAction({ type: "chat", text: e.target.value.trim() });
          e.target.value = "";
        }
      }
    });
    wrap.appendChild(chatInput);

    // Host controls
    if (isHost) {
      wrap.appendChild(el("div", { class: "section-title" }, "Configuración"));
      const cfg = el("div", { class: "card" });

      cfg.appendChild(el("div", { class: "field" },
        el("label", {}, `Nivel máximo: ${LEVELS[st.maxSpice].name}`),
        el("input", {
          class: "input", type: "range", min: "1", max: st.secretModeUnlocked ? "6" : "5",
          value: String(st.maxSpice),
          oninput: (e) => app.sendAction({ type: "set_config", maxSpice: parseInt(e.target.value, 10) })
        })
      ));
      cfg.appendChild(el("div", { class: "field" },
        el("label", {}, `Prendas iniciales: ${st.initialGarments}`),
        el("input", {
          class: "input", type: "range", min: "3", max: "8",
          value: String(st.initialGarments),
          oninput: (e) => app.sendAction({ type: "set_config", initialGarments: parseInt(e.target.value, 10) })
        })
      ));
      cfg.appendChild(el("label", {
        class: `checkbox-row ${st.consent ? "checked" : ""}`,
        onclick: () => app.sendAction({ type: "set_config", consent: !st.consent })
      },
        el("input", { type: "checkbox", checked: st.consent ? true : null }),
        el("span", {}, "Confirmo que todos somos mayores de edad y participamos por decisión propia.")
      ));
      wrap.appendChild(cfg);

      // Modos
      wrap.appendChild(el("div", { class: "section-title" }, "Elige modo"));
      const grid = el("div", { class: "mode-grid" });
      Object.keys(MODES).forEach(key => {
        const m = MODES[key];
        grid.appendChild(el("button", {
          class: "mode-card",
          onclick: () => {
            if (!st.consent) { toast("Marca el consentimiento primero", "error"); return; }
            if (st.players.length < 1) { toast("Necesitas al menos 1 jugador", "error"); return; }
            app.sendAction({ type: "start", mode: key });
          }
        },
          el("div", { class: "mode-gem-wrap" },
            el("div", {}, el("div", {}, m.emoji), el("div", { class: "mode-name" }, m.name)),
            gem(3, "md")
          ),
          el("div", { class: "mode-desc" }, m.desc),
          el("div", { class: "lvl-badge" }, st.secretModeUnlocked ? "6" : "5")
        ));
      });
      wrap.appendChild(grid);

      // Unlock secret
      if (!st.secretModeUnlocked) {
        wrap.appendChild(el("button", {
          class: "btn btn-ghost",
          style: "margin-top: 14px;",
          onclick: () => {
            const code = prompt("Código secreto:");
            if (code && code.trim() === "072125") {
              app.sendAction({ type: "set_config", secretModeUnlocked: true });
              toast("Black Opal desbloqueado", "ok");
            } else if (code) {
              toast("Código incorrecto", "error");
            }
          }
        }, "🔓 Desbloquear Black Opal"));
      }
    } else {
      // Cliente: esperar al host
      wrap.appendChild(el("div", { class: "card", style: "margin-top: 18px; text-align: center;" },
        el("div", { style: "color: var(--text-dim); margin-bottom: 8px;" }, "Esperando a que el host inicie la partida..."),
        el("div", { class: "loading-dots" },
          el("div", { class: "dot" }), el("div", { class: "dot" }), el("div", { class: "dot" })
        )
      ));
    }

    // Leave button
    wrap.appendChild(el("div", { style: "margin-top: 20px; display: flex; gap: 10px;" },
      el("button", { class: "btn btn-ghost btn-sm", onclick: () => app.leave() }, "Salir de la sala")
    ));

    container.innerHTML = "";
    container.appendChild(wrap);

    // Auto-scroll chat
    const cb = document.getElementById("chat-box");
    if (cb) cb.scrollTop = cb.scrollHeight;
  }

  // ============ GAME ============
  function renderGame(container, app) {
    const st = app.state;
    const isHost = app.client.isHost;
    const wrap = el("div", { class: "game-screen fade-in" });

    // Header
    wrap.appendChild(el("div", { class: "game-header" },
      el("div", { class: "gh-left" },
        el("button", { class: "back-btn", style: "width:36px; height:36px; border-radius:10px; background: var(--glass); display:flex; align-items:center; justify-content:center;", onclick: () => app.goto("lobby") }, "←"),
        el("div", {},
          el("div", { class: "gh-title" }, st.mode ? `${MODES[st.mode].emoji} ${MODES[st.mode].name}` : "Juego"),
          el("div", { class: "gh-meta" }, `${st.players.length} jugadores · Sala ${st.roomCode}`),
          st.hotStreak > 0 ? el("div", { class: `streak-badge ${st.hotStreak >= 3 ? "hot" : ""}` }, `🔥 Hot Streak ×${st.hotStreak}`) : null
        )
      ),
      el("div", { style: "display:flex; gap:8px;" },
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => app.goto("players") }, "Jugadores"),
        el("button", { class: "btn btn-ghost btn-sm", onclick: () => app.goto("history") }, "Historial"),
        el("button", { class: "panic-btn", "aria-label": "Pánico", onclick: () => app.sendAction({ type: "panic" }) }, "!")
      )
    ));

    // Castigo banner
    if (st.castigoActive && st.currentQ && st.currentQ.mode !== "_castigo") {
      wrap.appendChild(el("div", { class: "castigo-banner" },
        el("div", { class: "cb-icon" }, "⚠️"),
        el("div", { class: "cb-text" },
          el("div", { class: "cb-title" }, "Castigo inminente"),
          el("div", { class: "cb-desc" }, "3 saltos seguidos. El próximo será obligatorio.")
        )
      ));
    }

    // Verdad o Reto choice
    if (st.mode === "verdad_reto" && !st.vorChoice && !st.currentQ) {
      wrap.appendChild(el("h2", { style: "text-align:center; margin: 20px 0 8px; font-size: 22px;" }, "¿Verdad o Reto?"));
      wrap.appendChild(el("div", { class: "vor-choice" },
        isHost ? el("button", { class: "vor-card", onclick: () => app.sendAction({ type: "vor_choice", choice: "verdad" }) },
          gem(2, "md"), el("div", { class: "vor-label" }, "Verdad"), el("div", { class: "vor-sub" }, "Honestidad")
        ) : el("div", { class: "vor-card", style: "opacity:0.5; cursor: default;" },
          gem(2, "md"), el("div", { class: "vor-label" }, "Verdad"), el("div", { class: "vor-sub" }, "Esperando host...")
        ),
        isHost ? el("button", { class: "vor-card", onclick: () => app.sendAction({ type: "vor_choice", choice: "reto" }) },
          gem(4, "md"), el("div", { class: "vor-label" }, "Reto"), el("div", { class: "vor-sub" }, "Atrévete")
        ) : el("div", { class: "vor-card", style: "opacity:0.5; cursor: default;" },
          gem(4, "md"), el("div", { class: "vor-label" }, "Reto"), el("div", { class: "vor-sub" }, "Esperando host...")
        )
      ));
      container.innerHTML = "";
      container.appendChild(wrap);
      return;
    }

    // Si no hay pregunta actual, host debe sacar siguiente
    if (!st.currentQ) {
      if (isHost) {
        wrap.appendChild(el("div", { class: "qcard", style: "min-height:300px;" },
          el("div", { class: "loading-dots" },
            el("div", { class: "dot" }), el("div", { class: "dot" }), el("div", { class: "dot" })
          )
        ));
        container.innerHTML = "";
        container.appendChild(wrap);
        // Host pide siguiente pregunta
        setTimeout(() => app.hostPickNext(), 200);
      } else {
        wrap.appendChild(el("div", { class: "qcard", style: "min-height:300px;" },
          el("div", { style: "color: var(--text-dim);" }, "Esperando al host..."),
          el("div", { class: "loading-dots" },
            el("div", { class: "dot" }), el("div", { class: "dot" }), el("div", { class: "dot" })
          )
        ));
        container.innerHTML = "";
        container.appendChild(wrap);
      }
      return;
    }

    const q = st.currentQ;
    const actor = st.currentActor;
    const target = st.currentTarget;
    const isCastigo = q.mode === "_castigo";

    // Actor/target chips
    if (actor || target) {
      const actorRow = el("div", { class: "actor-row" });
      if (actor) {
        actorRow.appendChild(el("div", { class: "actor-chip actor" },
          el("div", { class: "ac-avatar" }, avatarLetter(actor.name)),
          el("div", {},
            el("div", { class: "ac-role" }, "Actor"),
            el("div", {}, actor.name)
          )
        ));
      }
      if (target) {
        actorRow.appendChild(el("div", { class: "actor-arrow" }, "→"));
        actorRow.appendChild(el("div", { class: "actor-chip target" },
          el("div", { class: "ac-avatar" }, avatarLetter(target.name)),
          el("div", {},
            el("div", { class: "ac-role" }, "Objetivo"),
            el("div", {}, target.name)
          )
        ));
      }
      wrap.appendChild(actorRow);
    }

    // QCard
    const qcardClass = `qcard ${isCastigo ? "castigo" : ""} ${q.level === 6 ? "watermark" : ""}`;
    wrap.appendChild(el("div", { class: qcardClass },
      el("div", { class: "qtype-pill" }, isCastigo ? "Castigo" : (q.type === "pregunta" ? "Pregunta" : "Reto")),
      gem(q.level, "xl", true),
      el("div", { class: "qcat" }, LEVELS[q.level].name),
      el("div", { class: "qtext", html: highlightNames(st.lastParsedText || q.text, actor, target) })
    ));

    // Garment tray
    const tray = el("div", { class: "garment-tray" });
    st.players.forEach(p => {
      tray.appendChild(el("div", { class: `garment-chip ${p.garments === 0 ? "zero" : ""}` },
        el("span", { class: "gc-name" }, p.name),
        el("span", { class: "gc-count" }, p.garments === 0 ? "✕" : p.garments)
      ));
    });
    wrap.appendChild(tray);

    // Heat bar
    const totalForMode = QUESTION_BANK.filter(x => x.mode === st.mode && x.level <= st.maxSpice && (x.level < 6 || st.secretModeUnlocked)).length;
    const usedInMode = st.usedIds.filter(id => QUESTION_BANK.find(x => x.id === id)?.mode === st.mode).length;
    const progress = totalForMode > 0 ? Math.min(100, (usedInMode / totalForMode) * 100) : 0;
    wrap.appendChild(el("div", { class: "game-progress" },
      el("div", { class: "gp-meta" },
        el("span", {}, `Nivel: ${st.currentLevel}${st.hotStreak >= 3 ? " · 🔥" : ""}`),
        el("span", {}, `${usedInMode} / ${totalForMode}`)
      ),
      el("div", { class: "heat-bar" },
        el("div", { class: "heat-fill", style: `width: ${progress}%` })
      )
    ));

    // Acciones (solo host puede cumplor/saltar; todos ven)
    const canStrip = (q.level >= 5 || q.strip) && actor && actor.garments > 0;
    const skipDisabled = isCastigo;

    if (isHost) {
      if (canStrip) {
        wrap.appendChild(el("div", { class: "game-actions" },
          el("button", { class: "btn btn-primary btn-lg", onclick: () => app.sendAnswer("cumplir") }, "Cumplir"),
          el("button", { class: "btn btn-flame", onclick: () => app.sendAnswer("strip") }, `Quitar prenda (${actor?.garments || 0})`),
          el("button", { class: "btn btn-ghost", disabled: skipDisabled, onclick: () => app.sendAnswer("skip") }, isCastigo ? "Oblig." : "Saltar")
        ));
      } else {
        wrap.appendChild(el("div", { class: "game-actions-2" },
          el("button", { class: isCastigo ? "btn btn-danger btn-lg" : "btn btn-primary btn-lg", onclick: () => app.sendAnswer("cumplir") }, isCastigo ? "Cumplir castigo" : "Siguiente"),
          el("button", { class: "btn btn-ghost", disabled: skipDisabled, onclick: () => app.sendAnswer("skip") }, isCastigo ? "Oblig." : "Saltar")
        ));
      }
    } else {
      wrap.appendChild(el("div", { class: "card", style: "text-align:center; padding: 14px;" },
        el("div", { style: "color: var(--text-dim); font-size: 13px;" }, "El host controla la partida. Observa y participa cuando te toque.")
      ));
    }

    container.innerHTML = "";
    container.appendChild(wrap);
  }

  // ============ PLAYERS LIST ============
  function renderPlayers(container, app) {
    const st = app.state;
    const wrap = el("div", { class: "fade-in" },
      el("h1", { class: "page-title" }, "Jugadores"),
      el("p", { class: "page-sub" }, `${st.players.length} en la sala · Código: ${st.roomCode}`)
    );
    const pl = el("div", { class: "player-list" });
    st.players.forEach(p => {
      pl.appendChild(el("div", { class: "player-row" },
        el("div", { class: "pr-avatar" }, avatarLetter(p.name)),
        el("div", { class: "pr-name" }, p.name + (p.id === st.hostId ? " 👑" : "")),
        el("div", { class: "pr-gender" }, p.gender),
        el("div", { class: "pr-garments" }, el("span", {}, `${p.garments} 👕`)),
        el("div", { class: "pr-status " + (p.online ? "online" : "offline") }, p.online ? "●" : "○")
      ));
    });
    wrap.appendChild(pl);
    wrap.appendChild(el("button", { class: "btn btn-ghost", style: "margin-top: 14px;", onclick: () => app.goto(st.screen === "game" ? "game" : "lobby") }, "Volver"));
    container.innerHTML = "";
    container.appendChild(wrap);
  }

  // ============ HISTORY ============
  function renderHistory(container, app) {
    const st = app.state;
    const wrap = el("div", { class: "fade-in" },
      el("h1", { class: "page-title" }, "Historial"),
      el("p", { class: "page-sub" }, `${st.history.length} entradas`)
    );
    if (st.history.length === 0) {
      wrap.appendChild(el("div", { class: "empty-state" },
        el("div", { class: "es-icon" }, "◆"),
        el("div", {}, "Aún no hay entradas.")
      ));
    } else {
      const list = el("div", { class: "history-list" });
      [...st.history].reverse().forEach(h => {
        list.appendChild(el("div", { class: `history-item ${h.skipped ? "skipped" : ""} ${h.castigo ? "castigo" : ""} ${h.stripped ? "stripped" : ""}` },
          gem(h.level, "sm"),
          el("div", { class: "hi-text" },
            h.text,
            el("div", { class: "hi-meta" }, `${h.castigo ? "CASTIGO · " : ""}${h.stripped ? "STRIP · " : ""}${h.skipped ? "Saltada" : "Completada"} · N${h.level}${h.actorName ? " · " + h.actorName : ""}${h.targetName ? " → " + h.targetName : ""}`)
          )
        ));
      });
      wrap.appendChild(list);
    }
    wrap.appendChild(el("button", { class: "btn btn-ghost", style: "margin-top: 14px;", onclick: () => app.goto(st.screen === "game" ? "game" : "lobby") }, "Volver"));
    container.innerHTML = "";
    container.appendChild(wrap);
  }

  return { el, gem, toast, renderLobby, renderGame, renderPlayers, renderHistory };
})();

if (typeof window !== "undefined") window.UI = UI;
