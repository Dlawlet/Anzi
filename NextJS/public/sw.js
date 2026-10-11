// Anzi service worker: keeps the app screens and their scripts so "My addresses" opens with no connection.
// It never touches the API or any cross-origin request.
const CACHE = 'anzi-v1'
const PAGES = ['/', '/create', '/find', '/mine']
const OFFLINE = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

async function networkFirstPage(request, path) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok && PAGES.includes(path)) cache.put(path, response.clone())
    return response
  } catch {
    return (await cache.match(path)) || (await cache.match(OFFLINE)) || Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    // Search results (/find?q=...) are not cached: only the bare page is.
    const path = url.search ? '' : url.pathname
    event.respondWith(networkFirstPage(request, path))
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request))
  }
})
