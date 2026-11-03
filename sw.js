// SERVICE WORKER: un pequeño programa que el navegador ejecuta aparte de la página.
// Guarda una copia de los archivos de la app para poder abrirla sin conexión.
//
// Estrategia "primero la red": si hay internet se descarga la versión más reciente (y se guarda
// una copia); si no hay, se usa la última copia guardada. Así los cambios se ven en cuanto se
// suben, sin quedarse con versiones viejas. Las llamadas a Firebase (datos y acceso) no pasan
// por aquí: van directas a internet.
const CACHE = "japones-v2";
const ARCHIVOS = ["./", "index.html", "style.css", "app.js", "ejemplos.js", "canciones.js", "generador.js", "dibujos.js", "firebase-config.js"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  // Borra copias de versiones anteriores del caché
  evento.waitUntil(
    caches.keys().then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  const url = new URL(evento.request.url);
  // Solo los archivos de la app y los scripts de Firebase (gstatic.com)
  if (url.origin !== self.location.origin && url.hostname !== "www.gstatic.com") return;
  evento.respondWith(
    fetch(evento.request)
      .then((respuesta) => {
        if (respuesta.ok || respuesta.type === "opaque") {
          const copia = respuesta.clone();
          caches.open(CACHE).then((c) => c.put(evento.request, copia)).catch(() => {});
        }
        return respuesta;
      })
      .catch(() => caches.match(evento.request)) // sin internet: la copia guardada
  );
});
