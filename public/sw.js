const CACHE_NAME = "live-study-clock-v4";
const OFFLINE_CACHE = "lsc-offline-media-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
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
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== OFFLINE_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never cache: HTML, JS, CSS (always fresh)
  if (
    e.request.mode === "navigate" ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".jsx")
  ) {
    e.respondWith(fetch(e.request).catch(() => caches.match("/index.html")));
    return;
  }

  // Offline media cache — cache first for Cloudinary video/audio
  if (
    url.hostname.includes("cloudinary.com") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".mp3") ||
    url.pathname.endsWith(".webm")
  ) {
    e.respondWith(
      caches.open(OFFLINE_CACHE).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        // Not cached — fetch from network
        try {
          const res = await fetch(e.request);
          return res;
        } catch {
          return new Response("Media unavailable offline", { status: 503 });
        }
      })
    );
    return;
  }

  // Static images — cache first
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

  // Everything else — network first, fallback to cache
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});