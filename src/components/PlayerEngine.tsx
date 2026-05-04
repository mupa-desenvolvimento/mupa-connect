import { useEffect, useState, useRef, useCallback } from "react";
import { MediaCacheService } from "./PlayerServices";

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
}

export function PlayerEngine({ playlist, onMediaChange, volume = 0 }: PlayerEngineProps) {
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [mediaA, setMediaA] = useState<{ item: MediaItem; index: number } | null>(null);
  const [mediaB, setMediaB] = useState<{ item: MediaItem; index: number } | null>(null);
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  const [isTransitioning, setIsTransitioning] = useState(false);

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
  const prepareMedia = useCallback(async (item: MediaItem) => {
    if (!item?.url) return;
    try {
      await MediaCacheService.cacheMedia(item.url);
      const blobUrl = await MediaCacheService.getBlobUrl(item.url);
      setMediaMap(prev => ({ ...prev, [item.url]: blobUrl }));
    } catch (err) {
      console.warn("[PlayerEngine] Prepare failed", item.url, err);
    }
  }, []);

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
      
      // Prepare the NEXT media item for the now inactive layer
      const nextNextIndex = (nextIndex + 1) % currentPlaylist.length;
      const nextNextItem = currentPlaylist[nextNextIndex];

      if (newActiveLayer === "A") {
        setMediaB({ item: nextNextItem, index: nextNextIndex });
        prepareMedia(nextNextItem);
      } else {
        setMediaA({ item: nextNextItem, index: nextNextIndex });
        prepareMedia(nextNextItem);
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
      video.play().catch(err => {
        console.warn("[PlayerEngine] Play error, skipping in 2s", err);
        timerRef.current = setTimeout(moveToNext, 2000);
      });
      
      // Safety timeout
      const safetyDuration = ((currentMedia.item.duration || 10) + 5) * 1000;
      timerRef.current = setTimeout(() => {
        console.warn("[PlayerEngine] Video safety timeout reached");
        moveToNext();
      }, safetyDuration);
    } else {
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
      // This allows seamless manifest updates
      if (mediaA || mediaB) {
        console.log("[PlayerEngine] Playlist updated, continuing playback...");
        return;
      }

      currentIndexRef.current = 0;
      const item0 = playlist[0];
      const item1 = playlist[1 % playlist.length];

      // Prepare both immediately
      await Promise.all([prepareMedia(item0), prepareMedia(item1)]);

      setMediaA({ item: item0, index: 0 });
      setMediaB({ item: item1, index: 1 % playlist.length });
      setActiveLayer("A");
      onMediaChange?.(0);
    };

    init();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playlist.length]);

  if (!playlist.length) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
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
