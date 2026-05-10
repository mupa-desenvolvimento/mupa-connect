import { useState, useEffect } from "react";

/**
 * MediaCacheService manages the local storage of media files using the Cache API.
 * Optimized for Android 9 / X96 with a local-first approach and CORS fallback.
 */
export const MediaCacheService = {
  CACHE_NAME: "mupa-media-cache-v5",
  downloadQueue: [] as { url: string; type?: 'image' | 'video'; priority?: number; serial?: string; resolve: (val: string) => void; reject: (err: any) => void }[],
  activeDownloads: 0,
  MAX_CONCURRENT: 2,
  blobUrlCache: new Map<string, string>(),

  async logPerformance(serial: string, event: string, message: string, metadata: any = {}, duration?: number) {
    if (!serial) return;
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.from("player_performance_logs").insert({
        serial,
        event_type: event,
        message,
        metadata,
        duration_ms: duration
      });
    } catch (e) {
      console.warn(`[MediaCache] [Performance] Log failed for ${event}`, e);
    }
  },

  async init() {
    if (!("caches" in window)) {
      console.warn("[MediaCache] Cache API not supported in this browser");
      return false;
    }
    return true;
  },

  async isCached(url: string): Promise<boolean> {
    if (!url) return false;
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(url);
      return !!response;
    } catch (e) {
      return false;
    }
  },

  /**
   * Caches media using a queue system.
   * On CORS error, it fails gracefully allowing the player to use the direct URL.
   */
  async cacheMedia(url: string, type?: 'image' | 'video', priority = 0, serial?: string): Promise<string> {
    if (!url) return "";
    
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        // Warm up the blob URL cache
        this.getBlobUrl(url).catch(() => {});
        return url;
      }
    } catch (e) {
      console.warn("[MediaCache] Error checking cache, proceeding to queue", url);
    }

    return new Promise((resolve, reject) => {
      this.downloadQueue.push({ url, type, priority, serial, resolve, reject });
      this.downloadQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      this.processQueue();
    });
  },

  async processQueue() {
    if (this.activeDownloads >= this.MAX_CONCURRENT || this.downloadQueue.length === 0) {
      return;
    }

    const item = this.downloadQueue.shift();
    if (!item) return;

    this.activeDownloads++;
    const startTime = Date.now();
    
    try {
      console.log(`[MediaCache] [Download] Starting: ${item.url.split('/').pop()}`);
      
      const cache = await caches.open(this.CACHE_NAME);
      
      // Try fetch with CORS first
      let response;
      try {
        response = await fetch(item.url, { mode: 'cors', credentials: 'omit' });
      } catch (fetchErr) {
        console.warn(`[MediaCache] [Download] CORS/Network error for ${item.url}`, fetchErr);
        throw new Error("CORS_OR_NETWORK_ERROR");
      }
      
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      
      await cache.put(item.url, response.clone());
      await this.getBlobUrl(item.url);
      
      const duration = Date.now() - startTime;
      console.log(`[MediaCache] [Download] Success: ${item.url.split('/').pop()} in ${duration}ms`);
      
      if (item.serial) {
        this.logPerformance(item.serial, 'media_cache_success', `Cached: ${item.url.split('/').pop()}`, { url: item.url, type: item.type }, duration);
      }
      
      item.resolve(item.url);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error(`[MediaCache] [Download] Failed: ${item.url.split('/').pop()}`, err.message);
      
      if (item.serial) {
        this.logPerformance(item.serial, 'media_cache_error', `Failed: ${item.url.split('/').pop()}`, { url: item.url, error: err.message }, duration);
      }
      
      // Resolve anyway to not block the player, it will use the direct URL
      item.resolve(item.url);
    } finally {
      this.activeDownloads--;
      this.processQueue();
    }
  },

  /**
   * Returns a local Blob URL if available, otherwise returns the original URL.
   * This is the "Safe Preload" strategy.
   */
  async getBlobUrl(url: string): Promise<string> {
    if (!url) return "";
    
    if (this.blobUrlCache.has(url)) {
      return this.blobUrlCache.get(url)!;
    }

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlCache.set(url, blobUrl);
        return blobUrl;
      }
    } catch (e) {
      console.warn("[MediaCache] [Preload] Failed to create blob URL, using direct URL", url);
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
          if (this.blobUrlCache.has(request.url)) {
            URL.revokeObjectURL(this.blobUrlCache.get(request.url)!);
            this.blobUrlCache.delete(request.url);
          }
          console.log(`[MediaCache] [Cleanup] Deleted: ${request.url.split('/').pop()}`);
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
    try {
      localStorage.setItem(this.getManifestKey(serial), JSON.stringify({
        ...manifest,
        last_update: new Date().toISOString()
      }));
    } catch (e) {
      console.warn("[ManifestManager] Failed to save manifest", e);
    }
  },

  getManifest(serial: string) {
    try {
      const data = localStorage.getItem(this.getManifestKey(serial));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
};

/**
 * ScheduleResolver handles logic for active playlist based on current time
 */
export const ScheduleResolver = {
  getActivePlaylist(manifest: any): any[] {
    if (!manifest) return [];
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const currentDay = now.getDay();

    if (manifest.schedules && Array.isArray(manifest.schedules)) {
      const matchingSchedule = manifest.schedules.find((s: any) => {
        const days = Array.isArray(s.days) ? s.days : [];
        const dayMatch = days.length === 0 || days.includes(currentDay);
        const start = s.start_time || 0;
        const end = s.end_time || 2359;
        const timeMatch = currentTime >= start && currentTime <= end;
        return dayMatch && timeMatch;
      });

      if (matchingSchedule && Array.isArray(matchingSchedule.items) && matchingSchedule.items.length > 0) {
        return matchingSchedule.items;
      }
    }

    const primaryItems = Array.isArray(manifest.items) ? manifest.items : [];
    if (primaryItems.length > 0) return primaryItems;

    return Array.isArray(manifest.fallback_items) ? manifest.fallback_items : [];
  }
};
