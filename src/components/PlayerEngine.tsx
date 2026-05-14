import { useEffect, useState, useRef, useCallback, memo } from "react";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { MediaCacheService } from "@/components/PlayerServices";
import { cn } from "@/lib/utils";

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  duration: number;
  volume?: number;
  name: string;
}

interface PlayerEngineProps {
  playlist: MediaItem[];
  onMediaChange?: (index: number) => void;
  volume?: number;
  serial?: string;
  appearance?: {
    transition_type?: "fade" | "slide-left" | "slide-right" | "zoom" | "none";
    transition_duration?: number;
  };
}

// Sub-componente memoizado para evitar re-renders desnecessários de mídias pesadas
const MediaLayer = memo(({ 
  media, 
  localUrl, 
  isActive, 
  bufferId, 
  videoRef, 
  volume, 
  onEnded, 
  onError 
}: {
  media: MediaItem | null;
  localUrl: string;
  isActive: boolean;
  bufferId: "A" | "B";
  videoRef: React.RefObject<HTMLVideoElement>;
  volume: number;
  onEnded: () => void;
  onError: (e: any) => void;
}) => {
  if (!media || !localUrl) return null;

  const isVideo = media.type === "video";

  return (
    <div 
      className={cn(
        "player-layer player-gpu-accel",
        isActive ? "opacity-100 z-10" : "opacity-0 z-0"
      )}
      style={{
        transitionProperty: 'opacity',
        transitionDuration: '500ms',
        transitionTimingFunction: 'ease-in-out'
      }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={localUrl}
          muted={volume === 0}
          autoPlay={isActive}
          playsInline
          preload="auto"
          className="w-full h-full player-gpu-accel"
          style={{ objectFit: 'fill' }}
          onCanPlayThrough={() => {
            if (isActive && videoRef.current && videoRef.current.paused) {
              videoRef.current.play().catch(e => console.warn("[PlayerEngine] [Playback] Video play failed", e));
            }
          }}
          onEnded={onEnded}
          onError={onError}
        />
      ) : (
        <img
          src={localUrl}
          alt=""
          className="w-full h-full player-gpu-accel"
          style={{ objectFit: 'fill' }}
          onError={onError}
        />
      )}
    </div>
  );
}, (prev, next) => {
  // Apenas re-renderiza se a mídia ou a URL mudar, ou se o estado de atividade mudar
  return prev.media?.id === next.media?.id && 
         prev.localUrl === next.localUrl && 
         prev.isActive === next.isActive &&
         prev.volume === next.volume;
});

MediaLayer.displayName = "MediaLayer";

