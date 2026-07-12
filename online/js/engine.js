// engine.js — Lógica del juego (funciones puras, sin estado mutable global)

const Engine = (function() {

  function genderForms(g) { return GENDER_FORMS[g] || GENDER_FORMS.otro; }

  function parseText(text, actor, target) {
    if (!text) return "";
    let out = text;
    if (actor) {
      const f = genderForms(actor.gender);
      out = out.replace(/\{P1\}/g, actor.name);
      out = out.replace(/\{P1_art\}/g, f.art);
      out = out.replace(/\{P1_pron\}/g, f.pron);
      out = out.replace(/\{P1_pos\}/g, f.pos);
      out = out.replace(/\{P1_def\}/g, f.art_def);
      out = out.replace(/\{P1_ref\}/g, f.ref);
    }
    if (target) {
      const f = genderForms(target.gender);
      out = out.replace(/\{P2\}/g, target.name);
      out = out.replace(/\{P2_art\}/g, f.art);
      out = out.replace(/\{P2_pron\}/g, f.pron);
      out = out.replace(/\{P2_pos\}/g, f.pos);
      out = out.replace(/\{P2_def\}/g, f.art_def);
      out = out.replace(/\{P2_ref\}/g, f.ref);
    }
    return out;
  }

  function pairKey(a, b) {
    if (!a || !b) return null;
    return [a.id, b.id].sort().join("|");
  }

  function pickRandomPlayer(players, exclude = null) {
    const pool = players.filter(p => !exclude || p.id !== exclude.id);
    if (pool.length === 0) return exclude;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function selectActorTarget(players, targets, coupleMode = "open", couplePairs = []) {
    if (players.length === 0) return { actor: null, target: null };
    const closed = coupleMode === "closed" && couplePairs.length > 0;
    if (targets === "self") {
      return { actor: pickRandomPlayer(players), target: null };
    }
    if (targets === "duo") {
      if (closed) {
        const pair = couplePairs[Math.floor(Math.random() * couplePairs.length)];
        const a = players.find(p => p.id === pair.a);
        const b = players.find(p => p.id === pair.b);
        if (a && b) return Math.random() < 0.5 ? { actor: a, target: b } : { actor: b, target: a };
      }
      const actor = pickRandomPlayer(players);
      const target = pickRandomPlayer(players, actor);
      return { actor, target };
    }
    if (targets === "group" || targets === "vote") {
      return { actor: pickRandomPlayer(players), target: null };
    }
    if (targets === "verdugo") {
      const verdugo = pickRandomPlayer(players);
      const target = pickRandomPlayer(players, verdugo);
      return { actor: verdugo, target };
    }
    return { actor: pickRandomPlayer(players), target: null };
  }

  function affinityScore(tags, weights) {
    if (!tags || tags.length === 0) return 0;
    let s = 0;
    tags.forEach(t => { s += (weights[t] || 0); });
    return s * 0.3;
  }

  function proximityBonus(qLevel, currentLevel) {
    const d = Math.abs(qLevel - currentLevel);
    return Math.max(0, 1.3 - d * 0.35);
  }

  function varietyPenalty(qLevel, lastLevels) {
    if (lastLevels.length === 0) return 0;
    if (lastLevels[lastLevels.length - 1] === qLevel) return -0.5;
    if (lastLevels.filter(l => l === qLevel).length >= 2) return -0.8;
    return 0;
  }

  function hotStreakBoost(q, hotStreak, maxSpice) {
    if (hotStreak >= 3 && q.level >= 5 && q.level <= maxSpice) return 2.5;
    if (hotStreak >= 2 && q.level >= 4) return 0.8;
    return 0;
  }

  function affinityBoost(q, actor, target, affinityPairs) {
    if (!actor || !target) return 0;
    const k = pairKey(actor, target);
    if (!k) return 0;
    const score = affinityPairs[k] || 0;
    if (score >= 2 && q.level >= 5) return 1.5 * Math.min(score, 4) / 4 + 0.8;
    if (score >= 1 && q.level >= 4) return 0.4;
    return 0;
  }

  function exhibitionBoost(q, actor) {
    if (!actor || actor.garments > 0) return 0;
    if (q.category === "explicito" || (q.tags || []).includes("explicito") || (q.tags || []).includes("fisico_ligero")) return 1.2;
    return 0;
  }

  function filterCandidates(bank, st) {
    return bank.filter(q => {
      if (q.mode === "_castigo") return false;
      if (q.mode !== st.mode) return false;
      if (q.level > st.maxSpice) return false;
      if (q.level === 6 && !st.secretModeUnlocked) return false;
      if (st.usedIds.includes(q.id)) return false;
      if (!st.toggles.physical && q.category === "fisico_ligero") return false;
      if (!st.toggles.deep && q.level === 4) return false;
      if (st.mode === "verdad_reto" && st.vorChoice) {
        if (st.vorChoice === "verdad" && q.type !== "pregunta") return false;
        if (st.vorChoice === "reto" && q.type !== "reto") return false;
      }
      if ((q.targets === "duo" || q.targets === "verdugo") && st.players.length < 2) return false;
      if (q.location && (!st.location || !q.location.includes(st.location))) return false;
      return true;
    });
  }

  function filterCastigos(bank) {
    return bank.filter(q => q.mode === "_castigo");
  }

  function pickNextQuestion(bank, st) {
    if (st.castigoActive) {
      const castigos = filterCastigos(bank);
      if (castigos.length > 0) {
        const scored = castigos.map(q => ({ q, score: 1 + Math.random() * 0.5 }));
        scored.sort((a, b) => b.score - a.score);
        return { q: scored[0].q, actor: st.players.length > 0 ? st.players[Math.floor(Math.random()*st.players.length)] : null, target: null };
      }
    }
    let candidates = filterCandidates(bank, st);
    if (candidates.length === 0) {
      if (st.mode === "verdad_reto" && st.vorChoice) {
        const old = st.vorChoice;
        st.vorChoice = null;
        candidates = filterCandidates(bank, st);
        st.vorChoice = old;
      }
      if (candidates.length === 0) return null;
    }
    const scored = candidates.map(q => {
      const { actor, target } = selectActorTarget(st.players, q.targets, st.coupleMode, st.couplePairs || []);
      return {
        q, actor, target,
        score: 1
          + affinityScore(q.tags, st.categoryWeights)
          + proximityBonus(q.level, st.currentLevel)
          + varietyPenalty(q.level, st.lastLevels)
          + hotStreakBoost(q, st.hotStreak, st.maxSpice)
          + affinityBoost(q, actor, target, st.affinityPairs)
          + exhibitionBoost(q, actor)
          + Math.random() * 0.5
      };
    });
    scored.sort((a, b) => b.score - a.score);
    const top5 = scored.slice(0, Math.min(5, scored.length));
    return top5[Math.floor(Math.random() * top5.length)];
  }

  function applyAnswer(state, q, skipped, action, actor, target) {
    const isCastigo = q.mode === "_castigo";
    const stripped = action === "strip";
    const ns = Object.assign({}, state);
    ns.history = (state.history || []).concat([{
      id: q.id, category: q.category, tags: q.tags, type: q.type,
      level: q.level, text: state.lastParsedText || q.text,
      skipped, timestamp: Date.now(),
      castigo: isCastigo, stripped,
      actorName: actor ? actor.name : null, targetName: target ? target.name : null
    }]);
    ns.usedIds = (state.usedIds || []).concat([q.id]);
    ns.players = state.players.map(p => {
      if (actor && p.id === actor.id && stripped) {
        return Object.assign({}, p, { garments: Math.max(0, p.garments - 1) });
      }
      return p;
    });

    if (!skipped) {
      const weights = Object.assign({}, ns.categoryWeights);
      (q.tags || []).forEach(t => { weights[t] = (weights[t] || 0) + 1; });
      ns.categoryWeights = weights;
      ns.answeredSinceLastUp = (state.answeredSinceLastUp || 0) + 1;
      ns.lastLevels = (state.lastLevels || []).concat([q.level]).slice(-3);

      if (q.targets === "duo" && actor && target && q.level >= 4) {
        const k = pairKey(actor, target);
        if (k) {
          const aff = Object.assign({}, ns.affinityPairs || {});
          aff[k] = Math.max(0, (aff[k] || 0) + 1);
          ns.affinityPairs = aff;
        }
      }

      if (q.level >= 4) {
        ns.hotStreak = (state.hotStreak || 0) + 1;
        if (ns.hotStreak === 3 && ns.currentLevel < ns.maxSpice) {
          ns.currentLevel = Math.min(ns.maxSpice, ns.currentLevel + 1);
          ns.answeredSinceLastUp = 0;
        }
      } else {
        ns.hotStreak = 0;
      }

      if (ns.answeredSinceLastUp >= 4 && ns.currentLevel < ns.maxSpice) {
        ns.currentLevel += 1;
        ns.answeredSinceLastUp = 0;
      }

      ns.consecutiveSkipsTotal = 0;
      ns.castigoActive = false;
    } else {
      ns.consecutiveSkipsTotal = (state.consecutiveSkipsTotal || 0) + 1;
      ns.hotStreak = 0;
      if (ns.consecutiveSkipsTotal >= 3) {
        ns.castigoActive = true;
      }
    }

    ns.currentQ = null;
    ns.currentActor = null;
    ns.currentTarget = null;
    ns.lastParsedText = null;
    if (ns.mode === "verdad_reto") ns.vorChoice = null;
    return ns;
  }

  function generateGameCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }

  return {
    parseText, pairKey, pickRandomPlayer, selectActorTarget,
    filterCandidates, filterCastigos, pickNextQuestion, applyAnswer,
    generateGameCode, genderForms
  };
})();

if (typeof window !== "undefined") window.Engine = Engine;
