import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, ScheduleResolver, MediaCacheService } from "@/components/PlayerServices";
import { ManifestService } from "@/services/ManifestService";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Package, AlertCircle, Barcode, User, X, Info, Search, Play, Megaphone } from "lucide-react";
import { OptimizedProductImage } from "@/components/OptimizedProductImage";
import { Input } from "@/components/ui/input";
import * as faceapi from "face-api.js";
import { useKioskMode } from "@/hooks/useKioskMode";
import { PWAInstallModal } from "@/components/PWAInstallModal";
import { DevShowcaseOverlay } from "@/components/DevShowcaseOverlay";
import { DevicePersistenceService } from "@/services/DevicePersistenceService";
import { extractImageColors } from "@/utils/extractImageColors";
import { useProductTTS } from "../../useProductTTS";

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

interface ProductData {
  ean: string;
  internal_id: string | number;
  description: string;
  stock_prices: Array<{
    unit_pack: number;
    price_pack: number;
    whole_sale?: string | number;
    stock_avaliable: number;
    price_prom_pack?: number;
  }>;
  visual: {
    imagem_url: string;
    cor_assinatura_produto: string;
    fundo_legibilidade: string;
    cor_dominante_claro: string;
    cor_dominante_escuro: string;
  } | null;
  is_cached?: boolean;
}

const DEFAULT_PRODUCT_IMAGE = "https://qtbkvshbmqlszncxlcuc.supabase.co/storage/v1/object/public/dsl-uploads/kqrRuPz304ckV2bn5HmQpveeQQo1/821f6c4e-8d26-4bd2-90bd-a52929afc73e.png";
const DEFAULT_VISUAL_COLORS = {
  cor_assinatura_produto: "#F36C21",
  fundo_legibilidade: "#003399",
  cor_dominante_claro: "#FFFFFF",
  cor_dominante_escuro: "#003399"
};

