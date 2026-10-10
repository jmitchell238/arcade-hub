// Arcade Hub service worker — caches the launcher shell for instant/offline open.
// Bump with HUB_VERSION / GAME_VERSION in js/config.js (MAJOR.MINOR.PATCH).
const CACHE = 'arcade-hub-1.1.058';

const ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './terms.html',
  './css/legal.css',
  './css/style.css',
  './js/config.js',
  './js/catalog.js',
  './js/app.js',
  './games.json',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './apple-touch-icon.png',
  './art/bg.jpg',
  './art/covers/voidrush.jpg',
  './art/covers/crowd-clash.jpg',
  './art/covers/drop-and-fuse.jpg',
  './art/covers/neon-autofire.jpg',
  './art/covers/ironvale.jpg',
  './art/covers/bottle-sort.jpg',
  './art/covers/maze-adventure.jpg',
  './art/covers/animal-tap-zoo.jpg',
  './art/covers/bubble-pop-garden.jpg',
  './art/covers/color-match-pond.jpg',
  './art/covers/hide-seek-rooms.jpg',
  './art/covers/treasure-dig.jpg',
  './art/covers/shape-train.jpg',
  './art/covers/dress-up-dino.jpg',
  './art/covers/number-caterpillar.jpg',
  './art/covers/letter-picnic.jpg',
  './art/covers/cozy-racers.jpg',
  './art/covers/dress-up-mermaid.jpg',
  './art/covers/orb-merge-run.jpg',
  './art/covers/blockbound.jpg',
  './art/featured/blockbound-desktop.jpg',
  './art/featured/blockbound-mobile.jpg',
  './art/featured/voidrush-desktop.jpg',
  './art/featured/voidrush-mobile.jpg',
  './art/featured/orb-merge-run-desktop.jpg',
  './art/featured/orb-merge-run-mobile.jpg',
  './art/featured/crowd-clash-desktop.jpg',
  './art/featured/crowd-clash-mobile.jpg',
  './art/featured/drop-and-fuse-desktop.jpg',
  './art/featured/drop-and-fuse-mobile.jpg',
  './art/featured/neon-autofire-desktop.jpg',
  './art/featured/neon-autofire-mobile.jpg',
  './art/featured/ironvale-desktop.jpg',
  './art/featured/ironvale-mobile.jpg',
  './art/featured/bottle-sort-desktop.jpg',
  './art/featured/bottle-sort-mobile.jpg',
  './art/featured/maze-adventure-desktop.jpg',
  './art/featured/maze-adventure-mobile.jpg',
  './art/featured/animal-tap-zoo-desktop.jpg',
  './art/featured/animal-tap-zoo-mobile.jpg',
  './art/featured/bubble-pop-garden-desktop.jpg',
  './art/featured/bubble-pop-garden-mobile.jpg',
  './art/featured/color-match-pond-desktop.jpg',
  './art/featured/color-match-pond-mobile.jpg',
  './art/featured/hide-seek-rooms-desktop.jpg',
  './art/featured/hide-seek-rooms-mobile.jpg',
  './art/featured/treasure-dig-desktop.jpg',
  './art/featured/treasure-dig-mobile.jpg',
  './art/featured/shape-train-desktop.jpg',
  './art/featured/shape-train-mobile.jpg',
  './art/featured/dress-up-dino-desktop.jpg',
  './art/featured/dress-up-dino-mobile.jpg',
  './art/featured/number-caterpillar-desktop.jpg',
  './art/featured/number-caterpillar-mobile.jpg',
  './art/featured/letter-picnic-desktop.jpg',
  './art/featured/letter-picnic-mobile.jpg',
  './art/featured/cozy-racers-desktop.jpg',
  './art/featured/cozy-racers-mobile.jpg',
  './art/featured/dress-up-mermaid-desktop.jpg',
  './art/featured/dress-up-mermaid-mobile.jpg',
];

function precacheAll(cache) {
  return Promise.allSettled(
    ASSETS.map(url =>
      cache.add(url).catch(err => {
        console.warn('[sw] precache failed:', url, err);
      })));
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(precacheAll)
      .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (e.data && (e.data === 'SKIP_WAITING' || e.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

function sameOrigin(url) {
  try { return new URL(url).origin === self.location.origin; }
  catch (_) { return false; }
}

function networkFirst(request) {
  return fetch(request, { cache: 'no-store' }).then(res => {
    if (res.ok && sameOrigin(request.url)) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(request, copy));
    }
    return res;
  }).catch(() => caches.match(request).then(hit => hit || Response.error()));
}

function cacheFirst(request) {
  return caches.match(request).then(hit => hit ||
    fetch(request).then(res => {
      if (res.ok && sameOrigin(request.url)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
      }
      return res;
    }));
}

function isShellOrCode(url) {
  const path = new URL(url).pathname;
  if (path.endsWith('/sw.js')) return true;
  if (path.endsWith('.html') || path.endsWith('/')) return true;
  if (path.includes('/css/')) return true;
  if (path.includes('/js/')) return true;
  if (path.endsWith('games.json')) return true;
  if (path.endsWith('manifest.webmanifest')) return true;
  return false;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Only handle same-origin — games live on other github.io paths.
  if (!sameOrigin(e.request.url)) return;

  if (e.request.mode === 'navigate' || isShellOrCode(e.request.url)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(cacheFirst(e.request));
});
