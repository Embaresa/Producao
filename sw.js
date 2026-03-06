const CACHE_NAME = 'producao-embaresa-v2';
const ASSETS = [
  '/Producao/',
  '/Producao/index.html',
  '/Producao/manifest.json',
  '/Producao/icon-192.png',
  '/Producao/icon-512.png',
  '/Producao/apple-touch-icon.png'
];

// Instalar — fazer cache dos assets principais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Ativar — limpar caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache first para assets, network first para API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Chamadas ao Power Automate — sempre network, nunca cache
  if (url.hostname.includes('powerplatform') || url.hostname.includes('powerautomate')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Assets da app — cache first, fallback network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Guardar em cache se for um asset válido
        if (response.ok && e.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — devolver a página principal
        if (e.request.destination === 'document') {
          return caches.match('/Producao/index.html');
        }
      });
    })
  );
});

// Badge do ícone
self.addEventListener('message', e => {
  if (e.data?.type === 'SET_BADGE') {
    const n = e.data.count;
    if (self.navigator?.setAppBadge) {
      n > 0 ? self.navigator.setAppBadge(n) : self.navigator.clearAppBadge();
    }
  }
});
