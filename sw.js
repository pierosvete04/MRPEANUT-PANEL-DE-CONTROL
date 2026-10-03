// Service worker: guarda la app en la PC para que abra sin internet.
// Sube VERSION cada vez que cambies archivos del panel.
const VERSION = 'mrp-panel-v19';
const ARCHIVOS = [
  './', './index.html', './app.js', './styles.css', './manifest.webmanifest',
  './img/logo.png', './img/sello.png', './img/icono-192.png', './img/icono-512.png',
  './img/productos/mani.jpg', './img/productos/almendra.jpg', './img/productos/chocomani.jpg',
  './img/productos/crunchy.jpg', './img/productos/pack.jpg',
  './fonts/TitanOne-Regular.ttf', './fonts/Nunito.ttf', './fonts/GochiHand-Regular.ttf', './img/patron.png', './img/favicon-32.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Supabase y cualquier otro dominio: siempre a la red (la cola de sincronización maneja los fallos).
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Con internet: la versión más nueva (y se guarda copia). Sin internet: la copia guardada.
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp.ok) { const copia = resp.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
      return resp;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
