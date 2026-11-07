const VERSION = "20261108d";
const CACHE = `am24-shell-${VERSION}`;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css?v=20261108d",
  "./js/app.js?v=20261108d",
  "./js/data.js?v=20261108d",
  "./js/scoring.js?v=20261108d",
  "./js/whatsapp.js?v=20261108d",
  "./js/storage.js?v=20261108d",
  "./js/summary.js?v=20261108d",
  "./js/icons.js?v=20261108d",
  "./js/folder.js?v=20261108d",
  "./js/routes.js?v=20261108d",
  "./js/media.js?v=20261108d",
  "./js/version.js?v=20261108d",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./images/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("am24-shell-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.protocol === "blob:" || url.protocol === "data:") return;
  if (url.origin !== self.location.origin) return;

  const isHtml = request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isHtml) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html"))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
