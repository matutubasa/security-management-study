/**
 * Service Worker for Information Security Management Study Site
 * Provides offline functionality and caching for PWA features
 */

const CACHE_NAME = 'sg-study-site-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Resources to cache for offline functionality
const CORE_RESOURCES = [
  '/',
  '/index.html',
  '/exam-info/',
  '/exam-info/index.html',
  '/assets/css/style.css',
  '/assets/css/responsive.css',
  '/assets/css/themes.css',
  '/assets/js/main.js',
  '/assets/js/storage.js',
  '/assets/js/progress.js',
  '/assets/js/quiz.js',
  '/manifest.json'
];

// Additional resources to cache opportunistically
const OPTIONAL_RESOURCES = [
  '/study/',
  '/practice/',
  '/glossary/',
  '/progress/',
  '/tips/'
];

// Resources that should always be fetched from network
const NETWORK_FIRST = [
  '/api/',
  '/auth/',
  '/sync/'
];

/**
 * Install event - cache core resources
 */
self.addEventListener('install', event => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core resources');
        return cache.addAll(CORE_RESOURCES);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Failed to cache core resources:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Claim all clients immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - handle network requests with caching strategy
 */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and cross-origin requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }
  
  // Handle different types of requests with appropriate strategies
  if (isNetworkFirst(request.url)) {
    event.respondWith(networkFirst(request));
  } else if (isStaticResource(request.url)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

/**
 * Network first strategy - for dynamic content
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

/**
 * Cache first strategy - for static resources
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for future use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch resource:', request.url, error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match(OFFLINE_URL);
    }
    
    throw error;
  }
}

/**
 * Stale while revalidate strategy - for frequently updated content
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const fetchPromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(error => {
      console.log('[SW] Network request failed:', request.url, error);
      return null;
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache available
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_URL);
  }
  
  throw new Error('No cached response available and network request failed');
}

/**
 * Check if request should use network first strategy
 */
function isNetworkFirst(url) {
  return NETWORK_FIRST.some(pattern => url.includes(pattern));
}

/**
 * Check if request is for a static resource
 */
function isStaticResource(url) {
  return /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico)$/i.test(url);
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'study-data-sync') {
    event.waitUntil(syncStudyData());
  } else if (event.tag === 'quiz-results-sync') {
    event.waitUntil(syncQuizResults());
  }
});

/**
 * Sync study data when back online
 */
async function syncStudyData() {
  try {
    // Get pending sync data from IndexedDB or localStorage
    const pendingData = await getPendingSyncData();
    
    if (pendingData && pendingData.length > 0) {
      console.log('[SW] Syncing study data:', pendingData.length, 'items');
      
      // Send data to server
      const response = await fetch('/api/sync/study-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingData)
      });
      
      if (response.ok) {
        // Clear synced data
        await clearSyncData();
        console.log('[SW] Study data synced successfully');
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync study data:', error);
  }
}

/**
 * Sync quiz results when back online
 */
async function syncQuizResults() {
  try {
    const pendingResults = await getPendingQuizResults();
    
    if (pendingResults && pendingResults.length > 0) {
      console.log('[SW] Syncing quiz results:', pendingResults.length, 'items');
      
      const response = await fetch('/api/sync/quiz-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingResults)
      });
      
      if (response.ok) {
        await clearPendingQuizResults();
        console.log('[SW] Quiz results synced successfully');
      }
    }
  } catch (error) {
    console.error('[SW] Failed to sync quiz results:', error);
  }
}

/**
 * Handle push notifications
 */
self.addEventListener('push', event => {
  console.log('[SW] Push received');
  
  if (!event.data) {
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body || '新しい通知があります',
    icon: '/assets/images/icon-192x192.png',
    badge: '/assets/images/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'open',
        title: '開く',
        icon: '/assets/images/action-open.png'
      },
      {
        action: 'close',
        title: '閉じる',
        icon: '/assets/images/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'SG試験学習サイト', options)
  );
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    // Open the app
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

/**
 * Handle app updates
 */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Utility functions for data management
 */

async function getPendingSyncData() {
  // In a real implementation, this would read from IndexedDB
  return [];
}

async function clearSyncData() {
  // Clear synced data from local storage
  console.log('[SW] Clearing sync data');
}

async function getPendingQuizResults() {
  // Get pending quiz results from storage
  return [];
}

async function clearPendingQuizResults() {
  // Clear pending quiz results
  console.log('[SW] Clearing pending quiz results');
}

/**
 * Cache management utilities
 */
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => name !== CACHE_NAME);
  
  return Promise.all(
    oldCaches.map(name => caches.delete(name))
  );
}

async function precacheOptionalResources() {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(OPTIONAL_RESOURCES);
    console.log('[SW] Optional resources precached');
  } catch (error) {
    console.log('[SW] Failed to precache optional resources:', error);
  }
}

// Precache optional resources in the background
if ('requestIdleCallback' in self) {
  self.requestIdleCallback(() => {
    precacheOptionalResources();
  });
} else {
  setTimeout(precacheOptionalResources, 1000);
}