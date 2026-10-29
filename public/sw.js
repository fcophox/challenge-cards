/* Challenge Cards service worker.
 *
 * Strategy
 * - App shell pages: precached on install, served network-first (3 s timeout)
 *   with cache fallback, then /offline.
 * - /_next/static/*: cache-first (content-hashed, immutable).
 * - Other same-origin GET assets (icons, manifest): stale-while-revalidate.
 * - Never cached: non-GET, cross-origin (Supabase API/Storage), requests with
 *   credentials headers, RSC flight requests, blob:/data: URLs.
 *   Evidence lives in IndexedDB and never goes through the network or caches.
 */
const VERSION = "FFysdi2RjoQ0w1t4bTp3F";
const SHELL_CACHE = `cc-shell-${VERSION}`;
const STATIC_CACHE = `cc-static-${VERSION}`;
const ASSET_CACHE = `cc-assets-${VERSION}`;
const OFFLINE_URL = "/offline";
const SHELL = ["/", "/retos", "/coleccion", "/perfil", "/ajustes", "/bienvenida", OFFLINE_URL];
const EXTRA = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      const statics = await caches.open(STATIC_CACHE);
      const assetUrls = new Set();
      await Promise.all(
        SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (!res.ok) return;
            const html = await res.clone().text();
            for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assetUrls.add(m[0]);
            await shell.put(url, res);
          } catch {
            /* offline during install: pages get cached on first visit */
          }
        }),
      );
      await Promise.all([...assetUrls].map((u) => statics.add(u).catch(() => undefined)));
      await (await caches.open(ASSET_CACHE)).addAll(EXTRA).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE, ASSET_CACHE]);
      for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

function cacheable(res) {
  if (!res || !res.ok || res.type !== "basic") return false;
  const cc = res.headers.get("Cache-Control") || "";
  return !/no-store|private/.test(cc);
}

async function networkFirstPage(event) {
  const { request } = event;
  const url = new URL(request.url);
  const cache = await caches.open(SHELL_CACHE);
  try {
    const preload = await event.preloadResponse;
    const res =
      preload ||
      (await Promise.race([
        fetch(request),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
      ]));
    if (cacheable(res) && SHELL.includes(url.pathname)) await cache.put(url.pathname, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(url.pathname)) ||
      (await cache.match(OFFLINE_URL)) ||
      new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) await cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(event.request);
  const update = fetch(event.request)
    .then(async (res) => {
      if (cacheable(res)) await cache.put(event.request, res.clone());
      return res;
    })
    .catch(() => hit);
  if (hit) {
    event.waitUntil(update);
    return hit;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase & any third party: never cached
  if (request.headers.has("Authorization")) return;
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (!url.pathname.startsWith("/_next/")) {
    event.respondWith(staleWhileRevalidate(event));
  }
});
