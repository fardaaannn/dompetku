const CACHE_NAME = "dompetku-v10"; //
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0",
];

// 1. Install Service Worker
self.addEventListener("install", (event) => {
  // Paksa aja udah SW baru untuk segera aktif tanpa menunggu SW lama mati
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Menyimpan aset ke cache...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
              console.log("Menghapus cache lama:", key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        // Paksa SW baru untuk segera mengontrol semua klien (tab/window) yang terbuka, udah pusing gw
        return self.clients.claim();
      })
  );
});

// 3. Fetch
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
