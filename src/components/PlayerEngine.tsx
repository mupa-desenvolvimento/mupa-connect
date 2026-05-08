import { useEffect, useState, useRef, useCallback } from "react";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { MediaCacheService } from "@/components/PlayerServices";
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
  appearance?: {
    transition_type?: "fade" | "slide-left" | "slide-right" | "zoom" | "none";
    transition_duration?: number;
  };
}

export function PlayerEngine({ playlist, onMediaChange, volume = 0, serial, appearance }: PlayerEngineProps) {
  // Buffers A e B para Double Buffering
  const [bufferA, setBufferA] = useState<MediaItem | null>(null);
  const [bufferB, setBufferB] = useState<MediaItem | null>(null);
  const [activeBuffer, setActiveBuffer] = useState<"A" | "B">("A");
  
  // URL local (Blob) para evitar rede durante o play
  const [localUrlA, setLocalUrlA] = useState<string>("");
  const [localUrlB, setLocalUrlB] = useState<string>("");
  
  // Refs para controle preciso sem re-render (essencial para performance Android 9)
  const currentIndexRef = useRef(0);
  const nextIndexRef = useRef(1);
  const isTransitioningRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const playlistRef = useRef(playlist);
  
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar playlist e inicializar buffers com Blob URLs
  useEffect(() => {
    playlistRef.current = playlist;
    if (playlist.length > 0 && !bufferA && !bufferB) {
      const init = async () => {
        const firstMedia = playlist[0];
        const firstUrl = await MediaCacheService.getBlobUrl(firstMedia.url);
        setLocalUrlA(firstUrl);
        setBufferA(firstMedia);

        if (playlist.length > 1) {
          const secondMedia = playlist[1];
          const secondUrl = await MediaCacheService.getBlobUrl(secondMedia.url);
          setLocalUrlB(secondUrl);
          setBufferB(secondMedia);
        }
        
        currentIndexRef.current = 0;
        nextIndexRef.current = playlist.length > 1 ? 1 : 0;
      };
      init();
    }
  }, [playlist]);

  const preloadImage = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  };

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

    console.log(`[PlayerEngine] Swapping buffers: ${prevIndex} -> ${newIndex}. Next will be ${nextNextIndex}`);

    // Troca o buffer ativo
    const nextBuffer = activeBuffer === "A" ? "B" : "A";
    setActiveBuffer(nextBuffer);
    
    // Atualiza referências
    currentIndexRef.current = newIndex;
    nextIndexRef.current = nextNextIndex;
    startTimeRef.current = Date.now();

    // Callback de mudança
    onMediaChange?.(newIndex);

    // Logs
    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "media_transition", {
        from: playlistRef.current[prevIndex]?.name,
        to: playlistRef.current[newIndex]?.name,
        index: newIndex
      });
    }

    // Prepara o próximo buffer em background após o fade usando Blob local
    if (preloadTimeoutRef.current) clearTimeout(preloadTimeoutRef.current);
    preloadTimeoutRef.current = setTimeout(async () => {
      const nextMedia = playlistRef.current[nextNextIndex];
      const nextLocalUrl = await MediaCacheService.getBlobUrl(nextMedia.url);
      
      if (nextBuffer === "A") {
        setLocalUrlB(nextLocalUrl);
        setBufferB(nextMedia); // Prepara B enquanto A está visível
      } else {
        setLocalUrlA(nextLocalUrl);
        setBufferA(nextMedia); // Prepara A enquanto B está visível
      }
      isTransitioningRef.current = false;
    }, 500);

  }, [activeBuffer, onMediaChange, serial]);

  // Controle de tempo de exibição
  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const currentMedia = playlistRef.current[currentIndexRef.current];
    if (!currentMedia) return;

    if (currentMedia.type === "image") {
      timeoutRef.current = setTimeout(() => {
        swapBuffers();
      }, currentMedia.duration * 1000);
    }
    // Vídeos são controlados pelo evento onEnded

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [activeBuffer, swapBuffers]);

  // Segurança: Watchdog (5s de timeout se a mídia não carregar ou travar)
  useEffect(() => {
    const watchdog = setInterval(() => {
      const now = Date.now();
      const currentMedia = playlistRef.current[currentIndexRef.current];
      if (!currentMedia) return;

      const elapsed = now - startTimeRef.current;
      const maxDuration = (currentMedia.duration * 1000) + 5000; // 5s de margem

      if (elapsed > maxDuration) {
        console.warn("[PlayerEngine] Watchdog triggered - media stuck or failed to load");
        swapBuffers();
      }
    }, 2000);

    return () => clearInterval(watchdog);
  }, [swapBuffers]);

  if (!playlist.length) return null;

  const renderMedia = (media: MediaItem | null, bufferId: "A" | "B", isActive: boolean) => {
    if (!media) return null;

    const isVideo = media.type === "video";
    const videoRef = bufferId === "A" ? videoARef : videoBRef;
    const localUrl = bufferId === "A" ? localUrlA : localUrlB;

    return (
      <div 
        className={cn(
          "player-layer player-gpu-accel",
          isActive ? "opacity-100 z-10" : "opacity-0 z-0"
        )}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={localUrl}
            muted={volume === 0}
            playsInline
            preload="auto"
            className="w-full h-full object-cover player-gpu-accel"
            onCanPlayThrough={() => {
              if (isActive) {
                videoRef.current?.play().catch(console.error);
              }
            }}
            onEnded={() => {
              if (isActive) swapBuffers();
            }}
            onError={() => {
              if (isActive) swapBuffers();
            }}
          />
        ) : (
          <img
            src={localUrl}
            alt=""
            className="w-full h-full object-cover player-gpu-accel"
            onError={() => {
              if (isActive) swapBuffers();
            }}
          />
        )}
      </div>
    );
  };

  // Efeito para dar play no vídeo quando o buffer se torna ativo
  useEffect(() => {
    if (activeBuffer === "A" && bufferA?.type === "video" && videoARef.current) {
      videoARef.current.play().catch(console.error);
    } else if (activeBuffer === "B" && bufferB?.type === "video" && videoBRef.current) {
      videoBRef.current.play().catch(console.error);
    }
  }, [activeBuffer, bufferA, bufferB]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden player-gpu-accel">
      {renderMedia(bufferA, "A", activeBuffer === "A")}
      {renderMedia(bufferB, "B", activeBuffer === "B")}
    </div>
  );
}
