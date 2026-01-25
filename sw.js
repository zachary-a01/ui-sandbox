// sw.js — cache setup for Mindlister (Neil font)
// This version matches your repo filenames exactly (including neil.normal.ttf)

const CACHE_NAME = "mindlister-cache-v4-neil";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./words.json",
  "./manifest.webmanifest",
  "./robots.txt",

  // Icons / PWA assets that are in your root
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./web-app-manifest-192x192.png",
  "./web-app-manifest-512x512.png",

  // Font you actually have
  "./neil.normal.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Force re-fetch during install so updated font/css actually replaces old cached copies
      await cache.addAll(
        ASSETS_TO_CACHE.map((url) => new Request(url, { cache: "reload" }))
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Navigation: network-first (so updates come through), fallback to cached index.html offline
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedIndex = await cache.match("./index.html");

        try {
          const fresh = await fetch(req);
          cache.put("./index.html", fresh.clone());
          return fresh;
        } catch {
          return cachedIndex || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })()
    );
    return;
  }

  // Everything else: cache-first, then network; cache new files as they are fetched
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return new Response("", { status: 504, statusText: "Offline" });
      }
    })()
  );
});
