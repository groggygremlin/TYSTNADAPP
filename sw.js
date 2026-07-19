/* TYSTNAD Companion service worker.
   Cache-first: the app works in the basement, the cabin, the dead zone. */

const CACHE = "tystnad-v82";

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
  "./skull.webp",
  "./bg-pages.webp"
];

/* v80: cache each asset on its own instead of one atomic addAll.
   addAll rejects the whole install if a single URL fails, which silently freezes
   every installed phone on the previous version until a later good deploy. A missing
   asset degrades far better: the fetch handler falls through to the network for it,
   and the update still reaches the table. Failures are logged rather than swallowed. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(ASSETS.map((url) => cache.add(url))).then((results) => {
        const failed = results
          .map((r, i) => (r.status === "rejected" ? ASSETS[i] : null))
          .filter(Boolean);
        if (failed.length) {
          console.error("[sw] these assets failed to cache:", failed.join(", "));
        }
        return self.skipWaiting();
      })
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      // Deliberate: reloads every open window so a new version applies on one reopen.
      // Cost is that transient UI (an open overlay, a half-typed row) is lost when a
      // deploy lands mid-session. Character state is safe, since every change saves.
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Leave anything we do not serve to the browser: Table Link API calls, POSTs,
  // and any cross-origin request. Without this the handler would be the place a
  // future runtime cache accidentally starts storing backend responses.
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Navigations ignore the query string. caches.match is exact by default, so a link
  // carrying ?utm= or any other parameter would miss the cache and fail offline.
  if (req.mode === "navigate") {
    event.respondWith(
      caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || caches.match("./index.html"))
        .then((hit) => hit || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});
