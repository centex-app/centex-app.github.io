/* Service worker de Centex: guarda los archivos de la app para que abra rápido y también sin internet.
   Si cambias algo de la app, sube el número de VERSION para que los móviles se actualicen. */
const VERSION = 'centex-v1.25.1';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
  './icons/cat/comida.png', './icons/cat/ocio.png', './icons/cat/transporte.png', './icons/cat/compras.png', './icons/cat/otros.png'
];

// La versión nueva se descarga siempre de GitHub, no de la caché del navegador (que guarda los archivos hasta 10 minutos).
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Responde con lo guardado y, a la vez, intenta traer la versión nueva para la próxima vez.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!mine && !fonts) return;
  // Los precios diarios cambian: primero la red, y solo si no hay internet lo guardado.
  if (mine && /\/data\/(precios|acciones)\.json$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(res => { if (res && res.ok) { const c = res.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); } return res; }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    )
  );
});
