self.addEventListener("install", evt => {
    self.skipWaiting();
});

self.addEventListener("activate", evt => {
    console.log("PWA ativo");
});

self.addEventListener("fetch", evt => {
    // permite modo offline simples
    evt.respondWith(fetch(evt.request).catch(() => new Response("Offline")));
});
