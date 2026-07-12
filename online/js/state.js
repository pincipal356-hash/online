// state.js — Gestión de estado y sincronización host-authoritative
//
// Modelo:
//   - El host es la autoridad: ejecuta el motor y broadcasts el estado completo.
//   - Los clientes envían acciones (join, answer, vote) al host.
//   - El host aplica la acción, muta el estado, y broadcasts.
//
// Mensajes (protocolo):
//   join          { type, playerId, playerName, gender }
//   join_ack      { type, you: playerObj, gameState }
//   state_sync    { type, gameState }
//   action        { type, action: "answer"|"vote"|"start"|"next"|"skip"|"strip"|"panic"|"kick"|"leave", payload }
//   chat          { type, playerId, text }
//   presence      { type, playerId, online }

const State = (function() {

  function defaultGameState() {
    return {
      roomCode: null,
      hostId: null,
      players: [],
      mode: null,
      maxSpice: 3,
      currentLevel: 1,
      currentQ: null,
      currentActor: null,
      currentTarget: null,
      lastParsedText: null,
      history: [],
      usedIds: [],
      categoryWeights: {},
      affinityPairs: {},
      consecutiveSkipsTotal: 0,
      castigoActive: false,
      hotStreak: 0,
      lastLevels: [],
      answeredSinceLastUp: 0,
      vorChoice: null,
      secretModeUnlocked: false,
      consent: false,
      initialGarments: 5,
      toggles: { physical: true, deep: true, sound: true },
      location: null,
      coupleMode: "open",
      couplePairs: [],
      chains: [],
      screen: "lobby",
      chat: [],
      votes: {},
      stats: { gamesPlayed: 0, questionsAnswered: 0, garmentsLost: 0 }
    };
  }

  function defaultClientMeta() {
    return {
      playerId: "p_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      playerName: "",
      gender: "otro",
      isHost: false,
      online: true
    };
  }

  // Aplica acción al estado del host
  function applyAction(state, action, playerId) {
    const ns = Object.assign({}, state);
    switch(action.type) {
      case "join": {
        // Añadir jugador si no existe
        const existing = ns.players.find(p => p.id === playerId);
        if (!existing) {
          ns.players = ns.players.concat([{
            id: playerId,
            name: action.playerName || "Anónimo",
            gender: action.gender || "otro",
            garments: ns.initialGarments,
            online: true,
            joinedAt: Date.now()
          }]);
        } else {
          ns.players = ns.players.map(p => p.id === playerId ? Object.assign({}, p, { online: true }) : p);
        }
        break;
      }
      case "leave": {
        ns.players = ns.players.map(p => p.id === playerId ? Object.assign({}, p, { online: false }) : p);
        break;
      }
      case "start": {
        ns.mode = action.mode;
        ns.screen = "game";
        ns.currentQ = null;
        ns.vorChoice = null;
        ns.consecutiveSkipsTotal = 0;
        ns.castigoActive = false;
        ns.hotStreak = 0;
        ns.currentLevel = 1;
        ns.answeredSinceLastUp = 0;
        ns.usedIds = [];
        ns.history = [];
        ns.stats.gamesPlayed = (ns.stats.gamesPlayed || 0) + 1;
        break;
      }
      case "set_config": {
        if (action.maxSpice !== undefined) ns.maxSpice = action.maxSpice;
        if (action.initialGarments !== undefined) {
          ns.initialGarments = action.initialGarments;
          ns.players = ns.players.map(p => Object.assign({}, p, { garments: action.initialGarments }));
        }
        if (action.secretModeUnlocked !== undefined) ns.secretModeUnlocked = action.secretModeUnlocked;
        if (action.consent !== undefined) ns.consent = action.consent;
        if (action.toggles !== undefined) ns.toggles = action.toggles;
        if (action.location !== undefined) ns.location = action.location;
        if (action.coupleMode !== undefined) ns.coupleMode = action.coupleMode;
        break;
      }
      case "vor_choice": {
        ns.vorChoice = action.choice;
        ns.currentQ = null;
        break;
      }
      case "answer": {
        // action: { type: "answer", action: "cumplir"|"strip"|"skip", q, actor, target }
        return Engine.applyAnswer(state, action.q, action.action === "skip", action.action, action.actor, action.target);
      }
      case "vote": {
        ns.votes = Object.assign({}, ns.votes);
        ns.votes[playerId] = action.targetId;
        break;
      }
      case "panic": {
        ns.maxSpice = Math.max(1, ns.maxSpice - 1);
        if (ns.currentLevel > ns.maxSpice) ns.currentLevel = ns.maxSpice;
        ns.hotStreak = 0;
        ns.currentQ = null;
        ns.vorChoice = null;
        const contactTypes = ["control","bound","master","touch","permission"];
        ns.chains = (ns.chains || []).filter(c => !contactTypes.includes(c.type));
        break;
      }
      case "kick": {
        ns.players = ns.players.filter(p => p.id !== action.targetId);
        break;
      }
      case "reset": {
        ns.history = [];
        ns.usedIds = [];
        ns.categoryWeights = {};
        ns.affinityPairs = {};
        ns.currentLevel = 1;
        ns.answeredSinceLastUp = 0;
        ns.consecutiveSkipsTotal = 0;
        ns.castigoActive = false;
        ns.hotStreak = 0;
        ns.lastLevels = [];
        ns.currentQ = null;
        ns.vorChoice = null;
        ns.chains = [];
        ns.players = ns.players.map(p => Object.assign({}, p, { garments: ns.initialGarments }));
        break;
      }
      case "chat": {
        const player = ns.players.find(p => p.id === playerId);
        if (player && action.text) {
          ns.chat = (ns.chat || []).concat([{
            playerId, playerName: player.name, text: action.text.slice(0, 200), ts: Date.now()
          }]).slice(-50);
        }
        break;
      }
    }
    return ns;
  }

  // Serializa el estado para broadcast (sin funciones)
  function serialize(state) {
    return JSON.parse(JSON.stringify(state));
  }

  return { defaultGameState, defaultClientMeta, applyAction, serialize };
})();

if (typeof window !== "undefined") window.State = State;
