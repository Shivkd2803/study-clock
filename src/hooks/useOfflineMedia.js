// ─── Offline Media Manager ────────────────────────────────────────────────────
// Handles caching video + audio to Cache API for offline playback

const OFFLINE_CACHE = "lsc-offline-media-v1";
const OFFLINE_META_KEY = "lsc_offline_meta";

// Get metadata about what's cached
export const getOfflineMeta = () => {
  try { return JSON.parse(localStorage.getItem(OFFLINE_META_KEY) || "{}"); } catch { return {}; }
};

const setOfflineMeta = (meta) => {
  localStorage.setItem(OFFLINE_META_KEY, JSON.stringify(meta));
};

// Check if a background is cached
export const isBackgroundCached = (name) => {
  const meta = getOfflineMeta();
  return !!meta[name]?.cached;
};

// Get total cached size in bytes
export const getTotalCachedSize = () => {
  const meta = getOfflineMeta();
  return Object.values(meta).reduce((sum, m) => sum + (m.size || 0), 0);
};

// Download a single URL with progress callback
const fetchWithProgress = async (url, onProgress, signal) => {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const total = parseInt(res.headers.get("content-length") || "0");
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(received / total);
  }

  const blob = new Blob(chunks);
  return new Response(blob, { headers: res.headers });
};

// Download and cache a background (video + audio)
export const cacheBackground = async (bg, onProgress, signal) => {
  const cache = await caches.open(OFFLINE_CACHE);
  let totalSize = 0;

  // Download video
  onProgress({ stage: "video", percent: 0 });
  const videoRes = await fetchWithProgress(bg.video, (p) => {
    onProgress({ stage: "video", percent: p * 0.7 });
  }, signal);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const videoClone = videoRes.clone();
  const videoBlob = await videoRes.blob();
  totalSize += videoBlob.size;
  await cache.put(bg.video, videoClone);

  // Download audio if exists
  if (bg.audio) {
    onProgress({ stage: "audio", percent: 0.7 });
    const audioRes = await fetchWithProgress(bg.audio, (p) => {
      onProgress({ stage: "audio", percent: 0.7 + p * 0.3 });
    }, signal);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const audioClone = audioRes.clone();
    const audioBlob = await audioRes.blob();
    totalSize += audioBlob.size;
    await cache.put(bg.audio, audioClone);
  }

  // Save metadata
  const meta = getOfflineMeta();
  meta[bg.name] = { cached: true, size: totalSize, cachedAt: Date.now() };
  setOfflineMeta(meta);

  onProgress({ stage: "done", percent: 1 });
  return totalSize;
};

// Remove a background from cache
export const uncacheBackground = async (bg) => {
  const cache = await caches.open(OFFLINE_CACHE);
  await cache.delete(bg.video);
  if (bg.audio) await cache.delete(bg.audio);

  const meta = getOfflineMeta();
  delete meta[bg.name];
  setOfflineMeta(meta);
};

// Resolve a URL — returns cached version if available, else original
export const resolveMediaUrl = async (url) => {
  if (!url) return url;
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const cached = await cache.match(url);
    if (cached) {
      const blob = await cached.blob();
      return URL.createObjectURL(blob);
    }
  } catch {}
  return url;
};

// Format bytes to human readable
export const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};