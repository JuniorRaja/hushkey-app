// HushKey Service Worker for PWA functionality
const CACHE_NAME = 'hushkey-v1.0.0';
const STATIC_CACHE = 'hushkey-static-v1.0.0';
const DATA_CACHE = 'hushkey-data-v1.0.0';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/App.css'
];

// Cache strategies
const CACHE_STRATEGIES = {
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first',
  CACHE_ONLY: 'cache-only',
  NETWORK_ONLY: 'network-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  self.skipWaiting();

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch((error) => {
      console.error('[SW] Cache installation failed:', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement different caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - bypass service worker for mutations, use network-first for GET
  if (url.pathname.startsWith('/api/') || url.host.includes('supabase')) {
    if (request.method !== 'GET') {
      // Don't cache mutations
      return;
    }
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - use cache-first strategy
  if (request.destination === 'script' ||
      request.destination === 'style' ||
      request.destination === 'image' ||
      request.destination === 'font') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - use network-first to get fresh content
  if (request.destination === 'document') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default - use cache-first for other assets
  event.respondWith(cacheFirstStrategy(request));
});

// Background sync for vault data
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync', event.tag);

  if (event.tag === 'vault-sync') {
    event.waitUntil(syncVaultData());
  }
});

// Push notifications (for future features)
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');

  if (event.data) {
    const data = event.data.json();
    showNotification(data);
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'SYNC_DATA':
      syncVaultData();
      break;
    case 'CLEAR_CACHE':
      clearAllCaches();
      break;
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Cache strategies implementation

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    // Return offline fallback if available
    return caches.match('/offline.html');
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request.clone());
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache');
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cachedResponse || fetchPromise;
}

// Background sync implementation
async function syncVaultData() {
  console.log('[SW] Syncing vault data in background');

  try {
    // Notify clients about sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: true
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);

    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        success: false,
        error: error.message
      });
    });
  }
}

// Show notification (placeholder for future features)
async function showNotification(data) {
  const options = {
    body: data.body || 'HushKey notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'hushkey-notification',
    requireInteraction: false,
    silent: false
  };

  self.registration.showNotification(data.title || 'HushKey', options);
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

// Offline detection
self.addEventListener('online', () => {
  console.log('[SW] Back online, triggering sync');
  syncVaultData();
});

self.addEventListener('offline', () => {
  console.log('[SW] Gone offline');
});
