'use strict';
// Copia locale del gioco, per aprirlo anche senza rete.
// La versione arriva dall'indirizzo (sw.js?v=...): ogni pubblicazione ha la
// sua cache e quelle vecchie si cancellano quando la nuova si attiva.
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'travel-maps-' + VERSION;
const v = (url) => VERSION === 'dev' ? url : `${url}?v=${VERSION}`;
const CORE = ['./', v('style.css'), v('game.js'), v('data/italia.json'), 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('travel-maps-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Prima la rete, poi la copia: la pagina e i file senza versione restano aggiornati.
async function networkFirst(req, key = req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    throw err;
  }
}

// I file con la versione non cambiano mai: basta la copia, se c'è.
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    // qualunque indirizzo del gioco (?mappa=…, ?da=…) usa la stessa pagina
    e.respondWith(networkFirst(req, new URL('./', self.registration.scope).href));
  } else if (url.searchParams.has('v')) {
    e.respondWith(cacheFirst(req));
  } else {
    e.respondWith(networkFirst(req));
  }
});
