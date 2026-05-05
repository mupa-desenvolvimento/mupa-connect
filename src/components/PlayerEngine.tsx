import { useEffect, useState, useRef, useCallback } from "react";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  
  // Refs para controle de estado sem disparar renders desnecessários
  const isSwitchingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  
  // Elementos de mídia
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sincronizar playlist
  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  /**
   * Função centralizada para avançar a mídia (CONTROLE ÚNICO)
   */
  const nextMedia = useCallback((reason: string = "timer") => {
    if (isSwitchingRef.current || !playlistRef.current.length) return;
    
    isSwitchingRef.current = true;
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    console.log(`[PlayerEngine] NEXT TRIGGER. Reason: ${reason} | Elapsed: ${elapsed}ms`);
    
    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "transition_start", {
        reason,
        current_index: currentIndexRef.current,
        elapsed,
        timestamp: new Date().toISOString()
      });
    }

    const nextIdx = (currentIndexRef.current + 1) % playlistRef.current.length;
    currentIndexRef.current = nextIdx;
    startTimeRef.current = Date.now();
    
    const nextLayer = activeLayer === "A" ? "B" : "A";
    
    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "media_transition", {
        from: playlistRef.current[currentIndex]?.name,
        to: playlistRef.current[nextIdx]?.name,
        reason
      });
    }

    setCurrentIndex(nextIdx);
    setActiveLayer(nextLayer);
    onMediaChange?.(nextIdx);

    setTimeout(() => {
      isSwitchingRef.current = false;
    }, 500);
  }, [activeLayer, currentIndex, onMediaChange, serial]);

  const startDisplayTimer = useCallback((duration: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const finalDuration = Math.max(duration || 5, 3);
    console.log(`[PlayerEngine] DURATION: ${finalDuration}s`);
    
    timerRef.current = setTimeout(() => {
      nextMedia("display_timer");
    }, finalDuration * 1000);
  }, [nextMedia]);

  useEffect(() => {
    if (!playlist.length) return;
    const media = playlist[currentIndex];
    if (!media || !media.url) {
      console.warn("[PlayerEngine] Midia invalida ou sem URL, pulando...");
      nextMedia("invalid_url");
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);

    console.log(`[PlayerEngine] START: ${currentIndex} | ${media.name}`);
    
    const LOAD_TIMEOUT = 10000; // 10 segundos para carregar
    loadTimerRef.current = setTimeout(() => {
      console.warn(`[PlayerEngine] LOAD TIMEOUT: ${media.name}`);
      if (serial) FirebaseRealtimeService.logEvent(serial, "load_timeout", { media: media.name });
      nextMedia("load_timeout");
    }, LOAD_TIMEOUT);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [currentIndex, playlist, nextMedia, serial]);

  // Watchdog de segurança (CRÍTICO para WebView)
  // Verifica se o tempo real decorrido excedeu a duração da mídia + margem de erro
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (isSwitchingRef.current) return;
      
      const media = playlistRef.current[currentIndexRef.current];
      if (!media) return;

      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const duration = Math.max(media.duration || 5, 3);
      const threshold = (duration * 1000) + 15000; // Duração + 15 segundos de folga para watchdog pesado

      // 1. Recuperação de Vídeo Travado
      if (media.type === "video" && videoRef.current) {
        if (videoRef.current.paused && !videoRef.current.ended && videoRef.current.readyState > 2) {
          console.warn("[PlayerEngine] Vídeo pausado inesperadamente, tentando play...");
          videoRef.current.play().catch(() => nextMedia("watchdog_video_fail"));
        }
      }

      // 2. Recuperação de Travamento Lógico (Time-based)
      if (elapsed > threshold) {
        console.error(`[PlayerEngine] !!! WATCHDOG TRIGGER !!! Forçando avanço. Motivo: ${media.name} travado.`);
        if (serial) {
          FirebaseRealtimeService.logEvent(serial, "watchdog_force_next", {
            media: media.name,
            elapsed,
            threshold
          });
        }
        nextMedia("watchdog_timeout");
      }
    }, 3000);

    return () => clearInterval(watchdog);
  }, [nextMedia, serial]);

  if (!playlist.length) return null;

  const currentMedia = playlist[currentIndex];

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Camada Unificada de Exibição */}
      <div 
        key={`layer-${activeLayer}-${currentIndex}`}
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-in-out animate-fade-in",
          "opacity-100 z-10"
        )}
      >
        {!currentMedia?.url ? (
          <div className="w-full h-full bg-black flex items-center justify-center text-white/20 font-mono text-xs">
            URL INVALIDA
          </div>
        ) : currentMedia.type === "video" ? (
          <video
            key={`video-${currentIndex}`}
            ref={videoRef}
            src={currentMedia.url}
            autoPlay
            muted={volume === 0}
            playsInline
            className="w-full h-full object-cover"
            onLoadStart={() => {
              if (serial) FirebaseRealtimeService.logEvent(serial, "video_load_start", { media: currentMedia.name });
            }}
            onCanPlay={() => {
              if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
                loadTimerRef.current = null;
              }
              if (serial) FirebaseRealtimeService.logEvent(serial, "video_can_play", { media: currentMedia.name });
            }}
            onEnded={() => nextMedia("video_ended")}
            onError={(e) => {
              console.error("[PlayerEngine] Video error:", currentMedia.url);
              if (serial) FirebaseRealtimeService.logEvent(serial, "video_error", { media: currentMedia.name, url: currentMedia.url });
              nextMedia("video_error");
            }}
          />
        ) : (
          <img
            key={`img-${currentIndex}`}
            src={currentMedia.url}
            className="w-full h-full object-cover"
            alt=""
            onLoad={() => {
              if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
                loadTimerRef.current = null;
              }
              if (serial) FirebaseRealtimeService.logEvent(serial, "image_load_success", { media: currentMedia.name });
              startDisplayTimer(currentMedia.duration);
            }}
            onError={() => {
              console.error("[PlayerEngine] Erro ao carregar mídia:", currentMedia.url);
              if (serial) FirebaseRealtimeService.logEvent(serial, "image_error", { media: currentMedia.name, url: currentMedia.url });
              nextMedia("image_error");
            }}
          />
        )}
      </div>

      {/* Pré-carregamento da próxima mídia (Opcional/Oculto) */}
      <div className="hidden">
        {playlist[(currentIndex + 1) % playlist.length]?.type === "image" && (
          <img src={playlist[(currentIndex + 1) % playlist.length].url} alt="" />
        )}
      </div>
    </div>
  );
}
