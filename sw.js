const VERSION = "20261108h";
const CACHE = `am24-shell-${VERSION}`;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/app.css?v=20261108h",
  "./js/app.js?v=20261108h",
  "./js/data.js?v=20261108h",
  "./js/scoring.js?v=20261108h",
  "./js/whatsapp.js?v=20261108h",
  "./js/storage.js?v=20261108h",
  "./js/summary.js?v=20261108h",
  "./js/icons.js?v=20261108h",
  "./js/folder.js?v=20261108h",
  "./js/routes.js?v=20261108h",
  "./js/media.js?v=20261108h",
  "./js/access.js?v=20261108h",
  "./js/scheme.js?v=20261108h",
  "./js/version.js?v=20261108h",
  "./images/icon-192.png",
  "./images/icon-512.png",
  "./images/apple-touch-icon.png",
  "./images/schemes/toyota-camry-2010-top.png",
  "./images/schemes/toyota-camry-2010-side.png",
  "./images/schemes/subaru-outback-2010-top.png",
  "./images/schemes/subaru-outback-2010-side.png",
  "./images/schemes/range-rover-evoque-2014-top.png",
  "./images/schemes/range-rover-evoque-2014-side.png",
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

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          const isHtml = request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
          return isHtml ? caches.match("./index.html") : undefined;
        }),
      ),
  );
});
