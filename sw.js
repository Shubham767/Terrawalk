const CACHE = 'terrawalk-v2';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/app.js', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  let data = { title: 'TerraWalk', body: 'Time to walk and claim territory! 🗺️', tag: 'tw-reminder' };
  try { data = { ...data, ...e.data.json() }; } catch(_) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' }
    })
  );
});

// Tap notification → open/focus the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// ===== BACKGROUND SYNC: smart daily reminder =====
// Fired by app when it registers a periodic sync
self.addEventListener('periodicsync', e => {
  if (e.tag === 'tw-daily-reminder') {
    e.waitUntil(maybeRemind());
  }
});

async function maybeRemind() {
  // Check if already walked today via IndexedDB (set by app on walk)
  // If no data found, assume they haven't walked → send reminder
  try {
    const db = await openTWDB();
    const walkedToday = await dbGet(db, 'walkedToday');
    const today = new Date().toDateString();
    if (walkedToday === today) return; // already walked, no notification
  } catch(_) {}

  const hour = new Date().getHours();
  // Only send between 7am–9am or 5pm–8pm
  if (!((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20))) return;

  await self.registration.showNotification('TerraWalk 🗺️', {
    body: "You haven't walked today — your territory is waiting! 🚶",
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'tw-daily',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  });
}

// Minimal IndexedDB helpers for SW context
function openTWDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('terrawalk-sw', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
function dbGet(db, key) {
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = e => res(e.target.result);
    req.onerror = rej;
  });
}