const getLuminance = (hex: string) => {
  const rgb = hex.startsWith('#') ? hex.slice(1) : hex;
  if (rgb.length !== 6) return 0.5;
  const r = parseInt(rgb.substring(0, 2), 16) / 255;
  const g = parseInt(rgb.substring(2, 4), 16) / 255;
  const b = parseInt(rgb.substring(4, 6), 16) / 255;
  const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const getContrastColor = (hex: string) => {
  const luminance = getLuminance(hex);
  // Se luminância > 0.45, fundo é considerado "claro" o suficiente para texto escuro (grafite)
  // Caso contrário, fundo é "escuro", então texto deve ser branco.
  return luminance > 0.45 ? "#333333" : "#FFFFFF";
};

const isDefaultImage = (url: string | null | undefined) => {
  if (!url) return true;
  return url.includes('821f6c4e-8d26-4bd2-90bd-a52929afc73e.png') || url.includes('d3db954d-0353-4d10-a92c-375058cceded.png');
};

const ensureSafeImageUrl = (url: string | null | undefined) => {
  if (!url) return null;
  // Se já estiver usando o proxy ou não for do mupa, não faz nada
  if (url.includes('wsrv.nl')) return url;
  
  if (url.includes('srv-mupa.ddns.net')) {
    // Força http para evitar o erro de SSL no servidor de origem
    const cleanUrl = url.replace('https://', 'http://');
    return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  }
  return url;
};

const MUPA_STATIC_IMAGE = (ean: string) => ensureSafeImageUrl(`http://srv-mupa.ddns.net:5050/static/processed/${ean}.png`);

const isValidUUID = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export default function PlayerConsulta() {
  const { isPwaInstalled, deferredPrompt, installPwa, showCursor, enterFullscreen } = useKioskMode();
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  useEffect(() => {
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      setIsStandalone(!!standalone);
      // PWA Install prompt removed as requested
      setShowInstallModal(false);
    };
    checkStandalone();
  }, []);
  const navigate = useNavigate();
  const { deviceCode } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const previewPlaylistId = searchParams.get("id");
  const isDevModeParam = searchParams.get("dev") === "true";

  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // TRADE MARKETING STATE
  const [tradeCampaign, setTradeCampaign] = useState<any>(null);
  const [isTradeActive, setIsTradeActive] = useState(false);
  const [tradeCooldowns, setTradeCooldowns] = useState<Record<string, number>>({});
  const [tradeDispatchesPerMinute, setTradeDispatchesPerMinute] = useState<Record<string, number[]>>({});

  // DEV MODE STATE
  const [isDevMode, setIsDevMode] = useState(isDevModeParam);
  const [isAutoDemoActive, setIsAutoDemoActive] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const lastClickTime = useRef(0);

  useEffect(() => {
    // PWA Install prompt removed as requested
    setShowInstallModal(false);
  }, [deferredPrompt, isPwaInstalled, isStandalone]);

  // MODO CONSULTA STATE
  const [showOverlay, setShowOverlay] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [lastConsultedEan, setLastConsultedEan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // inputRef mantido para compatibilidade com scanners que exigem campo focado
  // inputValue removido pois agora usamos o valor diretamente no ref para o scanner global
  const [manualProductId, setManualProductId] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const lastSpokenEanRef = useRef<string | null>(null);
  const [ttsDebug, setTtsDebug] = useState<{ status: string; text?: string; error?: string } | null>(null);
  const { speak: speakText } = useProductTTS({ onDebug: setTtsDebug });



  const [isVertical, setIsVertical] = useState(window.innerHeight > window.innerWidth);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [showFaceDetections, setShowFaceDetections] = useState(false);
  const [currentFaceDetections, setCurrentFaceDetections] = useState<any[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const faceSessionsRef = useRef<Record<string, {
    startedAt: number;
    lastSeenAt: number;
    sessionKey: string;
    descriptor: Float32Array;
    ageSum: number;
    ageCount: number;
    gender: string;
    genderProbability: number;
    emotion: string;
    emotionProbability: number;
  }>>({});
  const deviceInfoRef = useRef<any>(null);
  const manifestRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    deviceInfoRef.current = deviceInfo;
  }, [deviceInfo]);

  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  useEffect(() => {
    setImageError(false);
    // Preload basic images
    const preload = [DEFAULT_PRODUCT_IMAGE];
    if (fallbackImageUrl) preload.push(fallbackImageUrl);
    
    preload.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, [product, fallbackImageUrl]);

  // Extração automática de cores quando a imagem do produto NÃO for default
  useEffect(() => {
    if (!product?.visual?.imagem_url) return;
    const url = product.visual.imagem_url;
    if (isDefaultImage(url)) return; // mantém cores default

    let cancelled = false;
    const run = async () => {
      const palette =
        (await extractImageColors(url)) ||
        (await extractImageColors(`https://wsrv.nl/?url=${encodeURIComponent(url)}`));

      if (cancelled || !palette) return;
      setProduct(prev => {
        if (!prev || !prev.visual || prev.visual.imagem_url !== url) return prev;
        return {
          ...prev,
          visual: {
            ...prev.visual,
            cor_dominante_claro: palette.cor_dominante_claro,
            cor_dominante_escuro: palette.cor_dominante_escuro,
            cor_assinatura_produto: palette.cor_assinatura_produto,
            fundo_legibilidade: palette.fundo_legibilidade,
          },
        };
      });
    };

    run();
    return () => { cancelled = true; };
  }, [product?.visual?.imagem_url]);

  useEffect(() => {

    if (manifest?.tenant_id) {
      const fetchFallback = async () => {
        try {
          const { data } = await supabase
            .from("tenants")
            .select("product_fallback_image_url")
            .eq("id", manifest.tenant_id)
            .single();
          
          if (data?.product_fallback_image_url) {
            setFallbackImageUrl(data.product_fallback_image_url);
          }
        } catch (err) {
          console.error("Error fetching fallback image:", err);
        }
      };
      fetchFallback();
    }
  }, [manifest?.tenant_id]);


  const appearance = useMemo(() => (manifest?.appearance_config || {}) as AppearanceConfig, [manifest]);

  const startHideTimer = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 8000);
  }, []);

  const formatPrice = useCallback((value: number | undefined | null) => {
    if (value === undefined || value === null) return "--";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }, []);

  // Scanner buffer global — captura keydown sem precisar de input focado.
  // Isso evita que o Android/Zebra abra o IME/teclado do sistema.
  const scanBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const scanCommitTimerRef = useRef<number | null>(null);
  const avoidIme = useMemo(() => {
    const ua = navigator.userAgent || "";
    const isMobileUa = /Android|iPhone|iPad|iPod/i.test(ua);
    const isTouch = (navigator.maxTouchPoints || 0) > 0;
    return isMobileUa || isTouch;
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    const handleResize = () => setIsVertical(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. CARREGAMENTO DO PLAYER
  useEffect(() => {
    const persistentId = DevicePersistenceService.getOrCreatePersistentId();
    
    // Se não houver deviceCode na URL, tenta usar o persistente
    if (!deviceCode && !isPreview) {
      console.log("[Player] No deviceCode in URL, redirecting to auto-load with:", persistentId);
      navigate(`/player-consulta/${persistentId}`, { replace: true });
      return;
    }

    async function initialize() {
      if (deviceCode) {
        const cached = ManifestManager.getManifest(deviceCode);
        if (cached && !isPreview) {
          setManifest(cached);
          setIsLoading(false);
        }
      }

      try {
        if (isPreview && previewPlaylistId) {
          const { data: playlist } = await supabase.from("playlists").select("*").eq("id", previewPlaylistId).single();
          const { data: items } = await supabase.from("playlist_items").select("*, media_items(*)").eq("playlist_id", previewPlaylistId);
          
          if (playlist && items) {
            const mapItems = (items: any[], appearanceConfig: any) => {
              const itemVolumes = (appearanceConfig as any)?.item_volumes || [];
              return items.map((it, idx) => {
                const media = Array.isArray(it.media_items) ? it.media_items[0] : it.media_items;
                return {
                  id: it.media_id,
                  type: it.tipo || media?.type,
                  url: media?.optimized_url || media?.file_url,
                  duration: it.duracao || media?.duration || 10,
                  volume: itemVolumes[idx] ?? 100,
                  name: media?.name
                };
              }).filter(i => i.url);
            };

            setManifest({ 
              items: mapItems(items || [], playlist.appearance_config), 
              updated_at: playlist.updated_at,
              appearance_config: playlist.appearance_config || {}
            });
          }
          setIsLoading(false);
          return;
        }

        if (deviceCode) {
          const result = await ManifestService.fetchManifest(deviceCode);
          if (result && result.manifest) {
            setManifest(result.manifest);
            setDeviceInfo(result.device);
            DevicePersistenceService.saveDeviceConfig(result.device);
            setIsLoading(false);
          } else {
            throw new Error("Erro ao buscar manifest");
          }
        }
      } catch (err: any) {
        console.error("Error initializing player:", err);
        // Se falhou ao buscar e não temos manifest, mas temos config salva, talvez o serial expirou ou mudou no banco
        if (!isPreview && deviceCode) {
          navigate("/setup", { state: { error: "Dispositivo não encontrado ou não configurado." } });
        }
        setIsLoading(false);
      }
    }

    initialize();
  }, [deviceCode, isPreview, previewPlaylistId, reloadKey]);

  // 1.5 Realtime Updates via Firebase
  useEffect(() => {
    if (isPreview) return;

    const codes = new Set<string>();
    if (deviceCode) codes.add(deviceCode);
    if (deviceInfo?.serial) codes.add(deviceInfo.serial);
    if (deviceInfo?.apelido_interno) codes.add(deviceInfo.apelido_interno);
    if (codes.size === 0) return;

    const unsubs = Array.from(codes).map((code) =>
      FirebaseRealtimeService.subscribeToDeviceUpdates(code, (payload) => {
        console.log("[Realtime] Sincronizando conteúdo via Firebase...", payload);
        setReloadKey((k) => k + 1);
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [deviceCode, deviceInfo?.serial, deviceInfo?.apelido_interno, isPreview]);

  // 1.8 Proactive Cache Management
  useEffect(() => {
    if (!manifest || !deviceCode || isPreview) return;

    const syncMediaCache = async () => {
      console.log("[Player] Syncing media cache for current manifest...");
      const items = ScheduleResolver.getActivePlaylist(manifest);
      const urls = items.map(item => item.url).filter(Boolean);

      // Cache all current items in background
      items.forEach(item => 
        MediaCacheService.cacheMedia(item.url, item.type, 0, deviceCode).catch(err => {
          console.warn("[Player] Background cache failed for:", item.url, err);
        })
      );

      // Clean old cache entries
      MediaCacheService.clearOldCache(urls);
    };

    syncMediaCache();
  }, [manifest, deviceCode, isPreview]);

  // 4. Background Sync (Polling) - Fallback silent check
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
        }
      } catch (err) {
        console.warn("[Player] Background sync failed", err);
      }
    };

    // Initial check immediately, then every 60s
    backgroundSync();
    const interval = setInterval(backgroundSync, 60000);
    
    return () => clearInterval(interval);
  }, [deviceCode, isPreview, reloadKey]);

  const activePlaylist = useMemo(() => ScheduleResolver.getActivePlaylist(manifest), [manifest]);

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
        const now = Date.now();
        const activeSessionKeys = new Set<string>();
        
        const options = new faceapi.TinyFaceDetectorOptions();
        const result = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions()
          .withAgeAndGender();

        const euclideanDistance = (a: Float32Array, b: Float32Array) => {
          const len = Math.min(a.length, b.length);
          let sum = 0;
          for (let i = 0; i < len; i++) {
            const d = a[i] - b[i];
            sum += d * d;
          }
          return Math.sqrt(sum);
        };

        const sessions = faceSessionsRef.current;
        const activeSessionCutoffMs = 2500;
        const matchThreshold = 0.48;

        const findBestSession = (descriptor: Float32Array) => {
          let bestKey: string | null = null;
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const [key, s] of Object.entries(sessions)) {
            if (now - s.lastSeenAt > activeSessionCutoffMs) continue;
            const dist = euclideanDistance(descriptor, s.descriptor);
            if (dist < bestDistance) {
              bestDistance = dist;
              bestKey = key;
            }
          }
          if (bestKey && bestDistance <= matchThreshold) {
            return { key: bestKey, distance: bestDistance };
          }
          return { key: null as string | null, distance: bestDistance };
        };

        const debugDetections: any[] = [];

        for (let index = 0; index < result.length; index++) {
          const face: any = result[index];
          const descriptor: Float32Array | undefined = face?.descriptor;
          if (!descriptor) continue;

          const expressions = face.expressions.asSortedArray();
          const mostProbableExpression = expressions[0];

          const match = findBestSession(descriptor);
          let sessionKey = match.key;

          if (!sessionKey) {
            sessionKey = `${sessionId}_person_${now}_${Math.random().toString(36).slice(2, 8)}`;
            sessions[sessionKey] = {
              startedAt: now,
              lastSeenAt: now,
              sessionKey,
              descriptor,
              ageSum: Math.round(face.age),
              ageCount: 1,
              gender: face.gender,
              genderProbability: face.genderProbability,
              emotion: mostProbableExpression.expression,
              emotionProbability: mostProbableExpression.probability,
            };
          } else {
            const s = sessions[sessionKey];
            s.lastSeenAt = now;
            s.descriptor = descriptor;
            s.ageSum += Math.round(face.age);
            s.ageCount += 1;
            s.gender = face.gender;
            s.genderProbability = face.genderProbability;
            s.emotion = mostProbableExpression.expression;
            s.emotionProbability = mostProbableExpression.probability;
          }

          activeSessionKeys.add(sessionKey);

          debugDetections.push({
            timestamp: new Date().toISOString(),
            faceIndex: index,
            sessionKey,
            matchDistance: Number.isFinite(match.distance) ? match.distance : null,
            age: Math.round(face.age),
            gender: face.gender,
            genderProbability: face.genderProbability,
            box: face.detection.box,
            expressions: expressions.map((exp: any) => ({
              expression: exp.expression,
              probability: exp.probability
            })),
            mostProbableExpression: {
              expression: mostProbableExpression.expression,
              probability: mostProbableExpression.probability
            }
          });
        }

        setCurrentFaceDetections(debugDetections);

        Object.keys(sessions).forEach((sessionKey) => {
          if (activeSessionKeys.has(sessionKey)) return;
          const session = sessions[sessionKey];
          if (!session) return;
          if (now - session.lastSeenAt < 1500) return;

          const di = deviceInfoRef.current;
          const mf = manifestRef.current;
          const validDeviceId = isValidUUID((di as any)?.device_uuid) ? (di as any).device_uuid : null;
          const validTenantId = isValidUUID(di?.tenant_id) ? di.tenant_id :
                                isValidUUID(mf?.tenant_id) ? mf.tenant_id : null;
          const durationMs = Math.max(0, session.lastSeenAt - session.startedAt);
          const screenTimeSeconds = Math.round(durationMs / 1000);

          if (durationMs > 0) {
            const age = session.ageCount > 0 ? Math.round(session.ageSum / session.ageCount) : null;
            supabase
              .from("audience_detections")
              .insert([{
                detected_at: new Date(session.lastSeenAt).toISOString(),
                age,
                gender: session.gender,
                emotion: session.emotion,
                emotion_confidence: null,
                gender_probability: session.genderProbability ?? null,
                device_id: validDeviceId,
                tenant_id: validTenantId,
                session_id: session.sessionKey,
                attention_seconds: screenTimeSeconds,
                screen_time: screenTimeSeconds,
                metadata: {
                  is_looking: false,
                  duration_ms: durationMs,
                  long_session: durationMs >= 60000,
                }
              }])
              .then(({ error }) => {
                if (error) console.error("[Face Detection] Error sending end-of-session to database:", error);
              });
          }

          delete sessions[sessionKey];
        });
      }, 1000); // Detect every 1 second
    };

    const cleanup = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      faceSessionsRef.current = {};
      
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

  // 2. CONFIGURAÇÕES NATIVAS (FULLSCREEN, ZOOM, SCROLL)
  useEffect(() => {
    // Bloquear Zoom e Scroll no nível do documento
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.getElementsByTagName('head')[0].appendChild(meta);

    // Bloquear scroll e seleção
    document.body.style.overflow = 'hidden';
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.touchAction = 'none';
    
    // Prevenção agressiva de zoom
    const preventZoom = (e: any) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
      if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '0')) e.preventDefault();
    };
    
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    window.addEventListener('touchstart', preventZoom, { passive: false });
    window.addEventListener('keydown', preventZoom);
    window.addEventListener('wheel', preventWheelZoom, { passive: false });

    // Tentar entrar em fullscreen ao carregar (precisa de interação em alguns browsers)
    const enterFullscreen = () => {
      const doc = window.document.documentElement;
      if (doc.requestFullscreen) doc.requestFullscreen();
      else if ((doc as any).webkitRequestFullscreen) (doc as any).webkitRequestFullscreen();
      else if ((doc as any).mozRequestFullScreen) (doc as any).mozRequestFullScreen();
      else if ((doc as any).msRequestFullscreen) (doc as any).msRequestFullscreen();
    };

    // Adiciona listener para garantir fullscreen na primeira interação
    window.addEventListener('click', enterFullscreen, { once: true });
    window.addEventListener('touchstart', enterFullscreen, { once: true });

    return () => {
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.touchAction = '';
      if (meta.parentNode) meta.parentNode.removeChild(meta);
    };
  }, []);

  const buildVisual = (ean: string | null | undefined, visual: any) => {
    const safeEan = typeof ean === "string" && ean.trim() ? ean.trim() : null;
    const mupaImage = safeEan ? MUPA_STATIC_IMAGE(safeEan) : null;
    const hasVisual = !!visual;
    
    return {
      imagem_url: ensureSafeImageUrl(visual?.imagem_url) || mupaImage || DEFAULT_PRODUCT_IMAGE,
      cor_assinatura_produto: visual?.cor_assinatura_produto || DEFAULT_VISUAL_COLORS.cor_assinatura_produto,
      fundo_legibilidade: visual?.fundo_legibilidade || DEFAULT_VISUAL_COLORS.fundo_legibilidade,
      cor_dominante_claro: visual?.cor_dominante_claro || DEFAULT_VISUAL_COLORS.cor_dominante_claro,
      cor_dominante_escuro: visual?.cor_dominante_escuro || DEFAULT_VISUAL_COLORS.cor_dominante_escuro,
    };
  };

  const handleResolvedProductImage = useCallback((resolvedUrl: string | null) => {
    if (!resolvedUrl) return;
    if (isDefaultImage(resolvedUrl)) return;
    setProduct((prev) => {
      if (!prev?.visual) return prev;
      if (prev.visual.imagem_url === resolvedUrl) return prev;
      return {
        ...prev,
        visual: {
          ...prev.visual,
          imagem_url: resolvedUrl,
        },
      };
    });
  }, []);

  const checkTradeMarketing = useCallback(async (ean: string) => {
    try {
      const now = Date.now();
      
      const { data: rules, error } = await supabase
        .from("trade_marketing_rules" as any)
        .select(`
          *,
          trade_marketing_campaigns (
            *,
            media:media_items (*)
          )
        `)
        .eq("ean", ean);

      if (error || !rules?.length) return;

      const validCampaigns = rules
        .map((r: any) => r.trade_marketing_campaigns)
        .filter((c: any) => c && c.is_active)
        .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0));

      const campaign = validCampaigns[0];
      if (!campaign) return;

      const lastDispatch = tradeCooldowns[campaign.id] || 0;
      if (now - lastDispatch < (campaign.cooldown_seconds || 60) * 1000) return;

      const minuteAgo = now - 60000;
      const recentDispatches = (tradeDispatchesPerMinute[campaign.id] || []).filter(ts => ts > minuteAgo);
      if (recentDispatches.length >= (campaign.max_dispatches_per_minute || 3)) return;

      setTradeCampaign(campaign);
      setIsTradeActive(true);

      setTradeCooldowns(prev => ({ ...prev, [campaign.id]: now }));
      setTradeDispatchesPerMinute(prev => ({ 
        ...prev, 
        [campaign.id]: [...recentDispatches, now] 
      }));

      supabase.from("media_events").insert({
        device_id: deviceInfo?.id,
        media_id: campaign.media_id,
        event_type: 'trade_dispatch',
        duration: campaign.display_time,
        metadata: {
          ean,
          trade_campaign_name: campaign.name,
          trade_campaign_id: campaign.id,
          serial: deviceInfo?.serial
        }
      }).then();

      setTimeout(() => {
        setIsTradeActive(false);
      }, (campaign.display_time || 10) * 1000);

    } catch (err) {
      console.error("[Trade] Error checking rules:", err);
    }
  }, [tradeCooldowns, tradeDispatchesPerMinute, deviceInfo]);

  const speakProduct = useCallback(async (p: ProductData) => {
    const name = (p?.description || "").trim();
    const prices = Array.isArray(p?.stock_prices) ? p.stock_prices : [];
    const main = prices.find((x) => Number(x.unit_pack) === 1) || prices.slice().sort((a, b) => Number(a.unit_pack) - Number(b.unit_pack))[0];
    const unitPack = Math.max(1, Number(main?.unit_pack || 1));
    const pricePack = Number(main?.price_pack || 0);
    const unitPrice = unitPack > 0 ? pricePack / unitPack : pricePack;
    const currency = unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const phrase = name ? `${name}. ${currency}.` : `${currency}.`;
    await speakText(phrase);
  }, [speakText]);

  const handleConsult = useCallback(async (ean: string) => {
    const cleanEan = ean.trim();
    if (!cleanEan || cleanEan.length < 3) return;
    
    if (isConsulting) return;

    lastSpokenEanRef.current = null;

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    checkTradeMarketing(cleanEan);

    const cachedKey = `product_${cleanEan}`;
    const cached = localStorage.getItem(cachedKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 86400000 || !navigator.onLine) {
          setProduct({
            ...parsed.data,
            is_cached: true,
            visual: buildVisual(cleanEan, parsed.data?.visual),
          });
          setError(null);
          setShowOverlay(true);
          setIsConsulting(false);
          setLastConsultedEan(cleanEan);
          startHideTimer();
          return;
        }
      } catch (e) {}
    }

    setIsConsulting(true);
    setShowOverlay(true);
    setError(null);
    setProduct(null);
    setLastConsultedEan(cleanEan);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('integra-assai', {
        body: { ean: cleanEan, store_id: deviceInfo?.num_filial || deviceInfo?.store_id }
      });

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);

      const finalProduct = { ...data, visual: buildVisual(cleanEan, data.visual) };
      setProduct(finalProduct);
      localStorage.setItem(cachedKey, JSON.stringify({ data: finalProduct, timestamp: Date.now() }));

    } catch (err: any) {
      setError("Produto não encontrado.");
    } finally {
      setIsConsulting(false);
      startHideTimer();
    }
  }, [isConsulting, startHideTimer, checkTradeMarketing, deviceInfo]);

  useEffect(() => {
    if (!showOverlay) return;
    if (!product?.ean) return;
    if (lastSpokenEanRef.current === product.ean) return;
    lastSpokenEanRef.current = product.ean;
    speakProduct(product).catch(() => {});
  }, [showOverlay, product, speakProduct]);


  // 4.5 Realtime Commands via Firebase
  useEffect(() => {
    if (isPreview) return;

    const codes = new Set<string>();
    if (deviceCode) codes.add(deviceCode);
    if (deviceInfo?.serial) codes.add(deviceInfo.serial);
    if (deviceInfo?.apelido_interno) codes.add(deviceInfo.apelido_interno);
    if (codes.size === 0) return;

    const unsubs = Array.from(codes).map((code) =>
      FirebaseRealtimeService.subscribeToCommands(code, (cmd) => {
        console.log("[Realtime] Comando recebido:", cmd);
        if (cmd.comando === "consultar" || cmd.comando === "consultar_produto") {
          const ean = cmd.payload?.ean || cmd.payload?.codigo;
          if (ean) {
            console.log("[Realtime] Executando consulta remota para EAN:", ean);
            handleConsult(ean);
          }
        } else if (cmd.comando === "recarregar" || cmd.comando === "reload") {
          window.location.reload();
        } else if (cmd.comando === "limpar_cache") {
          localStorage.clear();
          window.location.reload();
        }
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [deviceCode, deviceInfo?.serial, deviceInfo?.apelido_interno, isPreview, handleConsult]);

  // AUTO DEMO LOGIC
  useEffect(() => {
    if (!isAutoDemoActive || !isDevMode) return;

    const demoInterval = setInterval(() => {
      const actions = ["consult", "face", "media"];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];

      if (randomAction === "consult" && !showOverlay) {
        const demoEans = ["789100000001", "789100000002", "789100000003"];
        const randomEan = demoEans[Math.floor(Math.random() * demoEans.length)];
        
        // Simular consulta com dados mockados para o demo
        setShowOverlay(true);
        setIsConsulting(true);
        setTimeout(() => {
          setIsConsulting(false);
          setProduct({
            ean: randomEan,
            internal_id: Math.floor(Math.random() * 10000),
            description: `PRODUTO DEMONSTRAÇÃO MUPA ${Math.floor(Math.random() * 100)}`,
            stock_prices: [
              { unit_pack: 1, price_pack: 29.90, stock_avaliable: 50 },
              { unit_pack: 6, price_pack: 159.90, stock_avaliable: 20 }
            ],
            visual: {
              imagem_url: "",
              cor_assinatura_produto: "#06b6d4",
              fundo_legibilidade: "#000000",
              cor_dominante_claro: "#06b6d4",
              cor_dominante_escuro: "#083344"
            }
          });
          startHideTimer();
        }, 1000);
      } else if (randomAction === "face") {
        const mockFace = {
          faceIndex: Math.floor(Math.random() * 3),
          age: 25 + Math.floor(Math.random() * 20),
          gender: Math.random() > 0.5 ? "male" : "female",
          box: {
            x: 100 + Math.random() * 300,
            y: 100 + Math.random() * 200,
            width: 150,
            height: 150
          },
          mostProbableExpression: {
            expression: ["happy", "neutral", "surprised"][Math.floor(Math.random() * 3)],
            probability: 0.9
          }

        };
        setCurrentFaceDetections(prev => [mockFace, ...prev.slice(0, 2)]);
        setTimeout(() => setCurrentFaceDetections([]), 3000);
      }
    }, 12000);

    return () => clearInterval(demoInterval);
  }, [isAutoDemoActive, isDevMode, showOverlay]);

  const handleHiddenShortcut = () => {
    const now = Date.now();
    if (now - lastClickTime.current < 500) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 5) {
        setIsDevMode(!isDevMode);
        setClickCount(0);
        console.log("DEV MODE TOGGLED:", !isDevMode);
      }
    } else {
      setClickCount(1);
    }
    lastClickTime.current = now;
  };

  // Scanner Wedge global — mantém foco no input de consulta
  // sem abrir o teclado virtual (IME) no Android/Zebra usando inputMode="none".
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Se já estiver consultando, ignora novas teclas para evitar buffer sujo
      if (isConsulting) {
        // Opcional: e.preventDefault() aqui se quisermos bloquear totalmente
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) &&
        target !== inputRef.current
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 250) {
        scanBufferRef.current = "";
      }

      const commitScan = () => {
        const code = (scanBufferRef.current || inputRef.current?.value || "").trim();
        scanBufferRef.current = "";
        if (inputRef.current) inputRef.current.value = "";
        if (!code) return;
        if (code.length < 5) return;
        handleConsult(code);
      };
      
      // Terminadores comuns de scanner
      if (e.key === "Enter" || e.key === "Tab") {
        if (e.key === "Tab") e.preventDefault();
        if (scanCommitTimerRef.current) {
          window.clearTimeout(scanCommitTimerRef.current);
          scanCommitTimerRef.current = null;
        }
        commitScan();
        return;
      }

      if (e.key === "Backspace") {
        scanBufferRef.current = scanBufferRef.current.slice(0, -1);
        lastKeyTimeRef.current = now;
        if (inputRef.current) inputRef.current.value = scanBufferRef.current;
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        scanBufferRef.current += e.key;
        lastKeyTimeRef.current = now;
        if (inputRef.current) inputRef.current.value = scanBufferRef.current;

        if (scanCommitTimerRef.current) window.clearTimeout(scanCommitTimerRef.current);
        scanCommitTimerRef.current = window.setTimeout(() => {
          scanCommitTimerRef.current = null;
          commitScan();
        }, 180);
      }
    };

    window.addEventListener("keydown", handleGlobalKey, true); // Use capture to intercept before other handlers

    return () => {
      if (scanCommitTimerRef.current) {
        window.clearTimeout(scanCommitTimerRef.current);
        scanCommitTimerRef.current = null;
      }
      window.removeEventListener("keydown", handleGlobalKey, true);
    };
  }, [handleConsult, isConsulting]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const scheduleCommit = () => {
      if (isConsulting) return;
      if (scanCommitTimerRef.current) window.clearTimeout(scanCommitTimerRef.current);
      scanCommitTimerRef.current = window.setTimeout(() => {
        scanCommitTimerRef.current = null;
        const raw = (inputRef.current?.value || "").trim();
        const digits = raw.replace(/\D/g, "");
        scanBufferRef.current = digits;
        if (digits.length < 5) return;
        if (inputRef.current) inputRef.current.value = "";
        scanBufferRef.current = "";
        handleConsult(digits);
      }, 180);
    };

    const onInput = () => scheduleCommit();
    const onPaste = () => scheduleCommit();

    el.addEventListener("input", onInput);
    el.addEventListener("paste", onPaste);
    return () => {
      el.removeEventListener("input", onInput);
      el.removeEventListener("paste", onPaste);
    };
  }, [handleConsult, isConsulting]);

  // Garantir foco constante no input para scanners que funcionam como teclado (wedge)
  useEffect(() => {
    const maintainFocus = () => {
      // Só foca se o overlay estiver fechado e não estivermos em input manual
      if (!showOverlay && !showManualInput && document.activeElement !== inputRef.current) {
        inputRef.current?.focus({ preventScroll: true });
      }
    };

    // Foca imediatamente ao montar ou mudar estados
    maintainFocus();

    // Listener para quando o usuário clica fora ou o browser perde foco
    window.addEventListener("focus", maintainFocus);
    document.addEventListener("click", maintainFocus);

    // Intervalo de segurança para garantir que o foco volte se for perdido
    const interval = setInterval(maintainFocus, 1000);

    return () => {
      window.removeEventListener("focus", maintainFocus);
      document.removeEventListener("click", maintainFocus);
      clearInterval(interval);
    };
  }, [showOverlay, showManualInput, avoidIme]);

  // Bloquear long-press, context menu, seleção e copy/paste no kiosk
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("selectstart", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("paste", prevent);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("selectstart", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("paste", prevent);
    };
  }, []);

  const handleManualConsult = useCallback(async (productId: string) => {
    const cleanId = productId.trim();
    if (!cleanId) return;
    
    if (isConsulting) return;

    console.log("[Manual] Iniciando consulta:", cleanId);
    
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Try cache for manual ID too
    const cachedKey = `product_manual_${cleanId}`;
    const cached = localStorage.getItem(cachedKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 86400000 || !navigator.onLine) {
          console.log("[Manual] Usando cache para:", cleanId);
          setProduct({
            ...parsed.data,
            is_cached: true,
            visual: buildVisual(parsed.data?.ean, parsed.data?.visual),
          });
          setError(null);
          setShowOverlay(true);
          setIsConsulting(false);
          startHideTimer();
          return;
        }
      } catch (e) {
        console.warn("[Manual] Erro ao ler cache:", e);
      }
    }

    setIsConsulting(true);
    setShowOverlay(true);
    setError(null);
    setProduct(null);
    setLastConsultedEan(null);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Tempo esgotado ao consultar produto.")), 15000)
    );

    try {
      const result: any = await Promise.race([
        supabase.functions.invoke('integra-assai', {
          body: { 
            product_id: cleanId,
            store_id: deviceInfo?.num_filial || deviceInfo?.store_id 
          }
        }),
        timeoutPromise
      ]);

      const { data, error: functionError } = result;

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);
      if (!data) throw new Error("Produto não encontrado");

      console.log("[ASSAI_PRICE]", data.stock_prices);
      
      const finalProduct = {
        ...data,
        visual: buildVisual(data.ean, data.visual)
      };

      setProduct(finalProduct);
      
      localStorage.setItem(`product_manual_${cleanId}`, JSON.stringify({
        data: finalProduct,
        timestamp: Date.now()
      }));
      
      // Also save by EAN if available to sync caches
      if (data.ean) {
        localStorage.setItem(`product_${data.ean}`, JSON.stringify({
          data: finalProduct,
          timestamp: Date.now()
        }));
      }
    } catch (err: any) {
      console.error("Erro na consulta manual:", err);
      setError("Produto não localizado. Por favor, valide a sequência digitada.");
    } finally {
      setIsConsulting(false);
      startHideTimer();
    }
  }, [isConsulting, startHideTimer]);

  const getProductNameParts = (desc: string) => {
    if (!desc) return { main: "", rest: "" };
    const words = desc.split(" ");
    const main = words.slice(0, 3).join(" ");
    const rest = words.slice(3).join(" ");
    return { main, rest };
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn("fixed inset-0 bg-[#f8fafc] overflow-hidden select-none touch-none overscroll-none", !showCursor && "cursor-none")} onClick={() => enterFullscreen()} onTouchStart={() => enterFullscreen()}>
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

      <div className={cn("w-full h-full transition-all duration-700", (showOverlay && !isTradeActive) ? "blur-md opacity-50" : "blur-0 opacity-100")}>
        {isTradeActive && tradeCampaign?.media ? (
          <PlayerEngine 
            playlist={[{
              id: tradeCampaign.media.id,
              url: tradeCampaign.media.optimized_url || tradeCampaign.media.file_url,
              type: tradeCampaign.media.type,
              duration: tradeCampaign.display_time,
              name: tradeCampaign.media.name,
              volume: 100
            }]}
            onMediaChange={() => {}}
            serial={deviceInfo?.serial}
          />
        ) : (
          <PlayerEngine 
            playlist={activePlaylist} 
            onMediaChange={setCurrentIndex}
            serial={deviceInfo?.serial}
            volume={activePlaylist[currentIndex]?.volume ?? 100}
          />
        )}
      </div>

      {/* Camada de UI Overlays (Aparência) */}
      <div className={cn(
        "absolute inset-0 pointer-events-none p-6 md:p-10 flex flex-col justify-between transition-opacity duration-500",
        showOverlay ? "opacity-0" : "opacity-100"
      )}>
        {/* Header: Device Info & Clock */}
        <div className="flex items-start justify-between w-full">
          {/* Device Info */}
          {(appearance.show_device_name !== false && !isPreview) && (
            <div className="flex items-center gap-3 animate-fade-in bg-white/60 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-sm opacity-0">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-blue-600 grid place-items-center font-bold text-white shadow-lg shadow-primary/20">M</div>
              <div className="leading-tight text-slate-900">
                <div className="font-bold text-lg tracking-tight">
                  {deviceInfo?.apelido_interno || "Ponto de Consulta"}
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] opacity-60 font-mono font-bold">
                  {deviceInfo ? `Filial ${deviceInfo.num_filial}` : deviceInfo?.serial || deviceCode}
                </div>
              </div>
            </div>
          )}

          {/* Date/Time */}
          {(appearance.show_datetime !== false && !isPreview) && (
            <div 
              onClick={handleHiddenShortcut}
              className="text-right animate-fade-in bg-white/60 backdrop-blur-md p-3 rounded-xl border border-slate-200 text-slate-900 pointer-events-auto cursor-pointer active:scale-95 transition-transform shadow-sm opacity-0"
            >
              <div className="font-bold text-3xl tabular-nums tracking-tighter">
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
                appearance.logo.position === "top-left" && (appearance.show_device_name !== false) && "top-24",
                appearance.logo.position === "top-right" && (appearance.show_datetime !== false) && "top-24"
              )}
              style={{ 
                opacity: appearance.logo.opacity ?? 1,
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

          {/* Configurable Footer */}
          {appearance.footer?.enabled && (
            <div 
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-8 py-3 rounded-2xl backdrop-blur-md shadow-2xl border border-white/5 animate-fade-in max-w-[90%] pointer-events-none opacity-0"
              style={{ 
                backgroundColor: appearance.footer.background_color || "rgba(0, 0, 0, 0.6)",
                color: appearance.footer.text_color || "#fff",
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



      <AnimatePresence>
        {showOverlay && (
          <motion.div 
            initial={isTradeActive ? { opacity: 0, y: 100 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={cn(
              "fixed z-50 flex items-center justify-center overflow-hidden transition-all duration-500",
              isTradeActive 
                ? "bottom-0 left-0 right-0 h-[32%] bg-black/40 backdrop-blur-xl border-t border-white/10" 
                : "inset-0"
            )}
            style={!isTradeActive ? {
              backgroundColor: isDefaultImage(product?.visual?.imagem_url)
                ? (product?.visual?.fundo_legibilidade ? `${product.visual.fundo_legibilidade}F8` : 'rgba(0,51,153,0.98)')
                : (product?.visual?.cor_dominante_escuro || '#FFFFFF'),
              minHeight: '100dvh',
              paddingTop: 'max(1rem, env(safe-area-inset-top))',
              paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1.5rem))',
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))',
            } : {
              padding: '1.25rem'
            }}
          >
            {/* Fundo Dinâmico Premium com Gradientes e Glow */}
            {!isDefaultImage(product?.visual?.imagem_url) && product?.visual && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Gradiente de Base */}
                <div 
                  className="absolute inset-0 opacity-40"
                  style={{ 
                    background: `radial-gradient(circle at 50% 50%, ${product.visual.cor_dominante_claro}20 0%, ${product.visual.cor_dominante_escuro} 100%)` 
                  }}
                />
                
                {/* Glows Dinâmicos */}
                <div 
                  className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20 animate-pulse"
                  style={{ backgroundColor: product.visual.cor_assinatura_produto }}
                />
                <div 
                  className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20 animate-pulse"
                  style={{ backgroundColor: product.visual.cor_dominante_claro }}
                  transition-duration="5s"
                />

                {/* Camada de profundidade */}
                <div className="absolute inset-0 bg-black/10 backdrop-blur-[40px]" />
              </div>
            )}

            {isConsulting ? (
              <div className="flex flex-col items-center gap-8 text-white">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <Loader2 className="h-24 w-24 animate-spin text-primary relative z-10" />
                </div>
                <h2 className="text-[clamp(2rem,5vw,4rem)] font-black tracking-tight animate-pulse">PROCESSANDO...</h2>
              </div>
            ) : error ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-8 text-center max-w-2xl text-white"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
                  <AlertCircle className="h-32 w-32 text-red-500 relative z-10" />
                </div>
                <h2 className="text-[clamp(2.5rem,6vw,5rem)] font-black leading-none">OPS!</h2>
                <p className="text-[clamp(1.5rem,4vw,2.5rem)] text-white/80 leading-tight font-medium">{error}</p>
                <button 
                  onClick={() => setShowOverlay(false)}
                  className="mt-8 px-12 py-5 bg-white text-primary rounded-2xl text-2xl transition-all font-black shadow-2xl hover:scale-105 active:scale-95"
                >
                  TENTAR NOVAMENTE
                </button>
              </motion.div>
            ) : product && (
              <div
                className={cn(
                  "w-full h-full max-h-full min-h-0",
                  isTradeActive ? "grid grid-cols-[200px_1fr_250px] gap-8 items-center" : (isVertical ? "flex flex-col gap-6" : "grid grid-cols-2 gap-10 items-center"),
                )}
              >
                {/* IMAGEM (TOP) */}
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.45 }}
                  className={cn(
                    "rounded-[28px] overflow-hidden border shadow-[0_20px_60px_-20px_rgba(0,0,0,0.65)]",
                    isTradeActive ? "h-full w-full" : (isVertical ? "h-[34%] w-full" : "h-full w-full"),
                  )}
                  style={{
                    background: isTradeActive ? "white" : "linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.92) 100%)",
                    borderColor: "rgba(255,255,255,0.25)",
                  }}
                >
                  <div className="relative w-full h-full">
                    <OptimizedProductImage
                      src={product.visual?.imagem_url || null}
                      fallback={[
                        product.ean ? MUPA_STATIC_IMAGE(product.ean) : null,
                        fallbackImageUrl,
                        DEFAULT_PRODUCT_IMAGE,
                      ]}
                      ean={product.ean}
                      alt={product.description}
                      isDefaultImage={isDefaultImage(product.visual?.imagem_url)}
                      onResolvedSrc={handleResolvedProductImage}
                    />
                  </div>
                </motion.div>

                {/* CARD DE INFORMAÇÕES (BASE DO MOCK) */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.45 }}
                  className={cn(
                    "relative overflow-hidden rounded-[28px] border backdrop-blur-3xl shadow-[0_22px_70px_-26px_rgba(0,0,0,0.75)]",
                    isTradeActive ? "w-full h-full" : (isVertical ? "w-full flex-1 min-h-0" : "w-full h-full"),
                  )}
                  style={{
                    background: isTradeActive ? "rgba(255,255,255,0.05)" : `linear-gradient(180deg, ${(product.visual?.cor_dominante_escuro || "#003399")} 0%, ${(product.visual?.cor_dominante_claro || "#0B5CA8")} 140%)`,
                    borderColor: "rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 30% 15%, ${(product.visual?.cor_assinatura_produto || "#F36C21")}66 0%, transparent 55%)`,
                    }}
                  />

                  <div className="relative z-10 h-full p-6 md:p-10 flex flex-col gap-5 md:gap-7">
                    {/* TÍTULO */}
                    <div
                      className="rounded-2xl px-5 py-4 md:px-8 md:py-5"
                      style={{
                        background: "rgba(0,0,0,0.18)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <div className={isTradeActive ? "text-left" : "text-center"}>
                        <div
                          className={cn(
                            "font-black uppercase tracking-tight leading-tight text-white",
                            isTradeActive ? "text-[clamp(1.2rem,3vw,2rem)]" : "text-[clamp(1.6rem,5vw,3.25rem)]"
                          )}
                          style={{ fontFamily: "Satoshi, sans-serif" }}
                        >
                          {`${getProductNameParts(product.description).main} ${getProductNameParts(product.description).rest}`.trim()}
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const validPrices = (product.stock_prices || []).filter((p) => p.price_pack > 0);
                      if (validPrices.length === 0) {
                        return (
                          <div className="flex-1 grid place-items-center rounded-2xl border border-white/10 bg-white/5">
                            <div className="flex flex-col items-center gap-3 text-center text-white/80">
                              <Package className="w-14 h-14 text-white/20" />
                              <div className="text-sm font-black tracking-[0.25em] uppercase">PREÇO INDISPONÍVEL</div>
                            </div>
                          </div>
                        );
                      }

                      const mainPriceItem =
                        validPrices.find((p) => p.unit_pack === 1) ||
                        validPrices.reduce((prev, curr) => (prev.unit_pack < curr.unit_pack ? prev : curr));

                      const mainFinalPrice =
                        mainPriceItem.price_prom_pack && mainPriceItem.price_prom_pack > 0
                          ? mainPriceItem.price_prom_pack
                          : mainPriceItem.price_pack;

                      const normalizedPrices = validPrices
                        .map((p) => {
                          const total =
                            p.price_prom_pack && p.price_prom_pack > 0 ? p.price_prom_pack : p.price_pack;
                          const units = Number(p.unit_pack || 1);
                          const unitPrice = units > 0 ? total / units : total;
                          const hasPromo = !!(p.price_prom_pack && p.price_prom_pack > 0 && p.price_prom_pack < p.price_pack);
                          return { ...p, total, units, unitPrice, hasPromo };
                        })
                        .filter((p) => Number.isFinite(p.units) && p.units > 0 && Number.isFinite(p.total) && p.total > 0)
                        .sort((a, b) => a.units - b.units);

                      const unitPack = normalizedPrices.find((p) => p.units === 1) || normalizedPrices[0];
                      const unitFinalPrice = unitPack.unitPrice;

                      const promoPacks = normalizedPrices.filter((p) => p.units !== unitPack.units);
                      const bestPromo = promoPacks
                        .slice()
                        .sort((a, b) => a.unit_pack - b.unit_pack)[0];

                      const bestPromoFinal = bestPromo ? bestPromo.total : null;

                      const bestPromoUnits = bestPromo ? Number(bestPromo.unit_pack) : NaN;
                      const referenceUnitPrice = unitFinalPrice;
                      const promoUnitPrice = bestPromoFinal && Number.isFinite(bestPromoUnits) && bestPromoUnits > 0
                        ? bestPromoFinal / bestPromoUnits
                        : null;
                      const hasRealDiscount = promoUnitPrice !== null && promoUnitPrice < referenceUnitPrice;

                      const badgeLabel =
                        Number.isFinite(bestPromoUnits) && bestPromoUnits >= 2
                          ? `${bestPromoUnits}ª unidade`
                          : null;

                      return (
                        <>
                          {/* BADGES */}
                          <div className="flex items-center justify-center gap-3">
                            {hasRealDiscount && badgeLabel && (
                              <>
                                <div
                                  className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-white"
                                  style={{ backgroundColor: "#E11D48" }}
                                >
                                  DESCONTO!
                                </div>
                                <div
                                  className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-white"
                                  style={{ backgroundColor: "rgba(59,130,246,0.95)" }}
                                >
                                  {badgeLabel}
                                </div>
                              </>
                            )}
                          </div>

                          {/* PREÇO PRINCIPAL */}
                          <div
                            className="rounded-2xl border px-6 py-5 md:px-8 md:py-6"
                            style={{
                              background: "rgba(0,0,0,0.22)",
                              borderColor: "rgba(255,255,255,0.12)",
                            }}
                          >
                            <div className="text-center">
                              <div className="text-white/70 text-xs md:text-sm font-black uppercase tracking-[0.25em]">
                                Preço por unidade
                              </div>
                              <div className="mt-2 flex items-end justify-center gap-2 md:gap-3">
                                <div className="text-white/70 text-xl md:text-2xl font-black leading-none">R$</div>
                                <div
                                  className="text-white text-[clamp(4.6rem,13vw,8rem)] leading-[0.85] font-black tracking-tight"
                                  style={{ fontFamily: "Bebas Neue, sans-serif" }}
                                >
                                  {formatPrice(unitFinalPrice).replace("R$", "").trim()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* DEMAIS PREÇOS */}
                          {normalizedPrices.length > 1 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {normalizedPrices
                                .filter((p) => p.units !== unitPack.units)
                                .slice(0, 3)
                                .map((p) => (
                                  <div
                                    key={`price-${p.units}`}
                                    className="relative rounded-2xl border border-white/10 bg-white/5 p-3 aspect-square"
                                  >
                                    <div className="absolute top-3 left-3 right-3 text-white/80 text-[11px] md:text-xs font-black uppercase tracking-wide text-center leading-none">
                                      PACK {p.units} UN
                                    </div>
                                    <div className="h-full w-full grid place-items-center pt-4">
                                      <div className="text-center">
                                        <div className="text-white text-2xl md:text-3xl font-black leading-none">
                                          {formatPrice(p.total)}
                                        </div>
                                        <div className="mt-1 text-white/60 text-[11px] md:text-xs font-bold leading-none">
                                          {formatPrice(p.unitPrice)}/un
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* TOTAL PROMO */}
                          {hasRealDiscount && bestPromoFinal && Number.isFinite(bestPromoUnits) && bestPromoUnits >= 2 && (
                            <div className="mt-1 rounded-2xl border border-white/10 bg-white/5 p-5">
                              <div className="text-white/70 text-xs md:text-sm font-bold">
                                Valor total das {bestPromoUnits} unidades:
                              </div>
                              <div className="mt-3 inline-flex items-center rounded-xl px-5 py-3 font-black text-white text-2xl md:text-3xl"
                                style={{ backgroundColor: "#16A34A" }}
                              >
                                {formatPrice(bestPromoFinal)}
                              </div>
                            </div>
                          )}

                          {/* EAN & Trade Info */}
                          <div className="mt-auto pt-2 flex items-center justify-between">
                            <div className="text-white/55 text-[11px] font-bold tracking-widest uppercase">
                              Código: {product.ean}
                            </div>
                            {isTradeActive && tradeCampaign && (
                              <div className="flex items-center gap-2 bg-primary/20 px-3 py-1 rounded-full border border-primary/30">
                                <Megaphone className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-black uppercase text-primary tracking-tighter">Trade Ativo: {tradeCampaign.name}</span>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>

                {/* Terceira Coluna: EAN e Badge (Apenas Trade Mode) */}
                {isTradeActive && (
                  <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="h-full flex flex-col justify-center items-center gap-6"
                  >
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md flex flex-col items-center gap-4 w-full">
                       <Barcode className="w-12 h-12 text-white/20" />
                       <div className="text-center">
                         <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">EAN Escaneado</p>
                         <p className="text-xl font-mono font-bold text-white">{product.ean}</p>
                       </div>
                    </div>
                    
                    {tradeCampaign?.media && (
                      <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 w-full flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                           <Megaphone className="w-5 h-5 text-primary" />
                        </div>
                        <div className="leading-tight">
                           <p className="text-[10px] font-bold text-white/40 uppercase">Campanha Trade</p>
                           <p className="text-xs font-black text-white uppercase line-clamp-1">{tradeCampaign.name}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      <Input
        ref={inputRef}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 opacity-0 pointer-events-none"
        placeholder="AGUARDANDO LEITURA..."
        autoFocus
        inputMode="none"
        autoComplete="off"
        readOnly={false}
        tabIndex={avoidIme ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const code = e.currentTarget.value.trim();
            if (code) {
              console.log("[Input] Enter detectado via teclado. Valor:", code);
              e.currentTarget.value = "";
              scanBufferRef.current = "";
              handleConsult(code);
            }
          }
        }}
      />

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-0 pointer-events-none select-none">
        <AnimatePresence>
          {!showOverlay && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 md:px-6 md:py-3 bg-white/60 backdrop-blur-md rounded-full border border-slate-200 flex items-center gap-3 shadow-sm"
            >
              <Barcode className="w-4 h-4 md:w-5 md:h-5 text-primary animate-pulse" />
              <span className="text-slate-700 text-[10px] md:text-xs lg:text-sm font-bold uppercase tracking-widest whitespace-nowrap">Aguardando leitura de código</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-slate-600 text-[8px] uppercase tracking-tighter text-center opacity-60 hover:opacity-100 transition-opacity font-bold">
          Mupa Desenvolvimento de Solucoes Tecnologicas LTDA - 50.667.125/0001-48
        </div>
      </div>

      {isDevMode && (
        <button
          type="button"
          onClick={() => {
            ensureAudioUnlocked().catch(() => {});
            handleConsult("7896098900222");
          }}
          className="absolute bottom-4 left-4 z-[70] rounded-full border border-white/10 bg-black/60 backdrop-blur-md px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:text-white"
        >
          TESTE EAN
          {ttsDebug?.status ? (
            <span className="ml-2 font-mono font-bold text-white/60">
              {ttsDebug.status}{ttsDebug.error ? `:${ttsDebug.error}` : ""}
            </span>
          ) : null}
        </button>
      )}

      <button
        type="button"
        onClick={() => setShowFaceDetections(v => !v)}
        className={cn(
          "absolute bottom-4 right-4 z-[70] rounded-full border border-slate-200 bg-white/60 backdrop-blur-md p-2 text-slate-400 transition-all shadow-sm",
          "hover:bg-white/80 hover:text-slate-600",
          showFaceDetections && "bg-white text-slate-900 border-slate-300 shadow-md"
        )}
        aria-label="Detecções da câmera"
      >
        <User className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {showFaceDetections && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-16 right-4 z-[70] w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-black/60 backdrop-blur-md p-3 text-white"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-white/70" />
                <div className="text-xs font-semibold uppercase tracking-widest text-white/70">Detecções</div>
              </div>
              <button
                type="button"
                onClick={() => setShowFaceDetections(false)}
                className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-white/50">
              <span>{modelsLoaded ? "Modelos OK" : "Modelos..."}</span>
              <span>{faceDetectionActive ? "Câmera OK" : "Câmera..."}</span>
              <span className="font-mono">{currentFaceDetections.length} rosto(s)</span>
            </div>

            <div className="mt-3 space-y-2 max-h-56 overflow-auto">
              {currentFaceDetections.length === 0 ? (
                <div className="text-xs text-white/40">Nenhuma detecção no momento.</div>
              ) : (
                currentFaceDetections.map((d: any) => (
                  <div key={`${d.faceIndex}-${d.timestamp}`} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/50 font-mono">#{d.faceIndex}</span>
                      <span className="text-[10px] text-white/30 font-mono">{new Date(d.timestamp).toLocaleTimeString("pt-BR")}</span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                      <div className="text-white/70">Idade: <span className="text-white/90 font-semibold">{d.age}</span></div>
                      <div className="text-white/70">Gênero: <span className="text-white/90 font-semibold">{d.gender}</span></div>
                      <div className="text-white/70 col-span-2">
                        Emoção: <span className="text-white/90 font-semibold">{d.mostProbableExpression?.expression}</span>{" "}
                        <span className="text-white/40">({Math.round((d.mostProbableExpression?.probability || 0) * 100)}%)</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallModal 
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onInstall={() => {
          installPwa();
          setShowInstallModal(false);
        }}
      />
      <DevShowcaseOverlay 
        isDevMode={isDevMode}
        deviceInfo={deviceInfo}
        currentFaceDetections={currentFaceDetections}
        lastProduct={product}
        currentMedia={manifest?.items?.[currentIndex]}
        onToggleAutoDemo={setIsAutoDemoActive}
        isAutoDemoActive={isAutoDemoActive}
      />
    </div>
  );
}

