// transport_mqtt.js — Transporte vía broker MQTT público (cross-network)
//
// Usa EMQX public broker sobre WebSocket: wss://broker.emqx.io:8084/mqtt
// - Sin registro, sin auth, funciona desde cualquier red.
// - Topic por sala: afterdark/<ROOMCODE>
// - Librería mqtt.js cargada dinámicamente desde CDN.

const TransportMQTT = (function() {

  const DEFAULT_BROKER_URL = "wss://broker.emqx.io:8084/mqtt";
  const TOPIC_PREFIX = "afterdark/";

  function loadMqttLibrary() {
    return new Promise((resolve, reject) => {
      if (window.mqtt) { resolve(window.mqtt); return; }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js";
      script.async = true;
      script.onload = () => {
        if (window.mqtt) resolve(window.mqtt);
        else reject(new Error("mqtt.js loaded but window.mqtt not defined"));
      };
      script.onerror = () => reject(new Error("No se pudo cargar mqtt.js desde CDN"));
      document.head.appendChild(script);
      // Timeout
      setTimeout(() => {
        if (!window.mqtt) reject(new Error("Timeout cargando mqtt.js"));
      }, 8000);
    });
  }

  function create(config) {
    // config: { roomCode, role, playerId, playerName, brokerUrl? }
    const brokerUrl = config.brokerUrl || DEFAULT_BROKER_URL;
    const topic = TOPIC_PREFIX + config.roomCode;
    let client = null;
    let listeners = [];
    let connected = false;
    let connectPromise = null;
    let reconnectTimer = null;

    function onMessage(handler) { listeners.push(handler); }

    function send(msg) {
      if (!client || !connected) return;
      try {
        client.publish(topic, JSON.stringify(msg), { qos: 0 });
      } catch(e) { console.error("MQTT publish error", e); }
    }

    function connect() {
      if (connectPromise) return connectPromise;
      connectPromise = new Promise((resolve, reject) => {
        loadMqttLibrary().then((mqttLib) => {
          const mqtt = mqttLib.mqtt || mqttLib;
          try {
            // Client ID único para evitar colisiones
            const clientId = "ad_" + config.playerId + "_" + Date.now();
            client = mqtt.connect(brokerUrl, {
              clientId: clientId,
              clean: true,
              reconnectPeriod: 2000,
              connectTimeout: 5000,
              keepalive: 30
            });

            client.on("connect", () => {
              connected = true;
              // Suscribirse al topic de la sala
              client.subscribe(topic, { qos: 0 }, (err) => {
                if (err) {
                  console.error("MQTT subscribe error", err);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });

            client.on("message", (recvTopic, payload) => {
              if (recvTopic !== topic) return;
              try {
                const data = JSON.parse(payload.toString());
                listeners.forEach(l => { try { l(data); } catch(err) { console.error(err); } });
              } catch(err) {
                console.error("MQTT parse error", err);
              }
            });

            client.on("error", (err) => {
              console.error("MQTT error", err);
              if (!connected) reject(err);
            });

            client.on("close", () => {
              connected = false;
            });

            client.on("reconnect", () => {
              console.log("MQTT reconnecting...");
            });
          } catch(err) {
            reject(err);
          }
        }).catch(reject);
      });
      return connectPromise;
    }

    function close() {
      listeners = [];
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (client) {
        try {
          client.unsubscribe(topic);
          client.end(true);
        } catch(e) {}
        client = null;
      }
      connected = false;
      connectPromise = null;
    }

    return {
      onMessage, send, close, connect,
      isConnected: () => connected,
      type: "mqtt",
      brokerUrl: brokerUrl,
      topic: topic
    };
  }

  return { create, loadMqttLibrary, DEFAULT_BROKER_URL };
})();

if (typeof window !== "undefined") window.TransportMQTT = TransportMQTT;
