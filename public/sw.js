const CACHE_NAME = "live-study-clock-v5";
const OFFLINE_CACHE = "lsc-offline-media-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/logo.png",
  "/manifest.json",
  "/default-wallpaper-phone.jpg",
  "/default-wallpaper-desktop.jpg",
];

// Install — cache app shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// Activate — clean old caches (but keep offline media)
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

  // ── Cloudinary media — offline cache first, then network ──────────────────
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
        try {
          return await fetch(e.request);
        } catch {
          return new Response(JSON.stringify({ error: "offline" }), {
            status: 503, headers: { "Content-Type": "application/json" }
          });
        }
      })
    );
    return;
  }

  // ── JS / CSS — network first, fallback to cache ────────────────────────────
  if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css")
  ) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          // Cache fresh copy
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // ── HTML navigation — network first, fallback to cached /index.html ───────
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // ── Static images — cache first ───────────────────────────────────────────
  if (
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".ico")
  ) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // ── Everything else — network first, fallback to cache ────────────────────
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});