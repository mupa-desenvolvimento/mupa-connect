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

/**
 * PlayerEngine implements a seamless playback system using A/B buffering.
 * It strictly follows professional streaming patterns to eliminate flicker and black screens.
 */
export function PlayerEngine({ playlist, onMediaChange, volume = 0, serial }: PlayerEngineProps) {
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  
  // States to hold the current items assigned to each layer
  const [itemA, setItemA] = useState<MediaItem | null>(null);
  const [itemB, setItemB] = useState<MediaItem | null>(null);
  
  // Media source URLs (blob or remote)
  const [srcA, setSrcA] = useState<string>("");
  const [srcB, setSrcB] = useState<string>("");

  const [isReady, setIsReady] = useState(false);

  // Refs for precise control without re-renders
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTransitionTimeRef = useRef<number>(Date.now());
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);

  const isTransitioningRef = useRef(false);
  const readyToSwitchRef = useRef<Record<string, boolean>>({ A: false, B: false });
  const loadingStatusRef = useRef<Record<string, boolean>>({ A: false, B: false });

  // Sync playlist ref
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  /**
   * GPU Optimized styles for seamless transitions
   */
  const getLayerStyle = (layer: "A" | "B"): React.CSSProperties => {
    const isActive = activeLayer === layer;
    return {
      opacity: isActive ? 1 : 0,
      visibility: isActive ? "visible" : "hidden",
      zIndex: isActive ? 10 : 0,
      transition: "opacity 400ms ease-in-out, visibility 400ms ease-in-out",
      willChange: "opacity",
      transform: "translateZ(0)",
      backfaceVisibility: "hidden",
      position: "absolute",
      inset: 0
    };
  };

  const getMediaStyle = (): React.CSSProperties => ({
    width: "100%",
    height: "100%",
    objectFit: "cover",
    willChange: "opacity",
    transform: "translateZ(0)",
    backfaceVisibility: "hidden"
  });

  /**
   * Warm up the decoder for a video element to prevent delay/black frame on start.
   */
  const warmUpDecoder = async (video: HTMLVideoElement | null) => {
    if (!video) return;
    try {
      video.muted = true;
      await video.play();
      video.pause();
      video.currentTime = 0;
      // Note: We keep it muted during transition if volume is 0
    } catch (err) {
      console.warn("[PlayerEngine] Decoder warm-up failed", err);
    }
  };

  /**
   * Transition logic from current active layer to the next.
   */
  const performTransition = useCallback(() => {
    const nextLayer = activeLayer === "A" ? "B" : "A";
    
    if (isTransitioningRef.current || !playlistRef.current.length) return;

    console.log(`[PlayerEngine] Attempting transition to ${nextLayer}. Index: ${currentIndexRef.current}`);

    // Safety Fallback: If next layer is not ready, we delay the transition
    // and try again in 100ms. This prevents black screens.
    if (!readyToSwitchRef.current[nextLayer]) {
      console.warn(`[PlayerEngine] Next layer (${nextLayer}) not ready. Retrying in 100ms...`);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(performTransition, 100);
      return;
    }

    isTransitioningRef.current = true;
    lastTransitionTimeRef.current = Date.now();
    
    const nextVideo = nextLayer === "A" ? videoARef.current : videoBRef.current;
    const nextItem = nextLayer === "A" ? itemA : itemB;
    
    // 1. Start playback of next layer while still hidden
    if (nextItem?.type === "video" && nextVideo) {
      nextVideo.muted = volume === 0;
      nextVideo.play().catch(err => {
        console.warn("[PlayerEngine] Play failed during transition", err);
      });
    }

    // 2. Trigger Crossfade
    setActiveLayer(nextLayer);

    // 3. Update index and notify parent
    currentIndexRef.current = (currentIndexRef.current + 1) % playlistRef.current.length;
    onMediaChange?.(currentIndexRef.current);

    // 4. Cleanup and prepare NEXT buffer after transition ends
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      prepareNextBuffer();
    }, 450);
  }, [activeLayer, itemA, itemB, volume, onMediaChange]);

  /**
   * Watchdog mechanism to prevent getting stuck
   */
  const startWatchdog = useCallback((durationMs: number) => {
    if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    
    // Safety buffer: watchdog triggers 5 seconds after expected transition
    const timeout = durationMs + 5000;
    
    watchdogTimerRef.current = setTimeout(() => {
      console.warn("[PlayerEngine] Watchdog triggered! Forcing transition to prevent freeze.");
      // Ensure the next layer is marked as ready if it was stuck
      const inactiveLayer = activeLayer === "A" ? "B" : "A";
      readyToSwitchRef.current[inactiveLayer] = true;
      performTransition();
    }, timeout);
  }, [activeLayer, performTransition]);

  /**
   * Prepare the inactive layer with the next media item in the playlist.
   */
  const prepareNextBuffer = async () => {
    const inactiveLayer = activeLayer === "A" ? "B" : "A";
    const currentPlaylist = playlistRef.current;
    const nextIndex = (currentIndexRef.current + 1) % currentPlaylist.length;
    const nextItem = currentPlaylist[nextIndex];

    if (!nextItem) return;

    readyToSwitchRef.current[inactiveLayer] = false;
    loadingStatusRef.current[inactiveLayer] = false;

    // Fallback for loading timeout
    const loadTimeout = setTimeout(() => {
      if (!loadingStatusRef.current[inactiveLayer]) {
        console.warn(`[PlayerEngine] Buffer loading timed out for layer ${inactiveLayer}. Forcing ready state.`);
        readyToSwitchRef.current[inactiveLayer] = true;
      }
    }, 8000); // 8 seconds load timeout

    try {
      const blobUrl = await MediaCacheService.getBlobUrl(nextItem.url);
      const finalUrl = blobUrl || nextItem.url;

      if (inactiveLayer === "A") {
        setItemA(nextItem);
        setSrcA(finalUrl);
      } else {
        setItemB(nextItem);
        setSrcB(finalUrl);
      }

      if (nextItem.type === "image") {
        const img = new Image();
        img.src = finalUrl;
        img.onload = () => {
          clearTimeout(loadTimeout);
          loadingStatusRef.current[inactiveLayer] = true;
          readyToSwitchRef.current[inactiveLayer] = true;
        };
        img.onerror = () => {
          clearTimeout(loadTimeout);
          console.warn("[PlayerEngine] Image load failed, skipping to ready.");
          readyToSwitchRef.current[inactiveLayer] = true;
        };
      } else {
        // For videos, canplaythrough will clear the timeout
        (window as any)[`loadTimeout${inactiveLayer}`] = loadTimeout;
      }
    } catch (err) {
      clearTimeout(loadTimeout);
      console.error("[PlayerEngine] Buffer preparation failed", err);
      readyToSwitchRef.current[inactiveLayer] = true;
    }
  };

  useEffect(() => {
    if (!isReady) return;

    const currentItem = activeLayer === "A" ? itemA : itemB;
    const currentVideo = activeLayer === "A" ? videoARef.current : videoBRef.current;
    
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentItem?.type === "video" && currentVideo) {
      const duration = (currentItem.duration || 10) * 1000;
      const transitionPoint = Math.max(0, duration - 300);
      
      console.log(`[PlayerEngine] Scheduling video transition in ${transitionPoint}ms`);
      timerRef.current = setTimeout(performTransition, transitionPoint);
      startWatchdog(duration);
    } else if (currentItem) {
      const duration = (currentItem.duration || 10) * 1000;
      const transitionPoint = Math.max(0, duration - 300);
      
      console.log(`[PlayerEngine] Scheduling image transition in ${transitionPoint}ms`);
      timerRef.current = setTimeout(performTransition, transitionPoint);
      startWatchdog(duration);
    }
  }, [activeLayer, itemA, itemB, isReady, performTransition, startWatchdog]);

  /**
   * Initialization
   */
  useEffect(() => {
    if (!playlist.length) return;

    const init = async () => {
      currentIndexRef.current = 0;
      const item0 = playlist[0];
      const item1 = playlist[1 % playlist.length];

      // Prepare Layer A
      const blob0 = await MediaCacheService.getBlobUrl(item0.url);
      setSrcA(blob0 || item0.url);
      setItemA(item0);

      // Prepare Layer B
      const blob1 = await MediaCacheService.getBlobUrl(item1.url);
      setSrcB(blob1 || item1.url);
      setItemB(item1);

      setIsReady(true);
      onMediaChange?.(0);
      if (serial) {
        MediaCacheService.logPerformance(serial, 'engine_init', 'Engine Profissional Reiniciada (Seamless Mode)', { playlist_size: playlist.length });
      }
    };

    init();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
    };
  }, [playlist.length, serial]);

  if (!playlist.length) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Buffer Layer A */}
      <div style={getLayerStyle("A")}>
        {itemA?.type === "video" ? (
          <video
            ref={videoARef}
            src={srcA}
            muted={volume === 0}
            preload="auto"
            playsInline
            style={getMediaStyle()}
            onCanPlayThrough={(e) => {
              const timeout = (window as any).loadTimeoutA;
              if (timeout) clearTimeout(timeout);
              loadingStatusRef.current.A = true;
              readyToSwitchRef.current.A = true;
              if (activeLayer === "B") warmUpDecoder(e.currentTarget);
              e.currentTarget.style.transform = "translateZ(0)";
            }}
            onError={performTransition}
          />
        ) : srcA ? (
          <img
            ref={imgARef}
            src={srcA}
            style={getMediaStyle()}
            alt=""
            onLoad={(e) => {
              (e.currentTarget as HTMLImageElement).style.transform = "translateZ(0)";
            }}
            onError={performTransition}
          />
        ) : null}
      </div>

      {/* Buffer Layer B */}
      <div style={getLayerStyle("B")}>
        {itemB?.type === "video" ? (
          <video
            ref={videoBRef}
            src={srcB}
            muted={volume === 0}
            preload="auto"
            playsInline
            style={getMediaStyle()}
            onCanPlayThrough={(e) => {
              const timeout = (window as any).loadTimeoutB;
              if (timeout) clearTimeout(timeout);
              loadingStatusRef.current.B = true;
              readyToSwitchRef.current.B = true;
              if (activeLayer === "A") warmUpDecoder(e.currentTarget);
              e.currentTarget.style.transform = "translateZ(0)";
            }}
            onError={performTransition}
          />
        ) : srcB ? (
          <img
            ref={imgBRef}
            src={srcB}
            style={getMediaStyle()}
            alt=""
            onLoad={(e) => {
              (e.currentTarget as HTMLImageElement).style.transform = "translateZ(0)";
            }}
            onError={performTransition}
          />
        ) : null}
      </div>

      {/* Fallback protection - Ensuring we never have a black screen if something breaks */}
      {!isReady && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
           <div className="animate-pulse text-white/20 font-mono text-[10px] uppercase tracking-widest">
             Sincronizando...
           </div>
        </div>
      )}
    </div>
  );
}
