import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, ScheduleResolver, MediaCacheService } from "@/components/PlayerServices";
import { ManifestService } from "@/services/ManifestService";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Package, AlertCircle, Barcode, User, X, Info, Search, Play } from "lucide-react";
import { OptimizedProductImage } from "@/components/OptimizedProductImage";
import { Input } from "@/components/ui/input";
import * as faceapi from "face-api.js";
import { useKioskMode } from "@/hooks/useKioskMode";
import { PWAInstallModal } from "@/components/PWAInstallModal";
import { DevShowcaseOverlay } from "@/components/DevShowcaseOverlay";
import { DevicePersistenceService } from "@/services/DevicePersistenceService";
import { extractColorsFromImage } from "@/utils/colorExtractor";

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
  const navigate = useNavigate();
  const { deviceCode } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const previewPlaylistId = searchParams.get("id");
  const isDevModeParam = searchParams.get("dev") === "true";

  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // DEV MODE STATE
  const [isDevMode, setIsDevMode] = useState(isDevModeParam);
  const [isAutoDemoActive, setIsAutoDemoActive] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const lastClickTime = useRef(0);

  useEffect(() => {
    if (deferredPrompt && !isPwaInstalled) {
      const timer = setTimeout(() => setShowInstallModal(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, isPwaInstalled]);

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



  const [isVertical, setIsVertical] = useState(window.innerHeight > window.innerWidth);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [showFaceDetections, setShowFaceDetections] = useState(false);
  const [currentFaceDetections, setCurrentFaceDetections] = useState<any[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const lastDetectionsRef = useRef<{ [key: number]: number }>({});
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
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!product?.visual?.imagem_url || isDefaultImage(product.visual.imagem_url)) return;

    const updateColors = async () => {
      // O prompt diz "alimentar a paleta dinâmica", então vamos extrair sempre que a imagem mudar.
      const colors = await extractColorsFromImage(product.visual!.imagem_url);
      if (colors) {
        setProduct(prev => {
          if (!prev) return prev;
          
          // Evita atualização se as cores principais já forem as mesmas para evitar re-renders infinitos
          if (prev.visual?.cor_assinatura_produto === colors.cor_assinatura_produto && 
              prev.visual?.cor_dominante_escuro === colors.cor_dominante_escuro &&
              prev.visual?.fundo_legibilidade === colors.fundo_legibilidade) {
            return prev;
          }

          return {
            ...prev,
            visual: {
              ...prev.visual!,
              ...colors
            }
          };
        });
      }
    };

    updateColors();
  }, [product?.visual?.imagem_url]);

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
            const mappedItems = items.map(it => {
              const media = Array.isArray(it.media_items) ? it.media_items[0] : it.media_items;
              return {
                id: it.media_id,
                type: it.tipo || media?.type,
                url: media?.optimized_url || media?.file_url,
                duration: it.duracao || media?.duration || 10,
                name: media?.name
              };
            }).filter(i => i.url);

            setManifest({ items: mappedItems, updated_at: playlist.updated_at });
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
  }, [deviceCode, isPreview, previewPlaylistId]);

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
        const activeIndices = new Set<number>();
        
        const options = new faceapi.TinyFaceDetectorOptions();
        const result = await faceapi
          .detectAllFaces(videoRef.current, options)
          .withFaceLandmarks()
          .withFaceExpressions()
          .withAgeAndGender();

        const debugDetections = result.map((face, index) => {
          const expressions = face.expressions.asSortedArray();
          const mostProbableExpression = expressions[0];

          return {
            timestamp: new Date().toISOString(),
            faceIndex: index,
            age: Math.round(face.age),
            gender: face.gender,
            genderProbability: face.genderProbability,
            box: face.detection.box, // Add box coordinates
            expressions: expressions.map((exp: any) => ({
              expression: exp.expression,
              probability: exp.probability
            })),
            mostProbableExpression: {
              expression: mostProbableExpression.expression,
              probability: mostProbableExpression.probability
            }
          };
        });
        setCurrentFaceDetections(debugDetections);

        
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

  const handleConsult = useCallback(async (ean: string) => {
    const cleanEan = ean.trim();
    if (!cleanEan || cleanEan.length < 3) return;
    
    if (isConsulting) {
      console.log("[Scanner] Consulta em andamento, ignorando:", cleanEan);
      return;
    }

    console.log("[EAN] Iniciando consulta:", cleanEan);
    
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    // Check cache BEFORE showing loader to make it truly instant for cached products
    const cachedKey = `product_${cleanEan}`;
    const cached = localStorage.getItem(cachedKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 86400000 || !navigator.onLine) { // 24h cache or offline
          console.log("[Consulta] Usando cache para:", cleanEan);
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
      } catch (e) {
        console.warn("[Consulta] Erro ao ler cache:", e);
      }
    }

    // Not in cache or expired, show loader
    setIsConsulting(true);
    setShowOverlay(true);
    setError(null);
    setProduct(null);
    setLastConsultedEan(cleanEan);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Tempo esgotado ao consultar produto.")), 15000)
    );

    try {
      const result: any = await Promise.race([
        supabase.functions.invoke('integra-assai', {
          body: { 
            ean: cleanEan,
            store_id: deviceInfo?.num_filial || deviceInfo?.store_id 
          }
        }),
        timeoutPromise
      ]);

      const { data, error: functionError } = result;

      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);
      if (!data) throw new Error("Produto não encontrado");

      console.log("[SEQPRODUTO]", data.internal_id);

      const finalProduct = {
        ...data,
        visual: buildVisual(cleanEan, data.visual)
      };

      setProduct(finalProduct);
      
      localStorage.setItem(cachedKey, JSON.stringify({
        data: finalProduct,
        timestamp: Date.now()
      }));

    } catch (err: any) {
      console.error("Erro na consulta:", err);
      setError("Não encontramos este produto em nossos registros. Verifique o código e tente novamente.");
    } finally {
      setIsConsulting(false);
      startHideTimer();
    }
  }, [isConsulting, startHideTimer]);

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
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 150) {
        scanBufferRef.current = "";
      }
      
      // Se for Enter, processa a consulta
      if (e.key === "Enter") {
        const code = (scanBufferRef.current || inputRef.current?.value || "").trim();
        if (code) {
          console.log("[Scanner] Enter detectado. Valor:", code);
          // Limpa o input IMEDIATAMENTE para evitar que a próxima leitura pegue restos
          scanBufferRef.current = "";
          if (inputRef.current) inputRef.current.value = "";
          handleConsult(code);
        }
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
      }
    };

    window.addEventListener("keydown", handleGlobalKey, true); // Use capture to intercept before other handlers

    return () => {
      window.removeEventListener("keydown", handleGlobalKey, true);
    };
  }, [handleConsult, isConsulting]);

  // Garantir foco ao fechar o overlay
  useEffect(() => {
    if (avoidIme) return;
    if (showOverlay || showManualInput) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(timer);
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

      <div className={cn("w-full h-full transition-all duration-700", showOverlay ? "blur-md opacity-50" : "blur-0 opacity-100")}>
        <PlayerEngine 
          playlist={activePlaylist} 
          onMediaChange={setCurrentIndex}
          serial={deviceInfo?.serial}
        />
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 lg:p-16 overflow-hidden"
            style={{ 
              backgroundColor: isDefaultImage(product?.visual?.imagem_url)
                ? (product?.visual?.fundo_legibilidade ? `${product.visual.fundo_legibilidade}F8` : 'rgba(0,51,153,0.98)')
                : (product?.visual?.cor_dominante_escuro || '#FFFFFF'),
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
              <div className={cn(
                "w-full h-full flex gap-8 md:gap-20",
                isVertical ? "flex-col" : "flex-row items-stretch"
              )}>
                {/* CONTAINER DA IMAGEM */}
                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className={cn(
                    "relative flex items-center justify-center rounded-[64px] group overflow-visible",
                    isVertical ? "h-[40%] w-full" : "w-[40%] h-full"
                  )}
                >
                  {/* Container da Imagem com Visual Enterprise */}
                  <div 
                    className="relative w-full h-full flex items-center justify-center rounded-[64px] border border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
                    style={{ 
                      background: isDefaultImage(product.visual?.imagem_url)
                        ? `linear-gradient(135deg, ${product.visual?.cor_dominante_escuro || '#003399'} 0%, ${product.visual?.cor_dominante_claro || '#001f5c'} 100%)`
                        : `linear-gradient(145deg, #FFFFFF 0%, ${product.visual?.cor_dominante_claro || '#F8F9FA'} 100%)`,
                    }}
                  >
                    {/* Glow interno leve */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                    
                    <OptimizedProductImage 
                      src={product.visual?.imagem_url || (product.ean ? MUPA_STATIC_IMAGE(product.ean) : DEFAULT_PRODUCT_IMAGE)}
                      fallback={fallbackImageUrl || DEFAULT_PRODUCT_IMAGE}
                      ean={product.ean}
                      alt={product.description}
                      isDefaultImage={isDefaultImage(product.visual?.imagem_url)}
                    />
                  </div>

                  {/* Sombra de profundidade externa */}
                  {!isDefaultImage(product.visual?.imagem_url) && (
                    <div 
                      className="absolute -inset-4 blur-3xl opacity-20 -z-10 rounded-full"
                      style={{ backgroundColor: product.visual?.cor_dominante_escuro }}
                    />
                  )}
                </motion.div>

                {/* CONTEÚDO DO PRODUTO */}
                <div className={cn(
                  "flex flex-col justify-between py-2",
                  isVertical ? "h-[58%] w-full" : "w-[58%] h-full"
                )}>
                  <div className="space-y-8">
                    {/* Descrição com Fundo de Destaque Dinâmico */}
                    <motion.div 
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="rounded-[40px] p-10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.3)] relative overflow-hidden border border-white/20"
                      style={{ 
                        background: isDefaultImage(product.visual?.imagem_url)
                          ? (product.visual?.cor_assinatura_produto || '#F36C21')
                          : `linear-gradient(135deg, ${product.visual?.cor_assinatura_produto || '#F36C21'} 0%, ${product.visual?.cor_dominante_claro || '#F36C21'} 100%)`,
                        color: getContrastColor(product.visual?.cor_assinatura_produto || '#F36C21')
                      }}
                    >
                      {/* Efeito de brilho no card */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                      
                      <div className="relative z-10 space-y-2">
                        <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-black leading-tight uppercase tracking-tight" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                          {getProductNameParts(product.description).main}
                        </h1>
                        <p className="text-[clamp(1.2rem,3vw,2.2rem)] font-medium leading-none opacity-90" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                          {getProductNameParts(product.description).rest}
                        </p>
                      </div>

                      {/* Glow dinâmico interno */}
                      <div 
                        className="absolute -right-10 -top-10 w-40 h-40 blur-3xl opacity-30 rounded-full"
                        style={{ backgroundColor: 'white' }}
                      />
                    </motion.div>
                  </div>

                  {/* PREÇO E VALORES */}
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-6"
                  >
                    {(!product.stock_prices || product.stock_prices.filter(p => p.price_pack > 0).length === 0) ? (
                      <div className="p-12 rounded-[40px] bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center gap-4 backdrop-blur-xl">
                        <Package className="w-20 h-20 text-white/10" />
                        <span className="text-white/40 text-2xl font-black uppercase tracking-[0.3em]">PREÇO INDISPONÍVEL</span>
                      </div>
                    ) : (() => {
                      const validPrices = product.stock_prices.filter(p => p.price_pack > 0);
                      const mainPriceItem = validPrices.find(p => p.unit_pack === 1) || 
                                           validPrices.reduce((prev, curr) => prev.unit_pack < curr.unit_pack ? prev : curr);
                      
                      const promoPacks = validPrices.filter(p => p.unit_pack !== mainPriceItem.unit_pack);
                      
                      const mainFinalPrice = mainPriceItem.price_prom_pack && mainPriceItem.price_prom_pack > 0 ? mainPriceItem.price_prom_pack : mainPriceItem.price_pack;

                      return (
                        <div className="space-y-6">
                          {/* Container Preço Principal */}
                          <motion.div 
                            animate={{ 
                              boxShadow: [
                                "0 32px 64px -16px rgba(0,0,0,0.4)",
                                `0 32px 80px -16px ${(product.visual?.cor_assinatura_produto || '#F36C21')}40`,
                                "0 32px 64px -16px rgba(0,0,0,0.4)"
                              ]
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="p-10 md:p-14 rounded-[56px] relative overflow-hidden border border-white/10 flex flex-col items-center justify-center min-h-[300px] w-full"
                            style={{ 
                              background: isDefaultImage(product.visual?.imagem_url)
                                ? 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)'
                                : `linear-gradient(180deg, ${product.visual?.cor_dominante_claro || '#FFFFFF'} 0%, ${product.visual?.cor_dominante_claro}EE 100%)`,
                              backdropFilter: 'blur(40px)',
                            }}
                          >
                            {/* Glow de fundo no card de preço */}
                            <div 
                              className="absolute inset-0 opacity-10 pointer-events-none"
                              style={{ 
                                background: `radial-gradient(circle at center, ${product.visual?.cor_assinatura_produto || '#F36C21'} 0%, transparent 70%)` 
                              }}
                            />
                            
                            <div className="relative z-10 flex flex-col items-center">
                              <span 
                                className="text-[1.2rem] font-black uppercase tracking-[0.4em] mb-4 opacity-60"
                                style={{ color: isDefaultImage(product.visual?.imagem_url) ? '#FFFFFF' : '#333333' }}
                              >
                                PREÇO EXCLUSIVO
                              </span>

                              <div className="flex items-start gap-3 md:gap-5">
                                <span 
                                  className="text-4xl md:text-6xl font-black mt-4 md:mt-8"
                                  style={{ color: product.visual?.cor_assinatura_produto || '#F36C21' }}
                                >
                                  R$
                                </span>
                                <span 
                                  className="text-[clamp(9rem,20vw,17rem)] leading-[0.7] font-black tracking-tighter" 
                                  style={{ 
                                    fontFamily: 'Bebas Neue, sans-serif',
                                    color: isDefaultImage(product.visual?.imagem_url) ? '#FFFFFF' : '#333333',
                                    filter: isDefaultImage(product.visual?.imagem_url) 
                                      ? `drop-shadow(0 0 30px ${product.visual?.cor_assinatura_produto || '#F36C21'}60)`
                                      : 'none'
                                  }}
                                >
                                  {formatPrice(mainFinalPrice).replace('R$', '').trim()}
                                </span>
                              </div>
                            </div>
                            
                            {/* Barra de destaque inferior */}
                            <div 
                              className="absolute bottom-0 left-0 right-0 h-3" 
                              style={{ 
                                background: `linear-gradient(90deg, transparent, ${product.visual?.cor_assinatura_produto || '#F36C21'}, transparent)`,
                                boxShadow: `0 0 20px ${product.visual?.cor_assinatura_produto || '#F36C21'}`
                              }} 
                            />
                          </motion.div>

                          {/* Preços de Atacado / Packs */}
                          {promoPacks.length > 0 && (
                            <div className={cn(
                              "grid gap-4",
                              promoPacks.length > 1 ? "grid-cols-2" : "grid-cols-1"
                            )}>
                              {promoPacks.slice(0, 2).map((price, idx) => {
                                const finalPrice = price.price_prom_pack && price.price_prom_pack > 0 ? price.price_prom_pack : price.price_pack;
                                const currentUnitPrice = finalPrice / price.unit_pack;
                                
                                const referenceUnitPrice = mainFinalPrice / mainPriceItem.unit_pack;
                                const economyPercent = referenceUnitPrice > currentUnitPrice ? Math.round(((referenceUnitPrice - currentUnitPrice) / referenceUnitPrice) * 100) : 0;
                                
                                const isWholesale = price.whole_sale && Number(price.whole_sale) > 1;
                                const label = isWholesale ? `A PARTIR DE ${price.whole_sale} UN` : `PACK ${price.unit_pack} UN`;

                                return (
                                  <div 
                                    key={`pack-${idx}`}
                                    className="p-8 rounded-[48px] border backdrop-blur-3xl relative overflow-hidden group min-h-[160px] flex flex-col justify-center transition-all hover:scale-[1.02]"
                                    style={{
                                      background: isDefaultImage(product.visual?.imagem_url) 
                                        ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)' 
                                        : `linear-gradient(135deg, ${product.visual?.cor_dominante_claro || '#FFFFFF'} 0%, #F8F9FA 100%)`,
                                      borderColor: isDefaultImage(product.visual?.imagem_url) ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                                    }}
                                  >
                                    {/* Destaque sutil lateral */}
                                    <div 
                                      className="absolute left-0 top-0 bottom-0 w-2 opacity-50"
                                      style={{ backgroundColor: product.visual?.cor_assinatura_produto }}
                                    />

                                    <div className="flex justify-end items-start mb-3">
                                      {economyPercent > 0 && (
                                        <span 
                                          className="text-white text-[10px] font-black px-3 py-1 rounded-full"
                                          style={{ backgroundColor: product.visual?.cor_assinatura_produto || '#F36C21' }}
                                        >
                                          -{economyPercent}%
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span 
                                        className="text-2xl font-black"
                                        style={{ color: product.visual?.cor_assinatura_produto || '#F36C21' }}
                                      >
                                        R$
                                      </span>
                                      <span 
                                        className="text-6xl md:text-7xl font-black tracking-tighter"
                                        style={{ 
                                          fontFamily: 'Bebas Neue, sans-serif',
                                          color: isDefaultImage(product.visual?.imagem_url) ? '#FFFFFF' : '#333333'
                                        }}
                                      >
                                        {formatPrice(finalPrice).replace('R$', '').trim()}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </motion.div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input visível mas estilizado para integração com o layout */}
      <div className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
        showOverlay ? "opacity-0 pointer-events-none translate-y-4" : "opacity-100 translate-y-0"
      )}>
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-blue-400/30 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative flex items-center bg-white/80 backdrop-blur-xl rounded-xl border border-slate-200 p-1 pr-4 shadow-xl">
            <div className="p-3 text-primary/80">
              <Barcode className="w-5 h-5" />
            </div>
            <Input 
              ref={inputRef}
              className="w-64 md:w-80 bg-transparent border-none text-slate-900 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg font-mono tracking-widest font-bold"
              placeholder="AGUARDANDO LEITURA..."
              autoFocus={!avoidIme}
              inputMode="none"
              autoComplete="off"
              readOnly={avoidIme}
              tabIndex={avoidIme ? -1 : 0}
              onFocus={(e) => {
                if (avoidIme) e.currentTarget.blur();
              }}
            />
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
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

