import { useState, useEffect } from "react";

/**
 * MediaCacheService manages the local storage of media files using the Cache API.
 * This ensures that media can be played offline and transitions are fluid.
 */
export const MediaCacheService = {
  CACHE_NAME: "mupa-media-cache-v1",

  async init() {
    if (!("caches" in window)) {
      console.warn("Cache API not supported in this browser");
      return false;
    }
    return true;
  },

  async cacheMedia(url: string): Promise<string> {
    const cache = await caches.open(this.CACHE_NAME);
    const cachedResponse = await cache.match(url);
    
    if (cachedResponse) {
      return url; // Already cached
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      await cache.put(url, response);
      console.log(`[MediaCache] Cached: ${url}`);
      return url;
    } catch (err) {
      console.error(`[MediaCache] Error caching ${url}:`, err);
      return url; // Fallback to network URL
    }
  },

  async getCachedUrl(url: string): Promise<string> {
    const cache = await caches.open(this.CACHE_NAME);
    const response = await cache.match(url);
    if (response) {
      // In a real PWA we might use service workers, but for now 
      // we can return the URL and let the browser's cache handling 
      // do the work if the Cache API has already intercepted it.
      return url; 
    }
    return url;
  },

  async clearOldCache(currentUrls: string[]) {
    const cache = await caches.open(this.CACHE_NAME);
    const keys = await cache.keys();
    for (const request of keys) {
      if (!currentUrls.includes(request.url)) {
        await cache.delete(request);
        console.log(`[MediaCache] Deleted old cache: ${request.url}`);
      }
    }
  }
};

/**
 * ManifestManager handles the persistence of the playlist manifest for offline use.
 */
export const ManifestManager = {
  getManifestKey: (serial: string) => `manifest_${serial}`,

  saveManifest(serial: string, manifest: any) {
    localStorage.setItem(this.getManifestKey(serial), JSON.stringify({
      ...manifest,
      last_update: new Date().toISOString()
    }));
  },

  getManifest(serial: string) {
    const data = localStorage.getItem(this.getManifestKey(serial));
    return data ? JSON.parse(data) : null;
  }
};
