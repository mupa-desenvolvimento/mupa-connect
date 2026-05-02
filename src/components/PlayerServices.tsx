import { useState, useEffect } from "react";

/**
 * MediaCacheService manages the local storage of media files using the Cache API.
 * This ensures that media can be played offline and transitions are fluid.
 */
export const MediaCacheService = {
  CACHE_NAME: "mupa-media-cache-v2",

  async init() {
    if (!("caches" in window)) {
      console.warn("Cache API not supported in this browser");
      return false;
    }
    return true;
  },

  async isCached(url: string): Promise<boolean> {
    if (!url) return false;
    const cache = await caches.open(this.CACHE_NAME);
    const response = await cache.match(url);
    return !!response;
  },

  async cacheMedia(url: string): Promise<string> {
    if (!url) return "";
    const cache = await caches.open(this.CACHE_NAME);
    const cachedResponse = await cache.match(url);
    
    if (cachedResponse) {
      return url; 
    }

    try {
      console.log(`[MediaCache] Downloading: ${url}`);
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      await cache.put(url, response);
      console.log(`[MediaCache] Cached: ${url}`);
      return url;
    } catch (err) {
      console.error(`[MediaCache] Error caching ${url}:`, err);
      return url; 
    }
  },

  async getBlobUrl(url: string): Promise<string> {
    if (!url) return "";
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error("[MediaCache] Failed to create blob URL", e);
    }
    return url;
  },

  async clearOldCache(currentUrls: string[]) {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      for (const request of keys) {
        if (!currentUrls.includes(request.url)) {
          await cache.delete(request);
          console.log(`[MediaCache] Deleted old cache: ${request.url}`);
        }
      }
    } catch (e) {}
  }
};

/**
 * ManifestManager handles the persistence of the playlist manifest for offline use.
 */
export const ManifestManager = {
  getManifestKey: (serial: string) => `manifest_v2_${serial}`,

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

/**
 * ScheduleResolver handles logic for active playlist based on current time
 */
export const ScheduleResolver = {
  getActivePlaylist(manifest: any): any[] {
    if (!manifest) return [];
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes(); // HHMM format
    const currentDay = now.getDay(); // 0-6 (Sunday is 0)

    // If manifest has schedules, find the matching one
    if (manifest.schedules && Array.isArray(manifest.schedules)) {
      const matchingSchedule = manifest.schedules.find((s: any) => {
        // Validate day of week
        const days = Array.isArray(s.days) ? s.days : [];
        const dayMatch = days.length === 0 || days.includes(currentDay);
        
        // Validate time range
        const start = s.start_time || 0;
        const end = s.end_time || 2359;
        const timeMatch = currentTime >= start && currentTime <= end;

        return dayMatch && timeMatch;
      });

      if (matchingSchedule && Array.isArray(matchingSchedule.items) && matchingSchedule.items.length > 0) {
        return matchingSchedule.items;
      }
    }

    // Default to main playlist or fallback_items if primary is empty
    const primaryItems = Array.isArray(manifest.items) ? manifest.items : [];
    if (primaryItems.length > 0) return primaryItems;

    return Array.isArray(manifest.fallback_items) ? manifest.fallback_items : [];
  }
};
