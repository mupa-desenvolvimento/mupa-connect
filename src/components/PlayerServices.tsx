import { useState, useEffect } from "react";

/**
 * MediaCacheService manages the local storage of media files using the Cache API.
 * Optimized for Android 9 / X96 with a local-first approach.
 */
export const MediaCacheService = {
  CACHE_NAME: "mupa-media-cache-v4",
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
      console.warn("[MediaCache] Log failed", e);
    }
  },

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

  /**
   * Caches media using a queue system to prevent network congestion.
   * Returns the original URL, but ensures it's in Cache API.
   */
  async cacheMedia(url: string, type?: 'image' | 'video', priority = 0, serial?: string): Promise<string> {
    if (!url) return "";
    
    // Check if already in cache
    const cache = await caches.open(this.CACHE_NAME);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      // Warm up the blob URL cache
      this.getBlobUrl(url).catch(() => {});
      return url;
    }

    return new Promise((resolve, reject) => {
      // Add to queue with priority (higher number = higher priority)
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
      console.log(`[MediaCache] Starting download: ${item.url} (Type: ${item.type || 'unknown'})`);
      
      const cache = await caches.open(this.CACHE_NAME);
      const response = await fetch(item.url, { mode: 'cors' });
      
      if (!response.ok) throw new Error(`Failed to fetch ${item.url} - Status ${response.status}`);
      
      // Clone response before putting it in cache because body can only be consumed once
      await cache.put(item.url, response.clone());
      
      // Warm up blob URL cache immediately after download
      await this.getBlobUrl(item.url);
      
      const duration = Date.now() - startTime;
      console.log(`[MediaCache] Successfully cached: ${item.url} in ${duration}ms`);
      
      if (item.serial) {
        this.logPerformance(item.serial, 'media_cache_success', `Cached: ${item.url.split('/').pop()}`, { url: item.url, type: item.type }, duration);
      }
      
      item.resolve(item.url);
    } catch (err: any) {
      console.error(`[MediaCache] Error caching ${item.url}:`, err);
      const duration = Date.now() - startTime;
      if (item.serial) {
        this.logPerformance(item.serial, 'media_cache_error', `Failed to cache: ${item.url.split('/').pop()}`, { url: item.url, error: err.message }, duration);
      }
      item.reject(err);
    } finally {
      this.activeDownloads--;
      this.processQueue();
    }
  },

  /**
   * Retrieves a Blob URL from Cache API for fluid local playback.
   * Caches the Blob URL itself to prevent memory leaks and redundant operations.
   */
  async getBlobUrl(url: string): Promise<string> {
    if (!url) return "";
    
    // Return from memory cache if available
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
      console.error("[MediaCache] Failed to create blob URL", e);
    }
    return url; // Fallback to original URL
  },

  async clearOldCache(currentUrls: string[]) {
    try {
      const cache = await caches.open(this.CACHE_NAME);
      const keys = await cache.keys();
      for (const request of keys) {
        if (!currentUrls.includes(request.url)) {
          await cache.delete(request);
          
          // Also revoke and remove from memory cache
          if (this.blobUrlCache.has(request.url)) {
            URL.revokeObjectURL(this.blobUrlCache.get(request.url)!);
            this.blobUrlCache.delete(request.url);
          }
          
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