export function PlayerEngine({ playlist, onMediaChange, volume = 0, serial, appearance }: PlayerEngineProps) {
  const [bufferA, setBufferA] = useState<MediaItem | null>(null);
  const [bufferB, setBufferB] = useState<MediaItem | null>(null);
  const [activeBuffer, setActiveBuffer] = useState<"A" | "B">("A");
  
  const [localUrlA, setLocalUrlA] = useState<string>("");
  const [localUrlB, setLocalUrlB] = useState<string>("");
  
  const currentIndexRef = useRef(0);
  const nextIndexRef = useRef(1);
  const isTransitioningRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const playlistRef = useRef(playlist);
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Safe Preload using Image objects as fallback for CORS issues
  const visualPreload = useCallback((url: string) => {
    if (!url) return;
    console.log(`[PlayerEngine] [Preload] Visual warming: ${url.split('/').pop()}`);
    const img = new Image();
    img.src = url; // Browsers handle this even without CORS for display
  }, []);

  useEffect(() => {
    const isFirstLoad = !bufferA && !bufferB;
    playlistRef.current = playlist;
    
    if (playlist.length > 0) {
      if (isFirstLoad) {
        const init = async () => {
          const firstMedia = playlist[0];
          console.log(`[PlayerEngine] [Playback] Initializing first media: ${firstMedia.name}`);
          const firstUrl = await MediaCacheService.getBlobUrl(firstMedia.url);
          setLocalUrlA(firstUrl);
          setBufferA(firstMedia);

          if (playlist.length > 1) {
            const secondMedia = playlist[1];
            console.log(`[PlayerEngine] [Preload] Preparing second media: ${secondMedia.name}`);
            const secondUrl = await MediaCacheService.getBlobUrl(secondMedia.url);
            setLocalUrlB(secondUrl);
            setBufferB(secondMedia);
            visualPreload(secondMedia.url);
          }
          
          currentIndexRef.current = 0;
          nextIndexRef.current = playlist.length > 1 ? 1 : 0;
        };
        init();
      } else {
        // Playlist updated while playing
        console.log(`[PlayerEngine] [Update] Playlist updated, new length: ${playlist.length}`);
        
        // Ensure indices are within bounds of new playlist
        if (currentIndexRef.current >= playlist.length) {
          currentIndexRef.current = 0;
        }
        nextIndexRef.current = getNextIndex(currentIndexRef.current);

        // Update the INACTIVE buffer with the next item from the NEW playlist
        const updateInactiveBuffer = async () => {
          const nextIndex = nextIndexRef.current;
          const nextMedia = playlist[nextIndex];
          if (!nextMedia) return;
          
          console.log(`[PlayerEngine] [Update] Buffering next item from new playlist: ${nextMedia.name}`);
          const nextUrl = await MediaCacheService.getBlobUrl(nextMedia.url);
          
          if (activeBuffer === "A") {
            setLocalUrlB(nextUrl);
            setBufferB(nextMedia);
          } else {
            setLocalUrlA(nextUrl);
            setBufferA(nextMedia);
          }
        };
        updateInactiveBuffer();
      }
    }
  }, [playlist, visualPreload]);

  const getNextIndex = (current: number) => {
    if (!playlistRef.current.length) return 0;
    return (current + 1) % playlistRef.current.length;
  };

  const swapBuffers = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    const prevIndex = currentIndexRef.current;
    const newIndex = nextIndexRef.current;
    const nextNextIndex = getNextIndex(newIndex);

    console.log(`[PlayerEngine] [Transition] ${prevIndex} -> ${newIndex}. Next will be ${nextNextIndex}`);

    const nextBuffer = activeBuffer === "A" ? "B" : "A";
    setActiveBuffer(nextBuffer);
    
    currentIndexRef.current = newIndex;
    nextIndexRef.current = nextNextIndex;
    startTimeRef.current = Date.now();

    onMediaChange?.(newIndex);

    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "media_transition", {
        from: playlistRef.current[prevIndex]?.name,
        to: playlistRef.current[newIndex]?.name,
        index: newIndex
      });
    }

    if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
    preloadTimeoutRef.current = setTimeout(async () => {
      const nextMedia = playlistRef.current[nextNextIndex];
      if (!nextMedia) {
        isTransitioningRef.current = false;
        return;
      }

      console.log(`[PlayerEngine] [Preload] Buffering next: ${nextMedia.name}`);
      const nextLocalUrl = await MediaCacheService.getBlobUrl(nextMedia.url);
      visualPreload(nextMedia.url);
      
      if (nextBuffer === "A") {
        setLocalUrlB(nextLocalUrl);
        setBufferB(nextMedia);
      } else {
        setLocalUrlA(nextLocalUrl);
        setBufferA(nextMedia);
      }
      isTransitioningRef.current = false;
    }, 800);

  }, [activeBuffer, onMediaChange, serial, visualPreload]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const currentMedia = playlistRef.current[currentIndexRef.current];
    if (!currentMedia) return;

    if (currentMedia.type === "image") {
      timeoutRef.current = setTimeout(() => {
        swapBuffers();
      }, Math.max(2, currentMedia.duration) * 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeBuffer, swapBuffers]);

  useEffect(() => {
    const watchdog = setInterval(() => {
      const now = Date.now();
      const currentMedia = playlistRef.current[currentIndexRef.current];
      if (!currentMedia) return;

      const elapsed = now - startTimeRef.current;
      const maxDuration = (currentMedia.duration * 1000) + 8000; 

      if (elapsed > maxDuration) {
        console.warn(`[PlayerEngine] [Watchdog] Stalled at ${currentMedia.name}. Forcing swap.`);
        swapBuffers();
      }
    }, 3000);

    return () => clearInterval(watchdog);
  }, [swapBuffers]);

  const handleMediaError = useCallback(() => {
    swapBuffers();
  }, [swapBuffers]);

  useEffect(() => {
    const playActiveVideo = async () => {
      try {
        if (activeBuffer === "A" && bufferA?.type === "video" && videoARef.current) {
          await videoARef.current.play();
        } else if (activeBuffer === "B" && bufferB?.type === "video" && videoBRef.current) {
          await videoBRef.current.play();
        }
      } catch (e) {
        console.warn("[PlayerEngine] [Playback] Autoplay prevented or failed", e);
      }
    };
    playActiveVideo();
  }, [activeBuffer, bufferA, bufferB]);

  if (!playlist.length) return null;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden player-gpu-accel">
      <MediaLayer 
        bufferId="A"
        media={bufferA}
        localUrl={localUrlA}
        isActive={activeBuffer === "A"}
        videoRef={videoARef}
        volume={bufferA?.volume ?? volume}
        onEnded={swapBuffers}
        onError={handleMediaError}
      />
      <MediaLayer 
        bufferId="B"
        media={bufferB}
        localUrl={localUrlB}
        isActive={activeBuffer === "B"}
        videoRef={videoBRef}
        volume={volume}
        onEnded={swapBuffers}
        onError={handleMediaError}
      />
    </div>
  );
}
