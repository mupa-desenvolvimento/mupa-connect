import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { MediaCacheService } from "./PlayerServices";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  duration: number;
  name: string;
  blobUrl?: string;
}

interface PlayerEngineProps {
  playlist: MediaItem[];
  onMediaChange?: (index: number) => void;
  volume?: number;
}

export function PlayerEngine({ playlist, onMediaChange, volume = 0 }: PlayerEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const lastTransitionRef = useRef<number>(Date.now());
  const preloadRef = useRef<Set<string>>(new Set());

  // Helper to get local URL (blob or cached)
  const getDisplayUrl = useCallback((item: MediaItem) => {
    return mediaMap[item.url] || item.url;
  }, [mediaMap]);

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    
    const nextIdx = (currentIndex + 1) % playlist.length;
    const isNextLayerA = activeLayer === "B";

    console.log(`[PlayerEngine] Transitioning to layer ${isNextLayerA ? "A" : "B"} (index ${nextIdx})`);
    
    // Sync current layer's video if it's a video
    if (playlist[nextIdx].type === "video") {
       const nextVideoRef = isNextLayerA ? videoARef : videoBRef;
       if (nextVideoRef.current) {
         nextVideoRef.current.currentTime = 0;
         nextVideoRef.current.play().catch(e => console.warn("Autoplay blocked/failed", e));
       }
    }

    // Pause the old layer's video
    const prevVideoRef = isNextLayerA ? videoBRef : videoARef;
    if (prevVideoRef.current) {
      prevVideoRef.current.pause();
    }

    setCurrentIndex(nextIdx);
    setActiveLayer(isNextLayerA ? "A" : "B");
    onMediaChange?.(nextIdx);
    lastTransitionRef.current = Date.now();
  }, [currentIndex, activeLayer, playlist, onMediaChange]);

  // Main playback timer logic
  useEffect(() => {
    if (!playlist.length) return;

    const media = playlist[currentIndex];
    const duration = (media.duration || 10) * 1000;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      handleNext();
    }, duration);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [currentIndex, activeLayer, playlist, handleNext]);

  // Intelligent Preloading & Caching
  useEffect(() => {
    if (!playlist.length) return;
    
    // 1. Preload Next Item
    const nextIdx = (currentIndex + 1) % playlist.length;
    const nextMedia = playlist[nextIdx];
    
    const loadMedia = async (url: string) => {
      if (preloadRef.current.has(url)) return;
      preloadRef.current.add(url);
      
      await MediaCacheService.cacheMedia(url);
      const blobUrl = await MediaCacheService.getBlobUrl(url);
      setMediaMap(prev => ({ ...prev, [url]: blobUrl }));
    };

    if (nextMedia?.url) {
      loadMedia(nextMedia.url);
    }

    // 2. Preload the one after next (background)
    const afterNextIdx = (currentIndex + 2) % playlist.length;
    const afterNextMedia = playlist[afterNextIdx];
    if (afterNextMedia?.url) {
      setTimeout(() => loadMedia(afterNextMedia.url), 2000);
    }

    // 3. Batch cache the whole playlist in background
    const idleTask = (window as any).requestIdleCallback || ((fn: any) => setTimeout(fn, 5000));
    idleTask(() => {
      playlist.forEach(item => {
        if (!mediaMap[item.url]) {
          MediaCacheService.cacheMedia(item.url);
        }
      });
    });

  }, [currentIndex, playlist, mediaMap]);

  // Watchdog & Resiliency
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (!playlist.length) return;
      
      const now = Date.now();
      const timeSinceTransition = now - lastTransitionRef.current;
      const currentMedia = playlist[currentIndex];
      const expectedDuration = (currentMedia?.duration || 10) * 1000;
      
      // Force next if stuck
      if (timeSinceTransition > expectedDuration + 10000) {
        console.warn("[Watchdog] Playback stuck! Skipping...");
        handleNext();
      }

      // Ensure video is playing
      const activeVideoRef = activeLayer === "A" ? videoARef : videoBRef;
      if (currentMedia?.type === "video" && activeVideoRef.current) {
        if (activeVideoRef.current.paused && timeSinceTransition > 2000) {
          activeVideoRef.current.play().catch(() => handleNext());
        }
      }
    }, 4000);

    return () => clearInterval(watchdog);
  }, [currentIndex, activeLayer, playlist, handleNext]);

  const handleError = useCallback((e: any) => {
    console.error("[PlayerEngine] Media failure", e);
    handleNext(); // Skip broken media
  }, [handleNext]);

  if (!playlist.length) return null;

  // Prepare layers
  const nextIndex = (currentIndex + 1) % playlist.length;
  
  const layerAIndex = activeLayer === "A" ? currentIndex : nextIndex;
  const layerBIndex = activeLayer === "B" ? currentIndex : nextIndex;
  
  const mediaA = playlist[layerAIndex];
  const mediaB = playlist[layerBIndex];

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Layer A */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeLayer === "A" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        style={{ willChange: 'opacity' }}
      >
        {mediaA?.type === "video" ? (
          <video
            ref={videoARef}
            src={getDisplayUrl(mediaA)}
            muted={volume === 0}
            playsInline
            className="w-full h-full object-cover"
            onError={handleError}
          />
        ) : (
          <img
            src={getDisplayUrl(mediaA)}
            className="w-full h-full object-cover"
            alt=""
            onError={handleError}
          />
        )}
      </div>

      {/* Layer B */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${activeLayer === "B" ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        style={{ willChange: 'opacity' }}
      >
        {mediaB?.type === "video" ? (
          <video
            ref={videoBRef}
            src={getDisplayUrl(mediaB)}
            muted={volume === 0}
            playsInline
            className="w-full h-full object-cover"
            onError={handleError}
          />
        ) : (
          <img
            src={getDisplayUrl(mediaB)}
            className="w-full h-full object-cover"
            alt=""
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}
