// Incrementa esta versão sempre que fizeres upload de ficheiros novos
const CACHE_VERSION = 'producao-embaresa-v4';
const CACHE_NAME = CACHE_VERSION;

// Instalar — limpar caches antigos e activar imediatamente
self.addEventListener('install', e => {
    console.log('[SW] Instalando versão:', CACHE_VERSION);
    // Forçar activação imediata sem esperar por tabs antigas
    self.skipWaiting();
});

// Activar — limpar TODOS os caches antigos
self.addEventListener('activate', e => {
    console.log('[SW] Activando versão:', CACHE_VERSION);
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => {
                    console.log('[SW] A apagar cache antigo:', k);
                    return caches.delete(k);
                })
            );
        }).then(() => {
            // Tomar controlo de todas as tabs imediatamente
            return self.clients.claim();
        })
    );
});

// Fetch — network first, cache como fallback
self.addEventListener('fetch', e => {
    // Não interceptar chamadas ao Power Automate
    if (e.request.url.includes('powerplatform') || 
        e.request.url.includes('powerautomate') ||
        e.request.url.includes('azure')) {
        return;
    }
    
    // Só interceptar GET
    if (e.request.method !== 'GET') return;

    e.respondWith(
        fetch(e.request)
            .then(response => {
                // Guardar em cache se resposta OK
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback para cache se offline
                return caches.match(e.request);
            })
    );
});
