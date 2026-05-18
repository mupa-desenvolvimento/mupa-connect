import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, ScheduleResolver, MediaCacheService } from "@/components/PlayerServices";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { ManifestService } from "@/services/ManifestService";
import { DevicePersistenceService } from "@/services/DevicePersistenceService";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Monitor, Wrench, Scan } from "lucide-react";
import { useKioskMode } from "@/hooks/useKioskMode";
import { PWAInstallModal } from "@/components/PWAInstallModal";
import * as faceapi from "face-api.js";

interface AppearanceConfig {
  show_device_name?: boolean;
  show_datetime?: boolean;
  show_serial?: boolean;
  transition_type?: "fade" | "slide-left" | "slide-right" | "zoom" | "none";
  transition_duration?: number;
  footer?: {
    enabled: boolean;
    text: string;
    background_color: string;
    text_color: string;
    height: number;
  };
  logo?: {
    enabled: boolean;
    url: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    size: number;
    opacity?: number;
  };
}

const isValidUUID = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

const ttsAudioUrlCache = new Map<string, string>();

export default function Player() {
  const { deviceCode, "*": extraPath } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const previewPlaylistId = searchParams.get("id");
  
  useEffect(() => {
    // Force black background for all players
    document.body.style.backgroundColor = "black";
    document.documentElement.classList.add("dark");
  }, []);

  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(!!standalone);
      // PWA Install prompt removed as requested
      setShowInstallModal(false);
    };
    checkStandalone();
  }, [isPreview]);

  const navigate = useNavigate();
  console.log("[Player] Initializing with deviceCode:", deviceCode, "extraPath:", extraPath);
  
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const { isPwaInstalled, deferredPrompt, installPwa, showCursor, enterFullscreen } = useKioskMode();
  const [volume, setVolume] = useState(0); // Default muted as requested
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastIndexChange, setLastIndexChange] = useState(Date.now());
  const [syncToast, setSyncToast] = useState<{ msg: string; ts: number } | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; code?: string } | null>(null);
  const [networkInfo, setNetworkInfo] = useState<{ ip: string; localIp?: string; city: string; region: string } | null>(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const lastDetectionsRef = useRef<{ [key: number]: number }>({}); // Track last detection time per face index
  const faceSessionsRef = useRef<Record<number, {
    startedAt: number;
    lastSeenAt: number;
    sessionKey: string;
    age: number;
    gender: string;
    genderProbability: number;
    emotion: string;
    emotionProbability: number;
  }>>({});
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  const appearance = useMemo(() => (manifest?.appearance_config || {}) as AppearanceConfig, [manifest]);

  // 1. Core Loader: Resolve Identity & Manifest (Offline-First)
  useEffect(() => {
    const persistentId = DevicePersistenceService.getOrCreatePersistentId();
    
    if (!deviceCode && !isPreview) {
      console.log("[Player] No deviceCode in URL, redirecting to auto-load with:", persistentId);
      navigate(`/play/${persistentId}`, { replace: true });
      return;
    }

    async function initializePlayer() {
      // Step A: Load Local Cache Immediately
      if (deviceCode) {
        MediaCacheService.logPerformance(deviceCode, 'init_start', 'Iniciando carregamento do player');
        const cachedManifest = ManifestManager.getManifest(deviceCode);
        if (cachedManifest && !isPreview) {
          console.log("[Player] Resuming from offline manifest");
          MediaCacheService.logPerformance(deviceCode, 'manifest_cache_hit', 'Retomando do manifesto local');
          setManifest(cachedManifest);
          setIsLoading(false);
        }
      }

      try {
        if (isPreview && previewPlaylistId) {
          console.log("[Player] Loading preview for playlist:", previewPlaylistId);
          const { data: playlist, error } = await supabase
            .from("playlists")
            .select("id, name, updated_at, schedule, appearance_config")
            .eq("id", previewPlaylistId)
            .single();

          if (error) throw error;

          const { data: items, error: itemsError } = await supabase
            .from("playlist_items")
            .select("id, media_id, position, ordem, duracao, tipo, media_items(id, name, file_url, optimized_url, thumbnail_url, type, duration)")
            .eq("playlist_id", previewPlaylistId);

          if (itemsError) throw itemsError;

          const mapItems = (items: any[], appearanceConfig: any) => {
            const itemVolumes = (appearanceConfig as any)?.item_volumes || [];
            return (items || [])
              .sort((a, b) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
              .map((item, idx) => {
                const media = Array.isArray(item.media_items) ? item.media_items[0] : item.media_items;
                return {
                  id: item.media_id || item.id,
                  type: item.tipo || media?.type || "image",
                  url: media?.optimized_url || media?.file_url,
                  duration: item.duracao || media?.duration || 10,
                  volume: itemVolumes[idx] ?? 100,
                  name: media?.name || "Sem nome"
                };
              })
              .filter((item) => item.url);
          };

          const mappedItems = mapItems(items || [], playlist.appearance_config);

          setManifest({
            playlist_id: playlist.id,
            name: playlist.name,
            updated_at: playlist.updated_at || new Date().toISOString(),
            items: mappedItems,
            appearance_config: playlist.appearance_config || {}
          });
          setIsLoading(false);
          return;
        }

        if (!deviceCode) return;

        const result = await ManifestService.fetchManifest(deviceCode);
        setManifest(result.manifest);
        if (result.device) {
          setDeviceUuid(result.device.id?.toString());
          setDeviceInfo(result.device);
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error("[Player] Initial resolve error:", err);
        if (err.message?.includes("empresa (company_id) é obrigatório") || err.code === "P0001") {
          setErrorInfo({ 
            message: "O parâmetro empresa (company_id) é obrigatório para novos dispositivos.", 
            code: "P0001" 
          });
        }
        setIsLoading(false);
      }
    }

    initializePlayer();
    
    // Define deviceCode globalmente para uso na bridge Android
    if (deviceCode) {
      (window as any).mupa_device_code = deviceCode;
    }
    
    // Auto-enter fullscreen on load
    enterFullscreen();
  }, [deviceCode, enterFullscreen]);

  // 1.5 Realtime Updates via Firebase
  useEffect(() => {
    if (!deviceCode || isPreview) return;
    
    const unsubscribe = FirebaseRealtimeService.subscribeToDeviceUpdates(deviceCode, (payload) => {
      setSyncToast({ msg: "Sincronizando conteúdo...", ts: Date.now() });
      setReloadKey(k => k + 1);
      // auto-hide after 3.5s
      setTimeout(() => {
        setSyncToast(s => (s && Date.now() - s.ts >= 3000 ? null : s));
      }, 3500);
    });

    return () => unsubscribe();
  }, [deviceCode]);

  // 1.6 Realtime Commands via Firebase
  useEffect(() => {
    if (!deviceCode || isPreview) return;

    const unsubscribe = FirebaseRealtimeService.subscribeToCommands(deviceCode, (payload) => {
      if (payload.comando) {
        // Envia diretamente para o Android Bridge
        const { sendCommandToAndroid } = (window as any);
        if (sendCommandToAndroid) {
          sendCommandToAndroid(payload.comando, payload.payload || {}, {
            deviceId: deviceInfo?.id,
            tenantId: deviceInfo?.tenant_id,
            companyId: deviceInfo?.company_id
          });
        }
      }
    });

    return () => unsubscribe();
  }, [deviceCode, deviceInfo]);


  // 1.8 Proactive Cache Management
  useEffect(() => {
    if (!manifest || !deviceCode || isPreview) return;

    const syncMediaCache = async () => {
      console.log("[Player] Syncing media cache for current manifest...");
      const items = ScheduleResolver.getActivePlaylist(manifest);
      const urls = items.map(item => item.url).filter(Boolean);

      // Cache all current items
      await Promise.all(items.map(item => 
        MediaCacheService.cacheMedia(item.url, item.type, 0, deviceCode)
      ));

      // Clean old cache entries
      MediaCacheService.clearOldCache(urls);
    };

    syncMediaCache();
  }, [manifest, deviceCode]);

  // 2. Schedule & Queue Resolver
  const activePlaylist = useMemo(() => {
    return ScheduleResolver.getActivePlaylist(manifest);
  }, [manifest]);

  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const ttsSpeak = useCallback(async (text: string) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    if (currentTextRef.current === trimmed) return;
    currentTextRef.current = trimmed;

    if (!audioUnlockedRef.current) {
      try {
        const AnyAudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AnyAudioContext) {
          const ctx: AudioContext = audioContextRef.current || new AnyAudioContext();
          audioContextRef.current = ctx;
          if (ctx.state !== "running") await ctx.resume();
          audioUnlockedRef.current = true;
        }
      } catch {
      }
    }

    try {
      const prev = ttsAudioRef.current;
      if (prev) {
        prev.pause();
        ttsAudioRef.current = null;
      }
    } catch {
    }

    try {
      let audioUrl: string | undefined = ttsAudioUrlCache.get(trimmed);

      if (!audioUrl) {
        const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
          body: { text: trimmed },
        });

        if (error || !data) {
          currentTextRef.current = null;
          return;
        }

        if (data.audio_url) {
          audioUrl = data.audio_url;
          ttsAudioUrlCache.set(trimmed, audioUrl);
        } else if (data.audio_base64) {
          audioUrl = `data:audio/mpeg;base64,${data.audio_base64}`;
        } else {
          currentTextRef.current = null;
          return;
        }
      }

      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audio.volume = 1;
      ttsAudioRef.current = audio;

      return new Promise<void>((resolve) => {
        const done = () => {
          if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
          currentTextRef.current = null;
          resolve();
        };

        audio.onended = done;
        audio.onerror = done;
        audio.play().catch(done);
      });
    } catch {
      currentTextRef.current = null;
    }
  }, []);

  // 3. System Commands (Control Plane)
  const { lastCommand } = useDeviceCommandChannel(isPreview ? undefined : deviceUuid, {
    reloadPlaylist: () => setReloadKey(k => k + 1),
    setVolume: (v) => setVolume(v),
    clearCache: () => { caches.keys().then(ks => ks.map(k => caches.delete(k))); },
    reboot: () => window.location.reload(),
    playCampaign: (id) => console.log("Play campaign", id),
    screenshot: () => Promise.resolve(""),
    ttsSpeak,
    tenantId: deviceInfo?.tenant_id,
    companyId: deviceInfo?.company_id,
    serial: deviceInfo?.serial || deviceCode,
  });


  const handleMediaChange = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setLastIndexChange(Date.now());
    
    const media = activePlaylist[idx];
    if (media && deviceInfo?.id && !isPreview) {
      // Heartbeat removido conforme solicitação


      // 2. Supabase Player Status Update
      supabase
        .from('dispositivos')
        .update({ 
          player_status: 'playing',
          last_player_activity_at: new Date().toISOString(),
          current_media_id: media.id
        })
        .eq('id', deviceInfo.id)
        .then(({ error }) => {
          if (error) console.warn("[Player] Failed to update player status:", error);
        });

      // 3. Trade Marketing Event
      supabase.from('media_events').insert({
        device_id: deviceInfo.id,
        media_id: media.id?.toString(),
        playlist_id: manifest?.playlist_id,
        event_type: 'view',
        duration: media.duration || 10,
        metadata: {
          media_name: media.name,
          media_type: media.type,
          serial: deviceInfo.serial
        }
      }).then(({ error }) => {
        if (error) console.error("[Player] Failed to log media event:", error);
      });
    }
  }, [activePlaylist, deviceInfo, manifest, deviceCode]);

  // 4. Background Sync (Polling) - Silent & Efficient
  useEffect(() => {
    if (!deviceCode || isPreview) return;
    
    const backgroundSync = async () => {
      console.log("[Player] Background sync checking for updates...");
      try {
        const { data: device, error } = await (supabase
          .from("dispositivos")
          .select("id, atualizado, playlist_id") as any)
          .or(`apelido_interno.eq."${deviceCode}",serial.eq."${deviceCode}"`)
          .maybeSingle();

        if (error || !device) return;

        const { data: playlistData } = await supabase
          .from("playlists")
          .select("updated_at")
          .eq("id", device.playlist_id)
          .maybeSingle();

        const remoteUpdatedAt = playlistData?.updated_at || device.atualizado || "";
        const cachedManifest = ManifestManager.getManifest(deviceCode);

        if (!cachedManifest || cachedManifest.updated_at !== remoteUpdatedAt) {
          console.log("[Player] Update detected or no cache, fetching manifest...");
          const result = await ManifestService.fetchManifest(deviceCode);
          setManifest(result.manifest);
          setDeviceInfo(result.device || device);
          setDeviceUuid((result.device?.id || device.id).toString());
        } else {
          console.log("[Player] No changes detected in background.");
          if (!deviceInfo) {
            setDeviceInfo(device);
            setDeviceUuid(device.id.toString());
          }
        }
      } catch (err) {
        console.warn("[Player] Background sync failed", err);
      }
    };

    // Initial check immediately, then every 60s
    backgroundSync();
    const interval = setInterval(backgroundSync, 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, [deviceCode, reloadKey]);

  // Heartbeat removido conforme solicitação


  // 6. Page-Level Watchdog (Anti-Stall)
  // Uses RequestAnimationFrame to detect if the entire engine is stuck
  useEffect(() => {
    if (isPreview) return;
    let rafId: number;
    
    const checkEngineHealth = () => {
      const now = Date.now();
      const timeSinceLastAdvance = now - lastIndexChange;
      const currentMedia = activePlaylist[currentIndex];
      
      // Safety margin: 30s beyond media duration or 2 mins default
      const maxWait = currentMedia ? (currentMedia.duration * 1000) + 30000 : 120000;
      
      if (timeSinceLastAdvance > maxWait) {
        console.error("[Player] Page heartbeat detected engine stall. Forcing page reload.");
        window.location.reload();
      }
      
      rafId = requestAnimationFrame(checkEngineHealth);
    };

    rafId = requestAnimationFrame(checkEngineHealth);
    return () => cancelAnimationFrame(rafId);
  }, [lastIndexChange, currentIndex, activePlaylist]);

  // Fetch Network Info (IP & Location)
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        // Fetch Public IP and Location
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        let localIp = 'N/A';
        
        // Try to get Local IP via WebRTC (best effort)
        try {
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel("");
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          pc.onicecandidate = (ice) => {
            if (ice && ice.candidate && ice.candidate.candidate) {
              const matches = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(ice.candidate.candidate);
              if (matches && matches[1]) {
                setNetworkInfo(prev => prev ? { ...prev, localIp: matches[1] } : null);
                pc.onicecandidate = null;
                pc.close();
              }
            }
          };
          setTimeout(() => pc.close(), 2000);
        } catch (e) {
          console.warn("WebRTC Local IP detection failed", e);
        }

        setNetworkInfo({
          ip: data.ip,
          city: data.city,
          region: data.region_code,
          localIp: localIp
        });
      } catch (err) {
        console.error("[Player] Failed to fetch network info:", err);
      }
    };

    fetchNetworkInfo();
  }, []);

  // UI Setup - Already handled in top-level useEffect

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Face Detection with Face-API
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        console.log("[Face Detection] Loading models from:", MODEL_URL);
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        console.log("[Face Detection] All models loaded successfully!");
        setModelsLoaded(true);
        startCamera();
      } catch (error) {
        console.error("[Face Detection] Error loading models:", error);
      }
    };

    const startCamera = async () => {
      if (!videoRef.current) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          console.log("[Face Detection] Camera started!");
          setFaceDetectionActive(true);
          startDetectionLoop();
        };
      } catch (error) {
        console.error("[Face Detection] Error accessing camera:", error);
      }
    };

    const startDetectionLoop = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
      detectionIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
        
        const options = new faceapi.TinyFaceDetectorOptions();
        const result = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender();
        
          const now = Date.now();
          const activeIndices = new Set<number>();

          if (result.length > 0) {
          result.forEach(async (face, index) => {
            activeIndices.add(index);
            // Get the most probable expression
            const expressions = face.expressions.asSortedArray();
            const mostProbableExpression = expressions[0];
            
            const existingSession = faceSessionsRef.current[index];
            if (!existingSession) {
              faceSessionsRef.current[index] = {
                startedAt: now,
                lastSeenAt: now,
                sessionKey: `${sessionId}_person_${index}_${now}`,
                age: Math.round(face.age),
                gender: face.gender,
                genderProbability: face.genderProbability,
                emotion: mostProbableExpression.expression,
                emotionProbability: mostProbableExpression.probability,
              };
            } else {
              existingSession.lastSeenAt = now;
              existingSession.age = Math.round(face.age);
              existingSession.gender = face.gender;
              existingSession.genderProbability = face.genderProbability;
              existingSession.emotion = mostProbableExpression.expression;
              existingSession.emotionProbability = mostProbableExpression.probability;
            }

            const faceData = {
              timestamp: new Date().toISOString(),
              faceIndex: index,
              age: Math.round(face.age),
              gender: face.gender,
              genderProbability: face.genderProbability,
              expressions: expressions.map((exp: any) => ({
                expression: exp.expression,
                probability: exp.probability
              })),
              mostProbableExpression: {
                expression: mostProbableExpression.expression,
                probability: mostProbableExpression.probability
              }
            };
            
            console.log("[Face Detection] Face detected:", faceData);
            
            // Only send detection to database every 5 seconds per face to avoid duplicates
            const lastSent = lastDetectionsRef.current[index] || 0;
            const timeSinceLastSent = now - lastSent;
            
            if (timeSinceLastSent >= 5000) { // 5 seconds cooldown
              // Send data to audience_detections table
              try {
                const validDeviceId = isValidUUID((deviceInfo as any)?.device_uuid) ? (deviceInfo as any).device_uuid : null;
                const validTenantId = isValidUUID(deviceInfo?.tenant_id) ? deviceInfo.tenant_id : 
                                      isValidUUID(manifest?.tenant_id) ? manifest.tenant_id : null;
                const session = faceSessionsRef.current[index];
                const durationMs = session ? Math.max(0, now - session.startedAt) : 0;
                
                const detectionData = {
                  detected_at: new Date().toISOString(),
                  age: Math.round(face.age),
                  gender: face.gender,
                  emotion: mostProbableExpression.expression,
                  emotion_confidence: null,
                  gender_probability: null,
                  device_id: validDeviceId,
                  tenant_id: validTenantId,
                  session_id: session?.sessionKey || `${sessionId}_person_${index}`,
                  metadata: {
                    is_looking: true,
                    duration_ms: durationMs,
                    long_session: durationMs >= 60000,
                    face_index: index
                  }
                };
                
                const { error } = await supabase
                  .from("audience_detections")
                  .insert([detectionData]);
                
                if (error) {
                  console.error("[Face Detection] Error sending detection to database:", error);
                } else {
                  console.log("[Face Detection] Detection sent to database successfully");
                  lastDetectionsRef.current[index] = now; // Update last sent time
                }
              } catch (dbError) {
                console.error("[Face Detection] Error sending to database:", dbError);
              }
            } else {
              console.log(`[Face Detection] Skipping duplicate detection for face ${index} (last sent ${timeSinceLastSent}ms ago)`);
            }
          });
        }

        Object.keys(faceSessionsRef.current).forEach((k) => {
          const index = Number(k);
          if (!Number.isFinite(index)) return;
          if (activeIndices.has(index)) return;
          const session = faceSessionsRef.current[index];
          if (!session) return;
          if (now - session.lastSeenAt < 1500) return;

          const validDeviceId = isValidUUID((deviceInfo as any)?.device_uuid) ? (deviceInfo as any).device_uuid : null;
          const validTenantId = isValidUUID(deviceInfo?.tenant_id) ? deviceInfo.tenant_id :
                                isValidUUID(manifest?.tenant_id) ? manifest.tenant_id : null;
          const durationMs = Math.max(0, session.lastSeenAt - session.startedAt);

          console.log("[Face Detection] Face session ended:", {
            faceIndex: index,
            durationMs,
            session_id: session.sessionKey,
          });

          if (durationMs > 0) {
            supabase
              .from("audience_detections")
              .insert([{
                detected_at: new Date(session.lastSeenAt).toISOString(),
                age: session.age,
                gender: session.gender,
                emotion: session.emotion,
                emotion_confidence: null,
                gender_probability: null,
                device_id: validDeviceId,
                tenant_id: validTenantId,
                session_id: session.sessionKey,
                metadata: {
                  is_looking: false,
                  duration_ms: durationMs,
                  long_session: durationMs >= 60000,
                  face_index: index
                }
              }])
              .then(({ error }) => {
                if (error) console.error("[Face Detection] Error sending end-of-session to database:", error);
              });
          }

          delete faceSessionsRef.current[index];
          delete lastDetectionsRef.current[index];
        });
      }, 1000); // Detect every 1 second
    };

    const cleanup = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      faceSessionsRef.current = {};
      lastDetectionsRef.current = {};
      
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };

    if (!isPreview) {
      loadModels();
    }

    return cleanup;
  }, [modelsLoaded, isPreview]);

  if (errorInfo) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-6 z-[100]">
        <Alert variant="destructive" className="max-w-md bg-zinc-900 border-destructive/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro de Configuração {errorInfo.code && `(${errorInfo.code})`}</AlertTitle>
          <AlertDescription>
            {errorInfo.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading && !activePlaylist.length) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-widest">Iniciando Engine Profissional...</div>;
  }

  if (!activePlaylist.length) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 text-white select-none">
        <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-700">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
            <Monitor className="w-8 h-8 text-white/20" />
          </div>
          <h2 className="text-xl font-light tracking-[0.2em] uppercase text-white/60">Aguardando Ativação</h2>
          <p className="text-white/30 font-mono text-xs uppercase tracking-widest">Nenhuma playlist vinculada</p>
        </div>
        
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">Número de Série</div>
          <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm group hover:border-white/20 transition-all duration-300">
            <code className="text-3xl md:text-5xl font-mono font-bold tracking-[0.15em] text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              {deviceCode}
            </code>
          </div>
        </div>

        <div className="absolute bottom-12 text-[10px] text-white/10 uppercase tracking-[0.4em] font-medium animate-pulse">
          Sincronizando com Servidor Cloud
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden text-white select-none">
      {/* Hidden camera and canvas for face detection */}
      {!isPreview && (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="fixed top-0 left-0 w-0 h-0 object-cover"
          />
          <canvas 
            ref={canvasRef} 
            className="fixed top-0 left-0 w-0 h-0"
          />
        </>
      )}

      <PlayerEngine 
        playlist={activePlaylist} 
        volume={volume}
        serial={deviceInfo?.serial || deviceCode}
        onMediaChange={handleMediaChange}
        appearance={{
          transition_type: appearance.transition_type,
          transition_duration: appearance.transition_duration
        }}
      />

      {/* Top Overlay Layer */}
      <div className={cn(
        "absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6",
        isPreview && "rounded-3xl border-8 border-black shadow-inner"
      )}>
        {/* Header: Device Info & Clock */}
        <div className="flex items-start justify-between w-full">
          {/* Device Info */}
          {(appearance.show_device_name !== false && !isPreview) && (
            <div className="flex items-center gap-3 animate-fade-in bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center font-bold font-bold text-primary-foreground shadow-lg shadow-primary/20">M</div>
              <div className="leading-tight">
                <div className="font-bold font-bold text-lg tracking-tight">
                  {deviceInfo?.apelido_interno || "Player Profissional"}
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] opacity-60 font-mono font-bold">
                  {deviceInfo ? `Filial ${deviceInfo.num_filial}` : `Offline · ${deviceCode}`}
                </div>
                {networkInfo && (
                  <div className="text-[9px] uppercase tracking-[0.1em] opacity-40 font-mono mt-1 flex flex-col gap-0.5">
                    <div>IP: {networkInfo.localIp !== 'N/A' ? `${networkInfo.localIp} (Local)` : networkInfo.ip}</div>
                    <div>{networkInfo.city}, {networkInfo.region}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date/Time */}
          {(appearance.show_datetime !== false && !isPreview) && (
            <div className="text-right animate-fade-in bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5">
              <div className="font-bold text-3xl font-bold tabular-nums tracking-tighter">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-[10px] uppercase opacity-50 font-mono tracking-widest">
                {now.toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Layer */}
        <div className="flex flex-col items-center gap-4">
          {/* Logo Overlay */}
          {appearance.logo?.enabled && appearance.logo.url && (
            <div 
              className={cn(
                "absolute pointer-events-none transition-all duration-500",
                appearance.logo.position === "top-left" && "top-6 left-6",
                appearance.logo.position === "top-right" && "top-6 right-6",
                appearance.logo.position === "bottom-left" && "bottom-6 left-6",
                appearance.logo.position === "bottom-right" && "bottom-6 right-6",
                // Adjust position if header is enabled
                appearance.logo.position === "top-left" && (appearance.show_device_name !== false) && "top-24",
                appearance.logo.position === "top-right" && (appearance.show_datetime !== false) && "top-24"
              )}
              style={{ 
                opacity: appearance.logo.opacity ?? 1,
                // Handle dynamic footer offset
                ...(appearance.logo.position.startsWith('bottom') && appearance.footer?.enabled ? {
                  bottom: `80px`
                } : {})
              }}
            >
              <img 
                src={appearance.logo.url} 
                alt="Logo" 
                style={{ width: `${appearance.logo.size || 80}px`, height: 'auto' }}
                className="drop-shadow-2xl"
              />
            </div>
          )}

          {/* Configurable Footer - Refined & Elegant */}
          {appearance.footer?.enabled && (
            <div 
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-8 py-3 rounded-2xl backdrop-blur-md shadow-2xl border border-white/5 animate-fade-in max-w-[90%] pointer-events-none"
              style={{ 
                backgroundColor: appearance.footer.background_color || "rgba(0, 0, 0, 0.6)",
                color: appearance.footer.text_color || "hsl(var(--foreground))",
              }}
            >
              <div className="flex flex-col items-center justify-center text-center leading-tight">
                <div 
                  className="font-bold tracking-wide"
                  style={{ 
                    fontFamily: "Satoshi, sans-serif",
                    fontSize: "1.8rem",
                    letterSpacing: "0.05em"
                  }}
                >
                  <span className="opacity-95 block line-clamp-2">{appearance.footer.text}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Info (Bottom Right) */}
      {deviceInfo?.is_maintenance && (
        <div className="absolute bottom-4 right-4 z-[100] p-4 rounded-xl bg-black/80 backdrop-blur-xl border border-yellow-500/50 shadow-2xl animate-in fade-in zoom-in duration-500 max-w-[300px] pointer-events-none">
          <div className="flex items-center gap-3 mb-3 text-yellow-500">
            <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
              <Wrench className="h-4 w-4" />
            </div>
            <div className="font-bold font-bold text-sm uppercase tracking-wider">Modo Manutenção</div>
          </div>
          <div className="space-y-2 font-mono text-[10px] uppercase tracking-wider">
            <div className="flex justify-between gap-4">
              <span className="text-white/40">Serial:</span>
              <span className="text-white/90 font-bold">{deviceInfo.serial}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/40">Filial:</span>
              <span className="text-white/90 font-bold">{deviceInfo.num_filial || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/40">Nome:</span>
              <span className="text-white/90 font-bold text-right">{deviceInfo.apelido_interno || "—"}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/40">Status:</span>
              <span className="text-yellow-500 font-bold">EM MANUTENÇÃO</span>
            </div>
            <div className="mt-2 pt-2 border-t border-white/5 space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-white/40">IP Local:</span>
                <span className="text-white/60 font-bold">{networkInfo?.localIp !== 'N/A' ? networkInfo?.localIp : networkInfo?.ip || "Detectando..."}</span>
              </div>
              {networkInfo && (
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">Localização:</span>
                  <span className="text-white/60 font-bold">{networkInfo.city}, {networkInfo.region}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Serial Info (Discreet) */}
      {(appearance.show_serial !== false && !isPreview && !deviceInfo?.is_maintenance) && (
        <div className="absolute bottom-4 right-4 z-40 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 font-mono text-[10px] text-white/40 tracking-[0.2em] select-none pointer-events-none uppercase">
          Device ID: {deviceInfo?.serial || deviceCode}
        </div>
      )}


      {/* Discreet sync notification */}
      {syncToast && !isPreview && (
        <div className="absolute bottom-20 left-6 z-40 flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/20 backdrop-blur-xl border border-primary/20 font-mono text-xs text-primary-foreground tracking-wider select-none pointer-events-none animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          {syncToast.msg}
        </div>
      )}

      <PWAInstallModal 
        isOpen={showInstallModal && !isPreview}
        onClose={() => setShowInstallModal(false)}
        onInstall={() => {
          installPwa();
          setShowInstallModal(false);
        }}
      />

    </div>
  );
}
