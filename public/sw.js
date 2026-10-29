const VERSION = 'lutongpinoy-v1';
const CACHE = `${VERSION}-assets`;
const SHELL = `${VERSION}-shell`;
const HOME = new URL('./', self.registration.scope).href;
const PHOTOS = Array.from({ length:12 },(_,i)=>new URL(`photos/dish-${i}.webp`, HOME).href);
const ICONS = ['icons/icon-192.png','icons/icon-512.png','manifest.webmanifest'].map(path => new URL(path, HOME).href);
self.addEventListener('install', event => {
  event.waitUntil(Promise.all([caches.open(SHELL).then(cache => cache.add(HOME)), caches.open(CACHE).then(cache => cache.addAll([...PHOTOS,...ICONS]))]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(names => Promise.all(names.filter(name => !name.startsWith(VERSION)).map(name => caches.delete(name)))),self.clients.claim()]));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'WARM_CACHE' || !Array.isArray(event.data.urls)) return;
  const urls = event.data.urls.filter(value => { try { const u = new URL(value, HOME); return u.origin === self.location.origin && u.href.startsWith(HOME); } catch { return false; } });
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(urls.map(url => cache.add(url)))));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(SHELL).then(cache => cache.put(HOME, copy)); }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match(HOME)) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  })));
});
