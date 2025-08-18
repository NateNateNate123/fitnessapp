const CACHE = 'pb-coach-v1';
const ASSETS = [
  './', './index.html', './styles.css', './app.js',
  './manifest.json', './service-worker-ready.js',
  './exercise_library.json', './programs.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  } else {
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  }
});

self.addEventListener('message', async e => {
  if (e.data && e.data.type === 'WARM_CACHE') {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    e.ports[0].postMessage('Cached for offline ✅');
  }
});
