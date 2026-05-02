import { useEffect, useState, useRef, useCallback } from "react";
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
  appearance?: any;
}

const TRANSITION_TYPES = {
  fade: "opacity-100",
  "slide-left": "translate-x-0",
  "slide-right": "translate-x-0",
  zoom: "scale-100 opacity-100",
  none: "opacity-100"
};

const TRANSITION_HIDDEN = {
  fade: "opacity-0",
  "slide-left": "-translate-x-full",
  "slide-right": "translate-x-full",
  zoom: "scale-90 opacity-0",
  none: "opacity-0"
};

export function PlayerEngine({ playlist, onMediaChange, volume = 0, appearance = {} }: PlayerEngineProps) {
  const transitionType = appearance.transition_type || "fade";
  const transitionDuration = appearance.transition_duration || 600;
  // UI State - only used for rendering the layers
  const [layers, setLayers] = useState({
    active: "A" as "A" | "B",
    indexA: 0,
    indexB: 1,
    isTransitioning: false
  });
  
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});
  
  // Internal Control Refs (Single Source of Truth)
  const currentIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTransitioningRef = useRef(false);
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const preloadRef = useRef<Set<string>>(new Set());

  // Helper to get local URL
  const getDisplayUrl = useCallback((item: MediaItem) => {
    if (!item) return "";
    return mediaMap[item.url] || item.url;
  }, [mediaMap]);

  const startMedia = useCallback((index: number, layer: "A" | "B") => {
    const item = playlist[index];
    if (!item) return;

    console.log(`[PlayerEngine] media_start: ${item.name} (index: ${index}, layer: ${layer})`);
    
    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    if (item.type === "video") {
      const video = layer === "A" ? videoARef.current : videoBRef.current;
      if (video) {
        video.currentTime = 0;
        video.play()
          .then(() => {
            const safetyDuration = ((item.duration || 10) + 5) * 1000;
            timerRef.current = setTimeout(() => {
              console.warn("[PlayerEngine] Video safety timeout reached");
              moveToNext();
            }, safetyDuration);
          })
          .catch(err => {
            console.warn("[PlayerEngine] Video play failed, skipping in 2s", err);
            timerRef.current = setTimeout(moveToNext, 2000);
          });
      }
    } else {
      // For images, use the duration
      const duration = (item.duration || 10) * 1000;
      timerRef.current = setTimeout(moveToNext, duration);
    }
  }, [playlist]);

  const moveToNext = useCallback(() => {
    if (isTransitioningRef.current || !playlist.length) return;
    
    isTransitioningRef.current = true;
    const prevIndex = currentIndexRef.current;
    const nextIndex = (prevIndex + 1) % playlist.length;
    currentIndexRef.current = nextIndex;

    console.log(`[PlayerEngine] media_end: index ${prevIndex} -> next_index: ${nextIndex}`);

    const nextLayer = layers.active === "A" ? "B" : "A";

    // Update UI state for transition
    setLayers(prev => ({
      ...prev,
      active: nextLayer,
      [nextLayer === "A" ? "indexA" : "indexB"]: nextIndex,
      isTransitioning: true
    }));

    // Start the next media immediately (it should be preloaded)
    startMedia(nextIndex, nextLayer);

    // Notify parent
    onMediaChange?.(nextIndex);

    // Release transition lock after crossfade duration
    setTimeout(() => {
      isTransitioningRef.current = false;
      setLayers(prev => ({ ...prev, isTransitioning: false }));
    }, transitionDuration); 

  }, [playlist, layers.active, startMedia, onMediaChange, transitionDuration]);

  // Initial load and playlist changes
  useEffect(() => {
    if (!playlist.length) return;
    
    // Reset if playlist changes significantly (optional, but good for stability)
    currentIndexRef.current = 0;
    setLayers({
      active: "A",
      indexA: 0,
      indexB: 1 % playlist.length,
      isTransitioning: false
    });
    
    startMedia(0, "A");

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playlist.length]); // Only re-run if playlist length changes or it's first mount

  // Video Ended Event Handler
  const handleVideoEnded = useCallback(() => {
    console.log("[PlayerEngine] Video ended naturally");
    moveToNext();
  }, [moveToNext]);

  // Preloading Logic
  useEffect(() => {
    if (!playlist.length) return;

    const preloadNext = async () => {
      const nextIdx = (currentIndexRef.current + 1) % playlist.length;
      const nextItem = playlist[nextIdx];
      
      if (nextItem && !preloadRef.current.has(nextItem.url)) {
        preloadRef.current.add(nextItem.url);
        try {
          await MediaCacheService.cacheMedia(nextItem.url);
          const blobUrl = await MediaCacheService.getBlobUrl(nextItem.url);
          setMediaMap(prev => ({ ...prev, [nextItem.url]: blobUrl }));
        } catch (err) {
          console.warn("[PlayerEngine] Preload failed", nextItem.url, err);
        }
      }
    };

    preloadNext();
    
    // Also background cache everything else
    const idleTask = (window as any).requestIdleCallback || ((fn: any) => setTimeout(fn, 5000));
    idleTask(() => {
      playlist.forEach(item => {
        if (!mediaMap[item.url]) {
          MediaCacheService.cacheMedia(item.url).catch(() => {});
        }
      });
    });
  }, [layers.active, playlist, mediaMap]);

  const handleError = useCallback((index: number) => {
    console.error(`[PlayerEngine] Media error at index ${index}`);
    // If current media fails, skip it
    if (index === currentIndexRef.current) {
      moveToNext();
    }
  }, [moveToNext]);

  if (!playlist.length) return null;

  const mediaA = playlist[layers.indexA];
  const mediaB = playlist[layers.indexB];

  const getTransitionStyle = (isActive: boolean) => {
    const base = "absolute inset-0 transition-all ease-in-out";
    const duration = `duration-${transitionDuration}`;
    const state = isActive ? TRANSITION_TYPES[transitionType as keyof typeof TRANSITION_TYPES] || TRANSITION_TYPES.fade : TRANSITION_HIDDEN[transitionType as keyof typeof TRANSITION_HIDDEN] || TRANSITION_HIDDEN.fade;
    const zIndex = isActive ? "z-10" : "z-0";
    
    return `${base} ${duration} ${state} ${zIndex}`;
  };

  const getLogoPosition = () => {
    const pos = appearance.logo?.position || "top-left";
    const base = "absolute m-6 pointer-events-none z-50";
    switch(pos) {
      case "top-right": return `${base} top-0 right-0`;
      case "bottom-left": return `${base} bottom-0 left-0`;
      case "bottom-right": return `${base} bottom-0 right-0`;
      default: return `${base} top-0 left-0`;
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Layer A */}
      <div 
        className={getTransitionStyle(layers.active === "A")}
        style={{ transitionDuration: `${transitionDuration}ms`, willChange: 'opacity, transform' }}
      >
        {mediaA?.type === "video" ? (
          <video
            ref={videoARef}
            src={getDisplayUrl(mediaA)}
            muted={volume === 0}
            onEnded={handleVideoEnded}
            onError={() => handleError(layers.indexA)}
            playsInline
            autoPlay
            preload="auto"
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={getDisplayUrl(mediaA)}
            onError={() => handleError(layers.indexA)}
            className="w-full h-full object-cover"
            alt=""
          />
        )}
      </div>

      {/* Layer B */}
      <div 
        className={getTransitionStyle(layers.active === "B")}
        style={{ transitionDuration: `${transitionDuration}ms`, willChange: 'opacity, transform' }}
      >
        {mediaB?.type === "video" ? (
          <video
            ref={videoBRef}
            src={getDisplayUrl(mediaB)}
            muted={volume === 0}
            onEnded={handleVideoEnded}
            onError={() => handleError(layers.indexB)}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={getDisplayUrl(mediaB)}
            onError={() => handleError(layers.indexB)}
            className="w-full h-full object-cover"
            alt=""
          />
        )}
      </div>

      {/* FOOTER OVERLAY */}
      {appearance.footer?.enabled && (
        <div 
          className="absolute bottom-0 left-0 right-0 z-[60] flex items-center justify-center px-10 text-center font-display font-bold uppercase tracking-widest overflow-hidden"
          style={{ 
            height: `${appearance.footer.height || 60}px`,
            backgroundColor: appearance.footer.background_color || "rgba(0,0,0,0.6)",
            color: appearance.footer.text_color || "#ffffff",
            fontSize: `${(appearance.footer.height || 60) * 0.4}px`
          }}
        >
          {appearance.footer.text}
        </div>
      )}

      {/* LOGO OVERLAY */}
      {appearance.logo?.enabled && appearance.logo?.url && (
        <div className={getLogoPosition()}>
          <img 
            src={appearance.logo.url} 
            alt="Logo"
            style={{ 
              width: `${appearance.logo.size || 80}px`,
              opacity: appearance.logo.opacity ?? 1,
            }}
            className="h-auto object-contain"
          />
        </div>
      )}
    </div>
  );
}
