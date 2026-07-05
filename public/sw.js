const CACHE_NAME = 'nk-v3';

// App-Shell-Seiten die immer verfügbar sein sollen
const PRECACHE_URLS = [
  '/',
  '/training',
  '/twin',
  '/network',
  '/compare',
  '/politicians',
  '/history',
  '/identity',
  '/about',
  '/trust',
  '/manifest.json',
  '/offline.html',
  '/icon.svg',
];

// ── Install: precache app shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch((err) => {
        // partial failure is ok — just warn
        console.warn('[sw] precache partial failure', err);
      })
    )
  );
});

// ── Activate: delete old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => clients.claim())
  );
});

// ── Fetch: tiered strategy ────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API + external calls → Network only (no cache, fail gracefully)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('nostr') ||
    url.hostname.includes('damus') ||
    url.hostname.includes('snort') ||
    url.hostname.includes('wellorder') ||
    url.protocol === 'wss:'
  ) {
    event.respondWith(
      fetch(request).catch(() => new Response(null, { status: 503 }))
    );
    return;
  }

  // 2. _next/static (chunks, CSS, fonts) → Cache First, very long TTL
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // 3a. Navigations → Network First: users get the freshest app right after
  // a deploy; the cache only serves when actually offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;
          const offline = await cache.match('/offline.html');
          return offline ?? new Response(null, { status: 503 });
        })
    );
    return;
  }

  // 3b. Other assets → Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(async () => {
        // offline fallback for navigation requests
        if (request.mode === 'navigate') {
          const offline = await cache.match('/offline.html');
          if (offline) return offline;
        }
        return new Response(null, { status: 503 });
      });

      // Return cached immediately if available, still refresh in background
      return cached ?? networkFetch;
    })
  );
});

// ── Push notifications (Phase 2) ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'no kings', body: event.data.text() }; }
  const { title = 'no kings', body = '' } = data;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'no-kings',
      data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      const focused = cs.find((c) => c.focused || c.url.includes('no-kings'));
      if (focused) return focused.focus();
      return clients.openWindow('/');
    })
  );
});
