// 缓存名称 在devtools 可以区分
const CACHE_NAME = 'CACHE-v1';
// 缓存时效时间
const expirationTime = 1000 * 60 * 60 * 24 * 7;
// 缓存请求url
const urlsToCache = ['/README.md', '/test.js'];

// 注册 install 事件
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 注册 activate 事件
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 注册 fetch 事件
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  if (urlsToCache.includes(requestUrl.pathname + requestUrl.search)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then(cache => {
          return cache.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              const cacheAge = Date.now() - parseInt(cachedResponse.headers.get('date'));
              if (cacheAge > expirationTime) {
                return fetchAndCache(event.request, cache);
              } else {
                return cachedResponse;
              }
            } else {
              return fetchAndCache(event.request, cache);
            }
          });
        })
    );
  }
});

function fetchAndCache(request, cache) {
  return fetch(request).then(response => {
    const headers = new Headers(response.headers);
    headers.append('date', Date.now());
    const responseWithMetadata = new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    cache.put(request, responseWithMetadata.clone());
    return responseWithMetadata;
  });
}