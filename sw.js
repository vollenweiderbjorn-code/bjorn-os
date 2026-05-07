const CACHE = 'bjornos-v3';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always network-first for Finnhub API
  if (url.hostname === 'finnhub.io') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});

// ── Local notifications triggered from the page ────────────────
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SHOW_NOTIFICATION') return;
  self.registration.showNotification(e.data.title, {
    body: e.data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: e.data.tag || 'bjornos',
    renotify: true,
    data: { url: self.location.origin },
  });
});

// ── Open app when notification is tapped ──────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});

// ── Periodic background sync (best-effort, installed PWA only) ─
self.addEventListener('periodicsync', e => {
  if (e.tag === 'daily-gym') {
    e.waitUntil(
      self.registration.showNotification('Bonjour Bjorn 💪', {
        body: "Ta session du jour t'attend !",
        icon: '/icon.svg',
        tag: 'gym-daily',
      })
    );
  }
  if (e.tag === 'daily-habits') {
    e.waitUntil(
      self.registration.showNotification('Habits check 📋', {
        body: "Tu en es où aujourd'hui ?",
        icon: '/icon.svg',
        tag: 'habits-daily',
      })
    );
  }
});
