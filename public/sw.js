const CACHE_NAME = "live-study-clock-v3";
const STATIC_ASSETS = [
  "/logo.png",
  "/manifest.json",
  "/default-wallpaper-phone.jpg",
  "/default-wallpaper-desktop.jpg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
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
  const url = new URL(e.request.url);

  // Always fetch fresh for HTML and JS/CSS assets — never cache them
  if (
    e.request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".jsx")
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }

  // Cache first for static images only
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico")
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
    return;
  }

  // Network first for everything else
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});