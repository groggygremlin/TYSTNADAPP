/* TYSTNAD Companion service worker.
   Cache-first: the app works in the basement, the cabin, the dead zone. */

const CACHE = "tystnad-v86";

/* v85: assets are split by how badly their absence hurts.

   CORE is the executable shell. It is cached ATOMICALLY with addAll, so a single failed
   download rejects the install, this worker never activates, and the previous cache is
   left untouched. The player keeps a WORKING offline app on the old version instead of a
   broken one on the new.

   This corrects v80, which cached everything with allSettled and activated regardless.
   That reasoning ("an update that arrives beats a complete cache") missed that activate
   deletes the previous cache in the same breath, and that the fallback it relied on was a
   network fetch, which is exactly what is missing offline. */
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json"
];

/* OPTIONAL is artwork, icons and fonts. Missing ones degrade honestly: the app still runs
   and still works offline, it just looks poorer until the next successful install. */
const OPTIONAL_ASSETS = [
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

/* Set true only for an update that must reach every open window at once, accepting that
   it discards whatever the player was in the middle of. Normal updates use the banner. */
const FORCE_RELOAD = false;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Core first, and let a rejection propagate: a failed install is the safe outcome.
      cache.addAll(CORE_ASSETS)
        .then(() => Promise.allSettled(OPTIONAL_ASSETS.map((url) => cache.add(url))))
        .then((results) => {
          const failed = results
            .map((r, i) => (r.status === "rejected" ? OPTIONAL_ASSETS[i] : null))
            .filter(Boolean);
          if (failed.length) {
            console.error("[sw] optional assets failed to cache:", failed.join(", "));
          }
          // Only after the shell is complete.
          return self.skipWaiting();
        })
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const stale = keys.filter((k) => k !== CACHE);
        // A first-ever install has nothing to replace, so it must not announce an update.
        const isUpdate = stale.length > 0;
        return Promise.all(stale.map((k) => caches.delete(k))).then(() => isUpdate);
      })
      .then((isUpdate) => self.clients.claim().then(() => isUpdate))
      .then((isUpdate) =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          if (!isUpdate) return;
          /* v85: tell the open windows instead of navigating them. The forced reload this
             replaces discarded transient state, and character creation is the sharp case:
             createState lives only in memory, so a deploy landing mid-wizard destroyed the
             class, name, all four identity answers and the one-shot wealth roll. The app
             shows a banner and the player reloads when he is not mid-action. */
          clients.forEach((c) => {
            if (FORCE_RELOAD) c.navigate(c.url);
            else c.postMessage({ type: "tystnad-update-ready", cache: CACHE });
          });
        })
      )
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
