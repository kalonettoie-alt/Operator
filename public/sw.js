// Service Worker minimal — requis pour l'installation PWA sur Android
// Ce SW ne fait pas de cache offline ; il se contente de passer les requêtes au réseau.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
