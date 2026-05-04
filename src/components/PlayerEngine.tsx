import { useEffect, useState, useRef, useCallback } from "react";
import { MediaCacheService } from "./PlayerServices";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  duration: number;
  name: string;
}

interface PlayerEngineProps {
  playlist: MediaItem[];
  onMediaChange?: (index: number) => void;
  volume?: number;
  serial?: string;
}

export function PlayerEngine({ playlist, onMediaChange, volume = 0, serial }: PlayerEngineProps) {
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [mediaA, setMediaA] = useState<{ item: MediaItem; index: number } | null>(null);
  const [mediaB, setMediaB] = useState<{ item: MediaItem; index: number } | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isReady, setIsReady] = useState(false); // New state to avoid black screen on init

  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const isTransitioningRef = useRef(false);

  // Sync playlist ref
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  const getDisplayUrl = useCallback((url: string) => {
    return mediaMap[url] || url;
  }, [mediaMap]);

  // Pre-cache item and get blob URL
  const prepareMedia = useCallback(async (item: MediaItem, priority = 0) => {
    if (!item?.url) return;
    const startTime = Date.now();
    try {
      await MediaCacheService.cacheMedia(item.url, item.type, priority, serial);
      const blobUrl = await MediaCacheService.getBlobUrl(item.url);
      setMediaMap(prev => ({ ...prev, [item.url]: blobUrl }));
    } catch (err: any) {
      console.warn("[PlayerEngine] Prepare failed", item.url, err);
      if (serial) {
        MediaCacheService.logPerformance(serial, 'media_prepare_error', `Falha ao preparar: ${item.name}`, { url: item.url, error: err.message }, Date.now() - startTime);
      }
    }
  }, [serial]);

  const moveToNext = useCallback(() => {
    const currentPlaylist = playlistRef.current;
    if (isTransitioningRef.current || !currentPlaylist.length) return;
    
    isTransitioningRef.current = true;
    setIsTransitioning(true);

    const nextIndex = (currentIndexRef.current + 1) % currentPlaylist.length;
    currentIndexRef.current = nextIndex;
    onMediaChange?.(nextIndex);

    // Switch active layer
    setActiveLayer(prev => {
      const newActiveLayer = prev === "A" ? "B" : "A";
      
      // Prepare the NEXT media item for the now inactive layer with high priority
      const nextNextIndex = (nextIndex + 1) % currentPlaylist.length;
      const nextNextItem = currentPlaylist[nextNextIndex];

      if (newActiveLayer === "A") {
        setMediaB({ item: nextNextItem, index: nextNextIndex });
        prepareMedia(nextNextItem, 10); // Priority 10 for immediate next
      } else {
        setMediaA({ item: nextNextItem, index: nextNextIndex });
        prepareMedia(nextNextItem, 10); // Priority 10 for immediate next
      }
      
      return newActiveLayer;
    });

    // Transition duration match
    setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
    }, 800);

  }, [onMediaChange, prepareMedia]);

  const startCurrentMedia = useCallback(() => {
    const isA = activeLayer === "A";
    const currentMedia = isA ? mediaA : mediaB;
    const video = isA ? videoARef.current : videoBRef.current;

    if (!currentMedia) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentMedia.item.type === "video" && video) {
      video.muted = volume === 0;
      video.currentTime = 0;
      
      // Ensure video is ready before transition if possible
      video.play().catch(err => {
        console.warn("[PlayerEngine] Play error, skipping in 2s", err);
        if (serial) {
          MediaCacheService.logPerformance(serial, 'media_play_error', `Erro ao reproduzir vídeo: ${currentMedia.item.name}`, { url: currentMedia.item.url, error: err.message });
        }
        timerRef.current = setTimeout(moveToNext, 2000);
      });
      
      // Safety timeout
      const safetyDuration = ((currentMedia.item.duration || 10) + 5) * 1000;
      timerRef.current = setTimeout(() => {
        console.warn("[PlayerEngine] Video safety timeout reached");
        if (serial) {
          MediaCacheService.logPerformance(serial, 'media_play_timeout', `Timeout de vídeo: ${currentMedia.item.name}`, { url: currentMedia.item.url, duration: currentMedia.item.duration });
        }
        moveToNext();
      }, safetyDuration);
    } else {
      // For images, ensure we wait for the configured duration
      const duration = (currentMedia.item.duration || 10) * 1000;
      timerRef.current = setTimeout(moveToNext, duration);
    }
  }, [activeLayer, mediaA, mediaB, volume, moveToNext]);

  // Whenever activeLayer or current media index changes, trigger start
  useEffect(() => {
    startCurrentMedia();
  }, [activeLayer, mediaA?.index, mediaB?.index, startCurrentMedia]);

  // Initial setup
  useEffect(() => {
    if (!playlist.length) return;

    const init = async () => {
      // Don't reset if we are already playing and length hasn't changed
      if (mediaA || mediaB) {
        console.log("[PlayerEngine] Playlist updated, continuing playback...");
        setIsReady(true);
        return;
      }

      currentIndexRef.current = 0;
      const item0 = playlist[0];
      const item1 = playlist[1 % playlist.length];

      // Prepare both immediately with highest priority
      await Promise.all([
        prepareMedia(item0, 20), 
        prepareMedia(item1, 15)
      ]);

      setMediaA({ item: item0, index: 0 });
      setMediaB({ item: item1, index: 1 % playlist.length });
      
      // Give React a frame to mount elements before showing
      requestAnimationFrame(() => {
        setActiveLayer("A");
        setIsReady(true);
        if (serial) {
          MediaCacheService.logPerformance(serial, 'engine_ready', 'Engine Profissional Iniciada', { playlist_size: playlist.length });
        }
        onMediaChange?.(0);
      });
    };

    init();

    // Background cache everything else + cleanup
    const idleTask = (window as any).requestIdleCallback || ((fn: any) => setTimeout(fn, 5000));
    idleTask(() => {
      playlist.forEach(item => {
        if (!mediaMap[item.url]) {
          MediaCacheService.cacheMedia(item.url, item.type, -1).catch(() => {});
        }
      });
      // Cleanup old cache entries not in current playlist
      const urls = playlist.map(i => i.url);
      MediaCacheService.clearOldCache(urls).catch(() => {});
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playlist.length, playlist]); // Added playlist to catch content updates with same length

  if (!playlist.length) return null;

  return (
    <div className={cn(
      "relative w-full h-full bg-black overflow-hidden transition-opacity duration-1000",
      isReady ? "opacity-100" : "opacity-0"
    )}>
      {/* Layer A */}
      <div 
        className={`absolute inset-0 transition-all duration-800 ease-in-out ${
          activeLayer === "A" ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"
        }`}
        style={{ willChange: 'opacity, transform' }}
      >
        {mediaA?.item.type === "video" ? (
          <video
            ref={videoARef}
            src={getDisplayUrl(mediaA.item.url)}
            muted={volume === 0}
            preload="auto"
            autoPlay
            playsInline
            onEnded={moveToNext}
            onError={() => moveToNext()}
            className="w-full h-full object-cover"
          />
        ) : mediaA ? (
          <img
            src={getDisplayUrl(mediaA.item.url)}
            onError={() => moveToNext()}
            className="w-full h-full object-cover"
            alt=""
          />
        ) : null}
      </div>

      {/* Layer B */}
      <div 
        className={`absolute inset-0 transition-all duration-800 ease-in-out ${
          activeLayer === "B" ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"
        }`}
        style={{ willChange: 'opacity, transform' }}
      >
        {mediaB?.item.type === "video" ? (
          <video
            ref={videoBRef}
            src={getDisplayUrl(mediaB.item.url)}
            muted={volume === 0}
            preload="auto"
            autoPlay
            playsInline
            onEnded={moveToNext}
            onError={() => moveToNext()}
            className="w-full h-full object-cover"
          />
        ) : mediaB ? (
          <img
            src={getDisplayUrl(mediaB.item.url)}
            onError={() => moveToNext()}
            className="w-full h-full object-cover"
            alt=""
          />
        ) : null}
      </div>
    </div>
  );
}
