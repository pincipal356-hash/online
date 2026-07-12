# After Dark · Online

Aplicación web multijugador para el juego de retos y conexión. Funciona en tiempo real mediante códigos de partida.

## Estructura de archivos

```
online/
├── index.html              # Punto de entrada HTML
├── css/styles.css          # Todos los estilos
├── js/
│   ├── data.js             # Banco de preguntas/retos
│   ├── engine.js           # Motor adaptativo (funciones puras)
│   ├── transport.js        # Capa de red: BroadcastChannel + WebSocket
│   ├── transport_mqtt.js   # Capa de red: MQTT broker público (cross-network)
│   ├── state.js            # Estado del juego y sync
│   ├── ui.js               # Renderizado de pantallas
│   └── app.js              # Orquestador principal
├── server/
    └── relay.js            # Servidor WebSocket opcional (Node.js)
└── render.yaml             # Deploy gratuito opcional en Render.com
```

## Tres modos de conexión

### 🌐 Modo Internet (recomendado para otra red)

Funciona entre dispositivos en redes distintas (WiFi, 4G, etc.) **sin desplegar nada**. Usa el broker MQTT público de EMQX.

1. Abre `index.html?online=1` (o selecciona "Internet (público)" en la pantalla de inicio).
2. Crea una sala y comparte el código de 5 caracteres.
3. La otra persona, desde cualquier dispositivo y red, abre `index.html?online=1`, pulsa "Unirse" e introduce el código.

No requiere registro, ni servidor, ni misma red. Solo internet. El broker público (`wss://broker.emqx.io:8084/mqtt`) enruta los mensajes por el topic `afterdark/<CÓDIGO>`.

> Nota: el broker público es compartido. Usa códigos de sala únicos (la app los genera aleatorios de 5 caracteres) para no colisionar con otros usuarios.

### 📡 Modo mismo navegador (zero-config)

Varias pestañas en el mismo navegador. Sin internet. Usa `BroadcastChannel` nativo.

1. Abre `index.html` (sin parámetros) en una pestaña.
2. Crea sala, copia el código.
3. Abre `index.html` en otra pestaña, únete con el código.

### 🔌 Modo relay propio (avanzado)

Para máximo control o privacidad, despliega tu propio servidor WebSocket.

**Local (misma WiFi):**

```bash
cd online/server
npm install ws
node relay.js                 # puerto 8080 por defecto
```

Conecta con `index.html?server=ws://IP_DE_TU_PC:8080`

**Cross-network (deploy gratuito en Render):**

1. Crea cuenta gratis en https://render.com
2. Sube esta carpeta a un repo de GitHub
3. New → Web Service → conecta el repo (detecta `render.yaml` automáticamente)
4. Render te da una URL tipo `wss://after-dark-relay.onrender.com`
5. Conecta con `index.html?server=wss://after-dark-relay.onrender.com`

Plan gratuito: 750h/mes, suficiente para uso ocasional.

## Cómo funciona

- **Host-authoritative:** el primer jugador que crea la sala es el host. Ejecuta el motor del juego (selección de preguntas, afinidad, prendas, hot streaks). Los clientes envían acciones al host, que aplica la lógica y retransmite el estado completo a todos.
- **Código de partida:** 5 caracteres alfanuméricos (sin caracteres ambiguos como 0/O, 1/I).
- **Reconexión automática:** si un cliente pierde la conexión, intenta reconectar cada 2 segundos (relay propio) o según la política del broker (MQTT).
- **Persistencia local:** tu nombre y género se guardan en `localStorage`. El estado del juego no se persiste: si el host cierra, la partida se pierde.

## Pantallas

1. **Home:** perfil (nombre, género) + crear sala o unirse + selector de modo de conexión.
2. **Lobby:** código de partida compartible, lista de jugadores conectados, chat, configuración (host), selección de modo.
3. **Juego:** reto actual con actor/objetivo, heat-bar, prendas, botones Cumplir/Quitar/Saltar (host), botón de pánico.
4. **Jugadores:** lista de participantes con estado online.
5. **Historial:** entradas de la sesión actual.

## Features

- 4 modos de juego: Pareja, Amigos, Fiesta, Verdad o Reto
- 6 niveles de intensidad (nivel 6 Black Opal con código secreto `072125`)
- Banco de 64+ preguntas/retos con placeholders `{P1}`, `{P2}`, `{P1_art}`, `{P2_art}` etc. para gramática dinámica por género
- Motor adaptativo: afinidad entre jugadores, hot streaks, castigos por saltos, exhibicionismo
- Sistema de prendas (3-8 por jugador)
- Multijugador en tiempo real con host-authoritative
- 3 modos de transporte: BroadcastChannel, MQTT público, WebSocket relay propio
- Chat en el lobby
- Código de partida compartible (texto o enlace)

## Notas

- El contenido es para adultos. Marca el checkbox de consentimiento en el lobby antes de jugar.
- El modo MQTT usa un broker público compartido. Aunque los mensajes se enrután por el código de sala, no es 100% privado: cualquiera que adivine tu código podría unirse. Usa códigos aleatorios (la app los genera así).
- Si no tienes Node.js y quieres máximo control, despliega en Render (gratis) o usa el modo MQTT público.
- La librería `mqtt.js` (~150KB) se carga dinámicamente desde CDN solo cuando se selecciona el modo Internet.
