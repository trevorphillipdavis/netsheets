/* =====================================================
   Catena Net Sheet — Service Worker
   Cache version: bump CACHE_VERSION when files change
   ===================================================== */

const CACHE_VERSION = "netsheets-v1.1.5";

const APP_SHELL = [
  "./index.html",
  "./catena-logo.png",
  "./catena-logo-pdf.jpg",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

const NETWORK_FIRST_ORIGINS = [
  "fnzgcomwddejhtxfgcie.supabase.co",
  "api.zippopotam.us",
  "nominatim.openstreetmap.org"
];

// Always try network first for the main page so deploys show up immediately
const NETWORK_FIRST_PATHS = ["/index.html", "/netsheets/", "/netsheets/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (NETWORK_FIRST_ORIGINS.includes(url.hostname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  const isPage = event.request.mode === "navigate" ||
    NETWORK_FIRST_PATHS.some((p) => url.pathname.endsWith(p));
  if (isPage) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (event.request.method === "GET") {
    event.respondWith(cacheFirst(event.request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response(
      "<h1>You're offline</h1><p>Please reconnect and reload to use the Net Sheet.</p>",
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request);
  }
}
