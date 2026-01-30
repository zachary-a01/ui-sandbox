// sw.js — cache-busting PWA service worker
// Bump CACHE_NAME every time you update files.

const CACHE_NAME = "mindlister-cache-v1.0.1";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./words.json",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./apple-touch-icon.png",
  "./web-app-manifest-192x192.png",
  "./web-app-manifest-512x512.png",
  "./neil.normal.ttf",
  "./BradleyHandBold.ttf",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : undefined)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
