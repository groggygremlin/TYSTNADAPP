/* TYSTNAD Companion service worker.
   Cache-first: the app works in the basement, the cabin, the dead zone. */

const CACHE = "tystnad-v31";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./logo.png",
  "./intro-bg.webp",
  "./app-bg.webp",
  "./CormorantGaramond-Medium.woff2",
  "./CormorantGaramond-SemiBold.woff2",
  "./CormorantGaramond-Bold.woff2",
  "./skull.webp"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request))
  );
});
