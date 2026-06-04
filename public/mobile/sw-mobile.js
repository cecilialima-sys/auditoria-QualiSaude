const CACHE_NAME = "sistema-mobile-v1";
const MOBILE_ASSETS = [
  "/mobile/",
  "/mobile/index.html",
  "/mobile/checklists.html",
  "/mobile/checklist-preenchimento.html",
  "/mobile/offline.html",
  "/mobile/manifest.json",
  "/mobile/css/mobile.css",
  "/mobile/js/mobile.js",
  "/mobile/js/register-sw.js",
  "/mobile/js/indexeddb.js",
  "/mobile/js/checklist-offline.js",
  "/mobile/js/sync-checklists.js",
  "/qualisaude-logo.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(MOBILE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isMobileAsset(requestUrl) {
  return requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith("/mobile/");
}

function mustBypassCache(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.startsWith("/admin/") ||
    requestUrl.pathname.startsWith("/login") ||
    requestUrl.pathname.includes("auth") ||
    requestUrl.pathname.includes("users") ||
    requestUrl.pathname.includes("permissions")
  );
}

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (mustBypassCache(requestUrl)) return;
  if (!isMobileAsset(requestUrl) && requestUrl.pathname !== "/qualisaude-logo.png") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match("/mobile/offline.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (event.request.method === "GET" && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "sync-checklists") return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => client.postMessage({ type: "SYNC_CHECKLISTS" }));
    })
  );
});
