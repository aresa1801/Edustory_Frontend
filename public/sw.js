/* EduStory service worker — installable PWA (offline shell + runtime cache) */
const VERSION = 'edustory-v1'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`
const OFFLINE_URL = '/offline'

const PRECACHE = ['/', '/offline', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' }))))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

function isCacheableAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico|gif)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never touch cross-origin (Supabase, Midtrans, fonts API handled below) or API/auth traffic.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return

  // Navigations: network-first, fall back to cached page then the offline shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(RUNTIME_CACHE)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match(request)
          if (cached) return cached
          const offline = await caches.match(OFFLINE_URL)
          if (offline) return offline
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        }
      })(),
    )
    return
  }

  // Static assets: cache-first with background refresh.
  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      })(),
    )
  }
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
