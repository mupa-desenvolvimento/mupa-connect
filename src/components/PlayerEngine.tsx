import { useEffect, useState, useRef, useCallback } from "react";
import { MediaCacheService } from "./PlayerServices";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { cn } from "@/lib/utils";

const MIN_DURATION = 3; // Segundos mínimos para qualquer mídia
const TRANSITION_MS = 400; // Tempo do crossfade CSS

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
  const lastTransitionTimeRef = useRef<number>(Date.now()); // Reutilizado como startTime do controlador central
  const heartbeatRef = useRef<number>(0);
  const lastCheckTimeRef = useRef<number>(Date.now());
  
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
      // Removido visibility: hidden para garantir que o crossfade ocorra suavemente
      // e o elemento não suma instantaneamente durante a transição
      zIndex: isActive ? 10 : 5,
      transition: "opacity 400ms ease-in-out",
      willChange: "opacity",
      transform: "translateZ(0)",
      backfaceVisibility: "hidden",
      position: "absolute",
      inset: 0,
      backgroundColor: "black" // Garante fundo preto se a mídia falhar
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
  const performTransition = useCallback((triggerReason: string = "timer") => {
    if (isTransitioningRef.current || !playlistRef.current.length) return;

    const nextLayer = activeLayer === "A" ? "B" : "A";
    const currentItem = activeLayer === "A" ? itemA : itemB;
    
    if (!currentItem) return;

    // BLOQUEIO DE TROCA PREMATURA (TIMESTAMP)
    const now = Date.now();
    const elapsed = now - lastTransitionTimeRef.current;
    const configuredDuration = (currentItem.duration || 10);
    const minRequiredMs = Math.max(configuredDuration, MIN_DURATION) * 1000;

    // Se estiver tentando trocar muito antes do tempo, bloqueia (evita disparos duplos)
    if (elapsed < minRequiredMs - 200 && triggerReason !== "error") {
      console.warn(`[PlayerEngine] Troca prematura detectada (${elapsed}ms < ${minRequiredMs}ms). Cancelando.`);
      return;
    }

    // BLOQUEAR DUPLO AVANÇO (CONTROLLER STATE)
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (!readyToSwitchRef.current[nextLayer]) {
      console.warn(`[PlayerEngine] Próxima camada (${nextLayer}) não carregada. Forçando avanço para evitar travamento.`);
      readyToSwitchRef.current[nextLayer] = true;
      if (serial) {
        FirebaseRealtimeService.logEvent(serial, "buffer_not_ready", {
          layer: nextLayer,
          trigger: triggerReason
        });
      }
    }

    console.log(`[PlayerEngine] NEXT TRIGGER. Mídia: ${currentItem.name}, Exibida por: ${elapsed}ms | Motivo: ${triggerReason}`);
    
    if (serial) {
      FirebaseRealtimeService.logEvent(serial, "media_transition", {
        from: currentItem.name,
        elapsed_ms: elapsed,
        reason: triggerReason
      });
      // Atualizar heartbeat também
      FirebaseRealtimeService.sendHeartbeat(serial, currentItem.id, "playing");
    }

    const nextVideo = nextLayer === "A" ? videoARef.current : videoBRef.current;
    const nextItem = nextLayer === "A" ? itemA : itemB;
    
    if (nextItem?.type === "video" && nextVideo) {
      nextVideo.muted = volume === 0;
      nextVideo.play().catch(err => {
        console.error("[PlayerEngine] Falha ao dar play, pulando:", err);
        if (serial) FirebaseRealtimeService.logEvent(serial, "video_play_error", { media: nextItem.name, error: err.message });
      });
    }

    // DISPARO ÚNICO DE TROCA
    setActiveLayer(nextLayer);
    lastTransitionTimeRef.current = now;

    currentIndexRef.current = (currentIndexRef.current + 1) % playlistRef.current.length;
    onMediaChange?.(currentIndexRef.current);

    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      prepareNextBuffer();
    }, TRANSITION_MS + 100);
  }, [activeLayer, itemA, itemB, volume, onMediaChange, serial]);

  /**
   * Watchdog mechanism (ANTI-TRAVAMENTO - CRÍTICO)
   * Garante que o player sempre avance, mesmo que timers de mídia ou eventos de vídeo falhem.
   */
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (!isReady || isTransitioningRef.current) return;

      const currentItem = activeLayer === "A" ? itemA : itemB;
      if (!currentItem) return;

      const now = Date.now();
      const elapsed = now - lastTransitionTimeRef.current;
      const duration = Math.max(currentItem.duration || 0, MIN_DURATION);
      const expectedMs = duration * 1000;

      // Watchdog (Safety Fallback): Se passou do tempo + 3s de margem, FORÇA o avanço.
      if (elapsed > expectedMs + 3000) {
        console.warn(`[PlayerEngine] !!! TRAVAMENTO DETECTADO !!! Forçando avanço via Watchdog. ELAPSED: ${elapsed}ms | EXPECTED: ${expectedMs}ms`);
        performTransition("watchdog");
      }
    }, 2000);

    return () => clearInterval(watchdog);
  }, [isReady, activeLayer, itemA, itemB, performTransition]);

  /**
   * Prepare the inactive layer with the next media item in the playlist.
   */
  const prepareNextBuffer = async () => {
    const inactiveLayer = activeLayer === "A" ? "B" : "A";
    const currentPlaylist = playlistRef.current;
    if (!currentPlaylist.length) return;

    const nextIndex = (currentIndexRef.current + 1) % currentPlaylist.length;
    const nextItem = currentPlaylist[nextIndex];

    if (!nextItem) return;

    readyToSwitchRef.current[inactiveLayer] = false;
    loadingStatusRef.current[inactiveLayer] = false;

    // Fallback for loading timeout: Se não carregar em 8s, marca como pronto para não travar o loop
    const loadTimeout = setTimeout(() => {
      if (!loadingStatusRef.current[inactiveLayer]) {
        console.warn(`[PlayerEngine] Buffer loading timed out for layer ${inactiveLayer}. Forcing ready state to avoid lock.`);
        readyToSwitchRef.current[inactiveLayer] = true;
      }
    }, 8000);

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
          console.warn("[PlayerEngine] Image load failed, allowing transition to handle error.");
          readyToSwitchRef.current[inactiveLayer] = true;
        };
      } else {
        // Para vídeos, o evento canplaythrough limpará o timeout
        (window as any)[`loadTimeout${inactiveLayer}`] = loadTimeout;
      }
    } catch (err) {
      clearTimeout(loadTimeout);
      console.error("[PlayerEngine] Buffer preparation failed, forcing ready:", err);
      readyToSwitchRef.current[inactiveLayer] = true;
    }
  };

  // CONTROLADOR ÚNICO DE TEMPO (START MEDIA LOGIC)
  useEffect(() => {
    if (!isReady) return;

    const currentItem = activeLayer === "A" ? itemA : itemB;
    if (!currentItem) return;
    
    // Limpar timer anterior para evitar múltiplos timers concorrentes
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(currentItem.duration || 0, MIN_DURATION);
    const ms = duration * 1000;
    
    console.log(`[PlayerEngine] START Mídia: ${currentItem.name} | DURATION: ${duration}s`);
    
    // Agendar próxima mídia usando timer principal
    timerRef.current = setTimeout(() => {
      console.log(`[PlayerEngine] TIMER TRIGGERED for ${currentItem.name}`);
      performTransition();
    }, ms);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeLayer, itemA, itemB, isReady, performTransition]);

  /**
   * Periodic Heartbeat (RequestAnimationFrame)
   * This mechanism does NOT rely on setTimeout/setInterval and detects logical freezes.
   */
  useEffect(() => {
    if (!isReady) return;

    const checkFreeze = () => {
      const now = Date.now();
      const currentItem = activeLayer === "A" ? itemA : itemB;
      const currentVideo = activeLayer === "A" ? videoARef.current : videoBRef.current;
      
      if (currentItem && !isTransitioningRef.current) {
        const elapsedSinceTransition = now - lastTransitionTimeRef.current;
        const duration = Math.max(currentItem.duration || 0, MIN_DURATION);
        const expectedMs = duration * 1000;
        
        // Safety Threshold: 10 segundos além do tempo esperado (mais conservador)
        const FREEZE_THRESHOLD = 10000;

        // Diagnóstico em tempo real (Log opcional se necessário)
        // console.log("Time Check:", elapsedSinceTransition, "/", expectedMs);

        // 1. Travamento Geral ou Imagem
        if (elapsedSinceTransition > expectedMs + FREEZE_THRESHOLD) {
          console.error(`[PlayerEngine] Heartbeat detectou atraso excessivo. Forçando próxima.`);
          performTransition("heartbeat_freeze");
        }

        // 2. Travamento de Vídeo
        if (currentItem.type === "video" && currentVideo && !currentVideo.paused) {
          if (now - lastCheckTimeRef.current > 3000) {
            const lastTime = (currentVideo as any)._lastRecordedTime || 0;
            if (currentVideo.currentTime > 0 && Math.abs(currentVideo.currentTime - lastTime) < 0.01) {
              console.warn("[PlayerEngine] Vídeo parado no frame:", currentVideo.currentTime);
              if (elapsedSinceTransition > expectedMs + 5000) {
                console.error("[PlayerEngine] Vídeo travado por muito tempo, pulando.");
                performTransition("video_freeze");
              }
            }
            (currentVideo as any)._lastRecordedTime = currentVideo.currentTime;
            lastCheckTimeRef.current = now;
          }
        }
      }
      
      heartbeatRef.current = requestAnimationFrame(checkFreeze);
    };

    heartbeatRef.current = requestAnimationFrame(checkFreeze);
    return () => {
      if (heartbeatRef.current) cancelAnimationFrame(heartbeatRef.current);
    };
  }, [activeLayer, itemA, itemB, isReady, performTransition]);

  /**
   * Initialization
   */
  useEffect(() => {
    if (!playlist.length) return;

    const init = async () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      
      currentIndexRef.current = 0;
      const item0 = playlist[0];
      const item1 = playlist[1 % playlist.length];

      // Prepare Layer A
      const blob0 = await MediaCacheService.getBlobUrl(item0.url);
      const finalUrl0 = blob0 || item0.url;
      setSrcA(finalUrl0);
      setItemA(item0);
      // Garantir que a primeira mídia seja marcada como pronta se for imagem
      if (item0.type === "image") {
        readyToSwitchRef.current.A = true;
      }

      // Prepare Layer B
      const blob1 = await MediaCacheService.getBlobUrl(item1.url);
      const finalUrl1 = blob1 || item1.url;
      setSrcB(finalUrl1 || item1.url);
      setItemB(item1);

      lastTransitionTimeRef.current = Date.now();
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
      if (heartbeatRef.current) cancelAnimationFrame(heartbeatRef.current);
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
              // Marcar como pronto imediatamente no carregamento da imagem ativa
              if (activeLayer === "A") {
                loadingStatusRef.current.A = true;
                readyToSwitchRef.current.A = true;
              }
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
              // Marcar como pronto imediatamente no carregamento da imagem ativa
              if (activeLayer === "B") {
                loadingStatusRef.current.B = true;
                readyToSwitchRef.current.B = true;
              }
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
