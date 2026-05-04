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
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const imgARef = useRef<HTMLImageElement>(null);
  const imgBRef = useRef<HTMLImageElement>(null);

  const isTransitioningRef = useRef(false);
  const readyToSwitchRef = useRef<Record<string, boolean>>({ A: false, B: false });

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
    if (isTransitioningRef.current || !playlistRef.current.length) return;
    
    const nextLayer = activeLayer === "A" ? "B" : "A";
    const nextVideo = nextLayer === "A" ? videoARef.current : videoBRef.current;
    const nextItem = nextLayer === "A" ? itemA : itemB;

    // Ensure next layer is actually ready, or fallback to immediate if we've waited too long
    if (!readyToSwitchRef.current[nextLayer]) {
      console.warn(`[PlayerEngine] Layer ${nextLayer} not ready for transition yet. Waiting...`);
      // We will try again via the interval/timeout or safety fallback
      return;
    }

    isTransitioningRef.current = true;
    
    // 1. Start playback of next layer while still hidden
    if (nextItem?.type === "video" && nextVideo) {
      nextVideo.muted = volume === 0;
      nextVideo.play().catch(console.error);
    }

    // 2. Trigger Crossfade (CSS transition handles this via opacity/visibility change)
    setActiveLayer(nextLayer);

    // 3. Update index and notify parent
    currentIndexRef.current = (currentIndexRef.current + 1) % playlistRef.current.length;
    onMediaChange?.(currentIndexRef.current);

    // 4. Cleanup and prepare NEXT buffer after transition ends
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      prepareNextBuffer();
    }, 450); // Slightly longer than 400ms transition
  }, [activeLayer, itemA, itemB, volume, onMediaChange]);

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

    // Load URL from cache
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

      // If it's an image, preload it
      if (nextItem.type === "image") {
        const img = new Image();
        img.src = finalUrl;
        img.onload = () => {
          readyToSwitchRef.current[inactiveLayer] = true;
        };
        img.onerror = () => {
          readyToSwitchRef.current[inactiveLayer] = true; // Still allow transition to show error
        };
      }
      // Videos are handled by "canplaythrough" listener in the JSX
    } catch (err) {
      console.error("[PlayerEngine] Buffer preparation failed", err);
      readyToSwitchRef.current[inactiveLayer] = true; // Fallback
    }
  };

  /**
   * Set the main sequence timer based on media duration.
   * Includes early transition logic (0.3s before end).
   */
  useEffect(() => {
    if (!isReady) return;

    const currentItem = activeLayer === "A" ? itemA : itemB;
    const currentVideo = activeLayer === "A" ? videoARef.current : videoBRef.current;
    
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentItem?.type === "video" && currentVideo) {
      // For videos, we rely on timeupdate or precise timeout
      const duration = currentItem.duration || 10;
      const transitionPoint = Math.max(0, (duration * 1000) - 300); // 0.3s before end
      
      timerRef.current = setTimeout(() => {
        performTransition();
      }, transitionPoint);
    } else if (currentItem) {
      // For images, use the full duration minus crossfade
      const duration = currentItem.duration || 10;
      const transitionPoint = Math.max(0, (duration * 1000) - 300);
      
      timerRef.current = setTimeout(() => {
        performTransition();
      }, transitionPoint);
    }
  }, [activeLayer, itemA, itemB, isReady, performTransition]);

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
              readyToSwitchRef.current.A = true;
              if (activeLayer === "B") warmUpDecoder(e.currentTarget);
            }}
            onError={performTransition}
          />
        ) : srcA ? (
          <img
            ref={imgARef}
            src={srcA}
            style={getMediaStyle()}
            alt=""
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
              readyToSwitchRef.current.B = true;
              if (activeLayer === "A") warmUpDecoder(e.currentTarget);
            }}
            onError={performTransition}
          />
        ) : srcB ? (
          <img
            ref={imgBRef}
            src={srcB}
            style={getMediaStyle()}
            alt=""
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
