/**
 * TourGuideAI Service Worker
 * Provides caching, offline support, and performance optimizations
 */

// Cache name and version
const CACHE_NAME = 'tourguide-cache-v1';

// Resources to cache
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/static/js/main.*.js',
  '/static/css/main.*.css',
  '/static/media/*',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  '/offline.html'
];

// API response cache
const API_CACHE_NAME = 'tourguide-api-cache-v1';
const API_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Install event: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        // Use cache.addAll for precaching
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Force activation
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName.startsWith('tourguide-') && 
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME
            )
            .map(cacheName => {
              console.log('Service Worker: Cleaning old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim()) // Take control immediately
  );
});

// Helper: Should we cache this request?
const shouldCacheRequest = (request) => {
  // Cache GET requests only
  if (request.method !== 'GET') return false;
  
  const url = new URL(request.url);
  
  // Don't cache API calls with authentication
  if (url.pathname.includes('/api/') && request.headers.has('Authorization')) {
    return false;
  }
  
  return true;
};

// Helper: Is this an API request?
const isApiRequest = (request) => {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
};

// Helper: Cache cleanup for API responses
const cleanupApiCache = async () => {
  const cache = await caches.open(API_CACHE_NAME);
  const requests = await cache.keys();
  const now = Date.now();
  
  const expiredRequests = requests.filter(request => {
    const url = new URL(request.url);
    const cachedTime = parseInt(url.searchParams.get('cachedTime') || '0', 10);
    return now - cachedTime > API_CACHE_DURATION;
  });
  
  await Promise.all(expiredRequests.map(request => cache.delete(request)));
};

// Fetch event: network first with cache fallback for API,
// cache first with network fallback for static assets
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;
  
  // Skip if not cacheable
  if (!shouldCacheRequest(event.request)) return;
  
  // Different strategies for API vs static content
  if (isApiRequest(event.request)) {
    // API requests: Network first, cache fallback, with TTL
    event.respondWith(
      fetch(event.request.clone())
        .then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          // Clone the response to store in cache
          const responseToCache = response.clone();
          const url = new URL(event.request.url);
          url.searchParams.set('cachedTime', Date.now().toString());
          
          // Create a new request with the updated URL for cache storage
          const requestToCache = new Request(url.toString(), {
            method: event.request.method,
            headers: event.request.headers,
            mode: event.request.mode,
            credentials: event.request.credentials,
            redirect: event.request.redirect
          });
          
          caches.open(API_CACHE_NAME)
            .then(cache => {
              cache.put(requestToCache, responseToCache);
              // Periodically clean up expired cache
              if (Math.random() < 0.1) { // 10% chance to run cleanup
                cleanupApiCache();
              }
            });
          
          return response;
        })
        .catch(() => {
          // Try to get from cache if network fails
          return caches.open(API_CACHE_NAME)
            .then(cache => cache.match(event.request))
            .then(cachedResponse => {
              if (cachedResponse) {
                const url = new URL(event.request.url);
                const cachedTime = parseInt(url.searchParams.get('cachedTime') || '0', 10);
                
                // Check if cache is still valid
                if (Date.now() - cachedTime < API_CACHE_DURATION) {
                  return cachedResponse;
                }
              }
              
              // If no valid cache, return offline response for API
              return new Response(
                JSON.stringify({ 
                  error: 'You are offline and cached data is not available',
                  offline: true
                }),
                { 
                  headers: { 'Content-Type': 'application/json' },
                  status: 503
                }
              );
            });
        })
    );
  } else {
    // Static content: Cache first, network fallback
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              if (!response || response.status !== 200) {
                return response;
              }
              
              // Clone the response
              const responseToCache = response.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
                
              return response;
            })
            .catch(() => {
              // If both cache and network fail, return offline page
              if (event.request.mode === 'navigate') {
                return caches.match('/offline.html');
              }
              
              return new Response('Offline content not available', { 
                status: 503,
                headers: { 'Content-Type': 'text/plain' }
              });
            });
        })
    );
  }
});

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  } else if (event.tag === 'sync-routes') {
    event.waitUntil(syncRoutes());
  }
});

// Helper functions for background sync
const syncFavorites = async () => {
  try {
    const db = await openIndexedDB();
    const pendingFavorites = await db.getAll('pendingFavorites');
    
    if (pendingFavorites.length === 0) return;
    
    // Process each pending favorite
    await Promise.all(pendingFavorites.map(async (item) => {
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          await db.delete('pendingFavorites', item.id);
        }
      } catch (error) {
        console.error('Error syncing favorite:', error);
      }
    }));
  } catch (error) {
    console.error('Error in syncFavorites:', error);
  }
};

const syncRoutes = async () => {
  try {
    const db = await openIndexedDB();
    const pendingRoutes = await db.getAll('pendingRoutes');
    
    if (pendingRoutes.length === 0) return;
    
    // Process each pending route
    await Promise.all(pendingRoutes.map(async (item) => {
      try {
        const response = await fetch('/api/routes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(item.data)
        });
        
        if (response.ok) {
          await db.delete('pendingRoutes', item.id);
        }
      } catch (error) {
        console.error('Error syncing route:', error);
      }
    }));
  } catch (error) {
    console.error('Error in syncRoutes:', error);
  }
};

// Helper for IndexedDB operations
const openIndexedDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('tourguideDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      resolve({
        getAll: (storeName) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
          });
        },
        delete: (storeName, id) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
          });
        }
      });
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('pendingFavorites')) {
        db.createObjectStore('pendingFavorites', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('pendingRoutes')) {
        db.createObjectStore('pendingRoutes', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}; 