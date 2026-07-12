// data.js — Banco de preguntas/retos (versión condensada para modo online)
// Estructura: { id, mode, level, type, category, targets, text, tags, strip?, chain?, location? }

const QUESTION_BANK = [
  // ============== PAREJA ==============
  // L1
  { id: "par_ice_01", mode: "pareja", level: 1, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Qué canción les recuerda a los dos?", tags: ["nostalgia","coqueteo"] },
  { id: "par_ice_02", mode: "pareja", level: 1, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Cuál fue tu primer pensamiento cuando nos conocimos?", tags: ["nostalgia"] },
  { id: "par_ice_03", mode: "pareja", level: 1, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Qué pequeño gesto mío te hace sonreír siempre?", tags: ["coqueteo"] },
  // L2
  { id: "par_coq_01", mode: "pareja", level: 2, type: "pregunta", category: "coqueteo", targets: "duo",
    text: "{P1}, dile a {P2} qué fue lo primero que te gustó de {P2_art}.", tags: ["coqueteo","recuerdos"] },
  { id: "par_coq_02", mode: "pareja", level: 2, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1} y {P2}, mírense a los ojos durante 20 segundos sin hablar.", tags: ["coqueteo","fisico_ligero"] },
  { id: "par_coq_03", mode: "pareja", level: 2, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, dale un beso lento en la mejilla a {P2} manteniendo contacto visual.", tags: ["coqueteo","fisico_ligero"] },
  // L3
  { id: "par_jug_01", mode: "pareja", level: 3, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1} y {P2}, bailen agarrados de las manos 30 segundos.", tags: ["fisico_ligero","coqueteo"] },
  { id: "par_jug_02", mode: "pareja", level: 3, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, dale un masaje de 1 minuto en el cuello a {P2}.", tags: ["fisico_ligero"] },
  { id: "par_jug_03", mode: "pareja", level: 3, type: "pregunta", category: "coqueteo", targets: "self",
    text: "¿Cuál es tu sitio favorito de mi cuerpo para besar?", tags: ["coqueteo"] },
  // L4
  { id: "par_pro_01", mode: "pareja", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "duo",
    text: "{P1}, cuéntale a {P2} cuál es tu mayor miedo sobre ustedes dos.", tags: ["vulnerabilidad"] },
  { id: "par_pro_02", mode: "pareja", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "self",
    text: "¿En qué momento supiste que estabas enamorado/a de mí?", tags: ["vulnerabilidad","recuerdos"] },
  { id: "par_pro_03", mode: "pareja", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "duo",
    text: "{P1}, confiesa a {P2} qué deseo tuyo nunca te has atrevido a pedirle en la cama.", tags: ["vulnerabilidad","coqueteo"] },
  // L5
  { id: "par_atr_01", mode: "pareja", level: 5, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, besa el cuello de {P2} lentamente durante 30 segundos.", tags: ["fisico_ligero","coqueteo"] },
  { id: "par_atr_02", mode: "pareja", level: 5, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Quítate una prenda (no ropa interior) y désala a tu pareja.", tags: ["fisico_ligero","coqueteo"], strip: true },
  { id: "par_atr_03", mode: "pareja", level: 5, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, acaricia los muslos internos de {P2} durante 1 minuto sin subir más arriba.", tags: ["fisico_ligero","coqueteo"] },
  { id: "par_atr_04", mode: "pareja", level: 5, type: "pregunta", category: "coqueteo", targets: "self",
    text: "¿Qué posición siempre has querido probar conmigo y no me has pedido?", tags: ["coqueteo"] },
  // L6 Black Opal
  { id: "par_sup_01", mode: "pareja", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1}, realízale sexo oral a {P2} durante al menos 3 minutos, sin interrupciones.", tags: ["explicito"] },
  { id: "par_sup_02", mode: "pareja", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1} y {P2}, tengan una penetración lenta y silenciosa durante 5 minutos mirándose a los ojos.", tags: ["explicito"] },
  { id: "par_sup_03", mode: "pareja", level: 6, type: "pregunta", category: "explicito", targets: "duo",
    text: "{P1}, cuéntale a {P2} tu fantasía sexual más intensa con él/ella, con todo detalle.", tags: ["explicito","vulnerabilidad"] },
  { id: "par_sup_04", mode: "pareja", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1}, ata las manos de {P2} con una prenda y hazle lo que quieras durante 3 minutos.", tags: ["explicito","fisico_ligero"], chain: { type: "bound", target: "P2", duration: 2 } },

  // ============== AMIGOS ==============
  // L1
  { id: "ami_ice_01", mode: "amigos", level: 1, type: "pregunta", category: "humor", targets: "self",
    text: "Cuenta la mentira más ridícula que le dijiste a un profesor.", tags: ["humor"] },
  { id: "ami_ice_02", mode: "amigos", level: 1, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Cuál es la costumbre más rara que tienes cuando estás solo?", tags: ["curiosidad","humor"] },
  // L2
  { id: "ami_coq_01", mode: "amigos", level: 2, type: "reto", category: "humor", targets: "self",
    text: "Habla durante 1 minuto sin poder decir la letra 'a'.", tags: ["humor"] },
  { id: "ami_coq_02", mode: "amigos", level: 2, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Qué famoso te parece sobrevalorado?", tags: ["curiosidad"] },
  // L3
  { id: "ami_jug_01", mode: "amigos", level: 3, type: "reto", category: "humor", targets: "group",
    text: "{P1}, imita a alguien del grupo hasta que adivinen quién es.", tags: ["humor"] },
  { id: "ami_jug_02", mode: "amigos", level: 3, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Haz 10 lagartijas mientras cuentas un chiste.", tags: ["fisico_ligero","humor"] },
  // L4
  { id: "ami_pro_01", mode: "amigos", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "self",
    text: "¿Cuál es el secreto que nunca le has contado a nadie del grupo?", tags: ["vulnerabilidad"] },
  { id: "ami_pro_02", mode: "amigos", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "self",
    text: "¿Alguna vez te has imaginado desnudo/a a alguien de esta sala? ¿A quién?", tags: ["vulnerabilidad","coqueteo"] },
  // L5
  { id: "ami_atr_01", mode: "amigos", level: 5, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Quítate una prenda y déjala fuera hasta el final del juego.", tags: ["fisico_ligero"], strip: true },
  { id: "ami_atr_02", mode: "amigos", level: 5, type: "pregunta", category: "explicito", targets: "self",
    text: "Cuenta tu técnica de masturbación favorita con todo detalle.", tags: ["explicito"] },
  // L6
  { id: "ami_sup_01", mode: "amigos", level: 6, type: "pregunta", category: "explicito", targets: "self",
    text: "Cuenta en detalle tu experiencia sexual más incómoda o ridícula.", tags: ["explicito","humor"] },
  { id: "ami_sup_02", mode: "amigos", level: 6, type: "pregunta", category: "explicito", targets: "vote",
    text: "Señalen a quien del grupo tendrían un trío. Sin excusas.", tags: ["explicito","coqueteo"] },
  { id: "ami_sup_03", mode: "amigos", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1}, besa con lengua a {P2} durante 15 segundos. La sala elige a {P2}.", tags: ["explicito","fisico_ligero"] },

  // ============== FIESTA ==============
  // L1
  { id: "fie_ice_01", mode: "fiesta", level: 1, type: "pregunta", category: "humor", targets: "self",
    text: "¿Cuál es la canción que te hace bailar sin remedio?", tags: ["humor"] },
  { id: "fie_ice_02", mode: "fiesta", level: 1, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Bailas en la pista o te quedas en la barra?", tags: ["curiosidad"] },
  // L2
  { id: "fie_coq_01", mode: "fiesta", level: 2, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Haz 10 segundos de tu mejor baile robot.", tags: ["fisico_ligero","humor"] },
  { id: "fie_coq_02", mode: "fiesta", level: 2, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, baila con {P2} durante 1 minuto.", tags: ["fisico_ligero"] },
  // L3
  { id: "fie_jug_01", mode: "fiesta", level: 3, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Baila reaggaetón sin música durante 30 segundos.", tags: ["fisico_ligero","humor"] },
  { id: "fie_jug_02", mode: "fiesta", level: 3, type: "reto", category: "humor", targets: "self",
    text: "Cuenta un chiste verde. Si nadie se ríe, bebes.", tags: ["humor"] },
  // L4
  { id: "fie_pro_01", mode: "fiesta", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "vote",
    text: "Señalen a la persona de la sala con la que más tensión sexual sentirían.", tags: ["vulnerabilidad","coqueteo"] },
  { id: "fie_pro_02", mode: "fiesta", level: 4, type: "reto", category: "humor", targets: "group",
    text: "{P1}, imita cómo crees que gime cada persona del grupo en la cama.", tags: ["humor","coqueteo"] },
  // L5
  { id: "fie_atr_01", mode: "fiesta", level: 5, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, baila lap-dance durante 20 segundos a {P2}. El grupo elige a {P2}.", tags: ["fisico_ligero","coqueteo"] },
  { id: "fie_atr_02", mode: "fiesta", level: 5, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Quítate una prenda (no interior) y déjala fuera hasta el final.", tags: ["fisico_ligero"], strip: true },
  // L6
  { id: "fie_sup_01", mode: "fiesta", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1}, besa con lengua a {P2} durante 15 segundos. Si no, todos se quitan una prenda.", tags: ["explicito","fisico_ligero"] },
  { id: "fie_sup_02", mode: "fiesta", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1} y {P2}, jueguen a '7 minutos en el cielo'. Baño cerrado.", tags: ["explicito","fisico_ligero"] },
  { id: "fie_sup_03", mode: "fiesta", level: 6, type: "pregunta", category: "explicito", targets: "self",
    text: "Cuenta tu historia de sexo más salvaje en una fiesta. Sin filtros.", tags: ["explicito"] },

  // ============== VERDAD O RETO ==============
  // L1
  { id: "vor_ice_01", mode: "verdad_reto", level: 1, type: "pregunta", category: "curiosidad", targets: "self",
    text: "¿Cuál es tu comida culpable?", tags: ["curiosidad"] },
  { id: "vor_ice_02", mode: "verdad_reto", level: 1, type: "reto", category: "humor", targets: "self",
    text: "Saluda a todos en la sala con un acento distinto.", tags: ["humor"] },
  // L2
  { id: "vor_coq_01", mode: "verdad_reto", level: 2, type: "pregunta", category: "coqueteo", targets: "vote",
    text: "Señalen a quien de la sala creen que da mejor beso. Justifiquen.", tags: ["coqueteo"] },
  { id: "vor_coq_02", mode: "verdad_reto", level: 2, type: "reto", category: "humor", targets: "self",
    text: "Haz tu mejor pose de modelo durante 10 segundos.", tags: ["humor"] },
  // L3
  { id: "vor_jug_01", mode: "verdad_reto", level: 3, type: "reto", category: "fisico_ligero", targets: "self",
    text: "Baila twerk durante 15 segundos.", tags: ["fisico_ligero","humor"] },
  { id: "vor_jug_02", mode: "verdad_reto", level: 3, type: "reto", category: "humor", targets: "self",
    text: "Imita a un famoso hasta que el grupo adivine.", tags: ["humor"] },
  // L4
  { id: "vor_pro_01", mode: "verdad_reto", level: 4, type: "pregunta", category: "vulnerabilidad", targets: "self",
    text: "¿Cuál es la mentira más grande que has dicho a alguien aquí?", tags: ["vulnerabilidad"] },
  { id: "vor_pro_02", mode: "verdad_reto", level: 4, type: "reto", category: "vulnerabilidad", targets: "duo",
    text: "{P1}, mira a {P2} y dile algo que siempre quisiste decirle.", tags: ["vulnerabilidad"] },
  // L5
  { id: "vor_atr_01", mode: "verdad_reto", level: 5, type: "pregunta", category: "coqueteo", targets: "vote",
    text: "Señalen a quien del grupo se irían a la cama esta noche si no hubiera consecuencias.", tags: ["coqueteo"] },
  { id: "vor_atr_02", mode: "verdad_reto", level: 5, type: "reto", category: "fisico_ligero", targets: "duo",
    text: "{P1}, susurra al oído de {P2} algo que le harías en la cama.", tags: ["fisico_ligero","coqueteo"] },
  // L6
  { id: "vor_sup_01", mode: "verdad_reto", level: 6, type: "pregunta", category: "explicito", targets: "self",
    text: "Describe en detalle el mejor sexo que has tenido en tu vida.", tags: ["explicito"] },
  { id: "vor_sup_02", mode: "verdad_reto", level: 6, type: "reto", category: "explicito", targets: "duo",
    text: "{P1}, besa con lengua a {P2} durante 20 segundos. La sala elige a {P2}.", tags: ["explicito","fisico_ligero"] },
  { id: "vor_sup_03", mode: "verdad_reto", level: 6, type: "pregunta", category: "explicito", targets: "self",
    text: "¿Cuál es tu fetiche más oscuro que nunca has contado?", tags: ["explicito","vulnerabilidad"] },

  // ============== CASTIGOS ==============
  { id: "cast_01", mode: "_castigo", level: 3, type: "reto", category: "fisico_ligero", targets: "self",
    text: "CASTIGO: Haz 15 flexiones. Si no puedes, baila sensualmente 30 segundos.", tags: ["fisico_ligero","humor"] },
  { id: "cast_02", mode: "_castigo", level: 3, type: "reto", category: "humor", targets: "self",
    text: "CASTIGO: Canta una canción completa a voz en cuello.", tags: ["humor"] },
  { id: "cast_03", mode: "_castigo", level: 3, type: "reto", category: "fisico_ligero", targets: "self",
    text: "CASTIGO: Baila twerk durante 30 segundos frente al grupo.", tags: ["fisico_ligero","humor"] },
  { id: "cast_04", mode: "_castigo", level: 3, type: "pregunta", category: "vulnerabilidad", targets: "self",
    text: "CASTIGO: Cuenta tu secreto más embarazoso. Sin rodeos.", tags: ["vulnerabilidad"] },
  { id: "cast_05", mode: "_castigo", level: 3, type: "reto", category: "fisico_ligero", targets: "self",
    text: "CASTIGO: Quítate una prenda. Obligatorio.", tags: ["fisico_ligero"], strip: true }
];

const MODES = {
  pareja:       { name: "Pareja",         emoji: "💑", desc: "Intimidad y conexión romántica." },
  amigos:       { name: "Amigos",         emoji: "👥", desc: "Humor y anécdotas entre amistades." },
  fiesta:       { name: "Fiesta",         emoji: "🎉", desc: "Alta energía y dinámicas grupales." },
  verdad_reto:  { name: "Verdad o Reto",  emoji: "🎯", desc: "Eliges verdad o reto en cada turno." }
};

const LEVELS = {
  1: { name: "Rompehielo",   color: "lvl-1" },
  2: { name: "Coqueto",      color: "lvl-2" },
  3: { name: "Juguetón",     color: "lvl-3" },
  4: { name: "Profundo",     color: "lvl-4" },
  5: { name: "Atrevido",     color: "lvl-5" },
  6: { name: "Black Opal",   color: "lvl-6" }
};

const GENDER_FORMS = {
  m:    { art: "el",   pron: "lo",  pos: "su",  art_def: "él",     ref: "a él"   },
  f:    { art: "la",   pron: "la",  pos: "su",  art_def: "ella",   ref: "a ella" },
  otro: { art: "le",   pron: "le",  pos: "su",  art_def: "elle",   ref: "a elle" }
};

if (typeof window !== "undefined") {
  window.QUESTION_BANK = QUESTION_BANK;
  window.MODES = MODES;
  window.LEVELS = LEVELS;
  window.GENDER_FORMS = GENDER_FORMS;
}
