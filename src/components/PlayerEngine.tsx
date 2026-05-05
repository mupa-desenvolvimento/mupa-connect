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
}

export function PlayerEngine({ playlist, onMediaChange, volume = 0, serial }: PlayerEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  
  // Refs para controle de estado sem disparar renders desnecessários
  const isSwitchingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playlistRef = useRef(playlist);
  const currentIndexRef = useRef(0);
  
  // Elementos de mídia
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextLayerRef = useRef<"A" | "B">("B");

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
    console.log(`[PlayerEngine] Next media trigger. Motivo: ${reason}`);
    
    // Log detalhado de carregamento e transição
    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "transition_start", {
        reason,
        current_index: currentIndexRef.current,
        timestamp: new Date().toISOString()
      });
    }

    const nextIdx = (currentIndexRef.current + 1) % playlistRef.current.length;
    currentIndexRef.current = nextIdx;
    
    // Troca de camada para transição suave
    const nextLayer = activeLayer === "A" ? "B" : "A";
    
    // Log para monitoramento
    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "media_transition", {
        from: playlistRef.current[currentIndex]?.name,
        to: playlistRef.current[nextIdx]?.name,
        reason
      });
    }

    // Atualiza estado do React
    setCurrentIndex(nextIdx);
    setActiveLayer(nextLayer);
    onMediaChange?.(nextIdx);

    // Reset da trava de segurança após um pequeno delay (tempo da transição CSS)
    setTimeout(() => {
      isSwitchingRef.current = false;
    }, 500);
  }, [activeLayer, currentIndex, onMediaChange, serial]);

  /**
   * Inicia a execução da mídia atual
   */
  useEffect(() => {
    if (!playlist.length) return;

    const media = playlist[currentIndex];
    if (!media) return;

    // Limpa qualquer timer anterior (GARANTIA DE TIMER ÚNICO)
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    console.log(`[PlayerEngine] Start media: [${currentIndex}] ${media.name} (${media.type})`);

    // Se for imagem, define timer de saída
    if (media.type === "image") {
      const duration = Math.max(media.duration || 5, 3);
      timerRef.current = setTimeout(() => {
        nextMedia("image_timer");
      }, duration * 1000);
    }

    // Heartbeat para o painel
    if (serial) {
      FirebaseRealtimeService.sendHeartbeat(serial, media.id, "playing");
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, playlist, nextMedia, serial]);

  // Watchdog de segurança (CRÍTICO para WebView)
  // Verifica se o tempo real decorrido excedeu a duração da mídia + margem de erro
  useEffect(() => {
    const lastTransitionRef = { time: Date.now() };
    
    const watchdog = setInterval(() => {
      if (isSwitchingRef.current) return;
      
      const media = playlistRef.current[currentIndexRef.current];
      if (!media) return;

      const now = Date.now();
      const elapsed = now - lastTransitionRef.time;
      const duration = Math.max(media.duration || 5, 3);
      const threshold = (duration * 1000) + 5000; // Duração + 5 segundos de folga

      // 1. Recuperação de Vídeo Travado
      if (media.type === "video" && videoRef.current) {
        if (videoRef.current.paused && !videoRef.current.ended) {
          console.warn("[PlayerEngine] Vídeo pausado inesperadamente, tentando play...");
          videoRef.current.play().catch(() => nextMedia("watchdog_video_fail"));
        }
      }

      // 2. Recuperação de Travamento Lógico (Time-based)
      if (elapsed > threshold) {
        console.error(`[PlayerEngine] !!! TRAVAMENTO DETECTADO !!! Forçando avanço. Elapsed: ${elapsed}ms | Threshold: ${threshold}ms`);
        if (serial) {
          FirebaseRealtimeService.logEvent(serial, "watchdog_force_next", {
            media: media.name,
            elapsed,
            threshold
          });
        }
        nextMedia("watchdog_timeout");
        lastTransitionRef.time = Date.now(); // Reset do tempo para o próximo ciclo
      }
    }, 2000); // Checagem frequente (a cada 2s)

    // Atualiza o timestamp de referência sempre que a mídia muda
    lastTransitionRef.time = Date.now();

    return () => clearInterval(watchdog);
  }, [currentIndex, nextMedia, serial]);

  if (!playlist.length) return null;

  const currentMedia = playlist[currentIndex];

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Camada Unificada de Exibição */}
      <div 
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-in-out",
          activeLayer === "A" ? "opacity-100 z-10" : "opacity-0 z-0"
        )}
      >
        {currentMedia.type === "video" ? (
          <video
            key={`video-${currentIndex}`}
            ref={videoRef}
            src={currentMedia.url}
            autoPlay
            muted={volume === 0}
            playsInline
            className="w-full h-full object-cover"
            onLoadStart={() => serial && FirebaseRealtimeService.logEvent(serial, "video_load_start", { media: currentMedia.name })}
            onCanPlay={() => serial && FirebaseRealtimeService.logEvent(serial, "video_can_play", { media: currentMedia.name })}
            onEnded={() => nextMedia("video_ended")}
            onError={(e) => {
              console.error("[PlayerEngine] Video error:", e);
              if (serial) FirebaseRealtimeService.logEvent(serial, "video_error", { media: currentMedia.name, error: "Playback failed" });
              nextMedia("video_error");
            }}
          />
        ) : (
          <img
            key={`img-${currentIndex}`}
            src={currentMedia.url}
            className="w-full h-full object-cover"
            alt=""
            onLoad={() => serial && FirebaseRealtimeService.logEvent(serial, "image_load_success", { media: currentMedia.name })}
            onError={() => {
              console.error("[PlayerEngine] Image error");
              if (serial) FirebaseRealtimeService.logEvent(serial, "image_error", { media: currentMedia.name });
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
