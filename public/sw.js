const CACHE_NAME = "live-study-clock-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/manifest.json",
  "/default-wallpaper-phone.jpg",
  "/default-wallpaper-desktop.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network first for HTML — always get latest
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }
  // Cache first for assets
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});