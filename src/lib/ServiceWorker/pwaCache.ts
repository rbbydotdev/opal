const CACHE_NAME = 'opal-editor-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

declare const self: ServiceWorkerGlobalScope;

export class PWACache {
  static async handleInstall(): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_CACHE_URLS);
    } catch (error) {
      console.warn('PWA cache install failed:', error);
    }
  }

  static async handleActivate(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    } catch (error) {
      console.warn('PWA cache cleanup failed:', error);
    }
  }

  static async getCachedResponse(request: Request): Promise<Response | null> {
    try {
      return await caches.match(request);
    } catch (error) {
      console.warn('PWA cache lookup failed:', error);
      return null;
    }
  }

  static async cacheResponse(request: Request, response: Response): Promise<void> {
    try {
      // Only cache successful responses
      if (response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
    } catch (error) {
      console.warn('PWA cache storage failed:', error);
    }
  }

  static shouldCacheRequest(url: URL): boolean {
    // Cache static assets
    return url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico)$/) !== null ||
           url.pathname === '/' ||
           url.pathname === '/index.html';
  }
}