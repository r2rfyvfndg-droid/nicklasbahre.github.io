/* Nicklas News — progressive web app, v1. News pages are always fetched fresh. */
const VERSION = 'nicklas-news-v1';
const SHELL = ['/', '/assets/fonts/fonts.css', '/assets/site.css', '/menu.css', '/favicon-192x192.png', '/favicon-512x512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => Promise.allSettled(SHELL.map(path => cache.add(path)))));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nicklas-news-') && key !== VERSION).map(key => caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/comments/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/')) || Response.error()));
    return;
  }
  if (/\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) { const copy=response.clone(); caches.open(VERSION).then(cache=>cache.put(request,copy)); }
      return response;
    })));
  }
});
