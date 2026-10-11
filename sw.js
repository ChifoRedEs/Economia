/* Service worker de Agenda de Finanzas.
   Estrategia: la app completa se guarda en caché al instalar y se sirve desde ahí (arranque instantáneo
   y sin conexión). Cada vez que publiques cambios, sube VERSION: el navegador descargará la versión
   nueva en segundo plano y la usará la próxima vez que abras la app. */
const VERSION = 'finanzas-v3';
const APP = [
  './', './index.html', './manifest.json',
  './css/base.css', './css/layout.css', './css/components.css',
  './js/main.js', './js/actions.js',
  './js/core/utils.js', './js/core/format.js', './js/core/constants.js', './js/core/store.js', './js/core/calc.js',
  './js/ui/state.js', './js/ui/dom.js', './js/ui/components.js', './js/ui/render.js',
  './js/views/home.js', './js/views/movements.js', './js/views/book.js', './js/views/stats.js', './js/views/settings.js',
  './js/sheets/movement.js', './js/sheets/account.js', './js/sheets/category.js', './js/sheets/recurring.js',
  './js/features/io.js', './js/features/pwa.js', './js/lib/chart-loader.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png',
  './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-32.png'
];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'];
const EXTERNAL = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // cache: 'reload' evita copiar archivos antiguos de la caché HTTP del navegador.
    await cache.addAll(APP.map(u => new Request(u, { cache: 'reload' })));
    await Promise.allSettled(CDN.map(u => fetch(u, { mode: 'cors' }).then(r => r.ok && cache.put(u, r))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navegación: la página guardada de esta versión (coherente con sus módulos).
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      return (await cache.match('./index.html')) || fetch(req).catch(() =>
        new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    })());
    return;
  }

  // Archivos de la app: primero la caché; si falta, red y se guarda.
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // Chart.js y tipografías: copia guardada al instante y actualización en segundo plano.
  if (EXTERNAL.includes(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req);
      const network = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })());
  }
});
