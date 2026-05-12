import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, ScheduleResolver, MediaCacheService } from "@/components/PlayerServices";
import { ManifestService } from "@/services/ManifestService";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Package, AlertCircle, Barcode, User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import * as faceapi from "face-api.js";

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

const isValidUUID = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export default function PlayerConsulta() {
  const navigate = useNavigate();
  const { deviceCode } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const previewPlaylistId = searchParams.get("id");

  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // MODO CONSULTA STATE
  const [showOverlay, setShowOverlay] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [lastConsultedEan, setLastConsultedEan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Removido inputRef pois a captura agora é global via keydown
  const [inputValue, setInputValue] = useState("");

  const [isVertical, setIsVertical] = useState(window.innerHeight > window.innerWidth);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [faceDetectionActive, setFaceDetectionActive] = useState(false);
  const [showFaceDetections, setShowFaceDetections] = useState(false);
  const [currentFaceDetections, setCurrentFaceDetections] = useState<any[]>([]);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const lastDetectionsRef = useRef<{ [key: number]: number }>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsVertical(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. CARREGAMENTO DO PLAYER
  useEffect(() => {
    if (!deviceCode && !isPreview) {
      navigate("/setup");
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
          setManifest(result.manifest);
          setDeviceInfo(result.device);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error initializing player:", err);
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
            // Get the most probable expression
            const expressions = face.expressions.asSortedArray();
            const mostProbableExpression = expressions[0];
            
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
            const now = Date.now();
            const lastSent = lastDetectionsRef.current[index] || 0;
            const timeSinceLastSent = now - lastSent;
            
            if (timeSinceLastSent >= 5000) { // 5 seconds cooldown
              // Send data to audience_detections table
              try {
                const validDeviceId = isValidUUID(deviceInfo?.id) ? deviceInfo.id : null;
                const validTenantId = isValidUUID(deviceInfo?.tenant_id) ? deviceInfo.tenant_id : 
                                      isValidUUID(manifest?.tenant_id) ? manifest.tenant_id : null;
                
                const detectionData = {
                  detected_at: new Date().toISOString(),
                  age: Math.round(face.age),
                  gender: face.gender,
                  emotion: mostProbableExpression.expression,
                  emotion_confidence: null,
                  gender_probability: null,
                  device_id: validDeviceId,
                  tenant_id: validTenantId,
                  session_id: `${sessionId}_person_${index}`,
                  metadata: {
                    is_looking: true,
                    duration_ms: 0,
                    long_session: false,
                    face_index: index
                  }
                };
                
                const { error } = await supabase
                  .from("audience_detections")
                  .insert(detectionData);
                
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
      }, 1000); // Detect every 1 second
    };

    const cleanup = () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      
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

  const handleConsult = useCallback(async (ean: string) => {
    // Limpar EAN para evitar problemas com espaços ou caracteres invisíveis
    const cleanEan = ean.trim();
    console.log("[Consulta] Iniciando para EAN:", cleanEan);
    setIsConsulting(true);
    setShowOverlay(true);
    setError(null);
    setProduct(null); // Limpar produto anterior
    setLastConsultedEan(cleanEan);

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    try {
      const cachedKey = `product_${cleanEan}`;
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Cache de 1 hora
        if (Date.now() - parsed.timestamp < 3600000 || !navigator.onLine) {
          console.log("[Consulta] Usando cache para:", cleanEan);
          setProduct({ ...parsed.data, is_cached: true });
          setIsConsulting(false);
          startHideTimer();
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("consulta-seq-produto-assai", {
        body: { 
          ean: cleanEan,
          device_serial: deviceCode 
        }
      });

      // Se der erro 404 (não mapeado), tratamos de forma amigável
      if (error && (error.status === 404 || error.message?.includes('404'))) {
        throw new Error("Produto não cadastrado para consulta.");
      }

      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error || "Falha na resposta da API");

      console.log("[Consulta] Resultado API:", data);
      setProduct(data);
      
      localStorage.setItem(cachedKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));

    } catch (err: any) {
      console.error("Erro na consulta:", err);
      setError(err.message || "Produto não encontrado");
    } finally {
      setIsConsulting(false);
      startHideTimer();
    }
  }, [hideTimeoutRef]);

  // 3. FOCO AUTOMÁTICO NO INPUT PARA LEITORES DE CÓDIGO DE BARRAS (EMULAÇÃO DE TECLADO)
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Manter o foco no input o tempo todo para capturar o leitor
    const focusInput = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    focusInput();
    const interval = setInterval(focusInput, 1000); // Reforça o foco periodicamente

    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (inputValue.length >= 3) {
        handleConsult(inputValue);
      }
      setInputValue("");
    }
  };

  // handleKeyDown removido pois a captura agora é global via window event listener

  const startHideTimer = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 8000);
  };

  const formatPrice = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "--";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getProductNameParts = (desc: string) => {
    if (!desc) return { main: "", rest: "" };
    const words = desc.split(" ");
    const main = words.slice(0, 3).join(" ");
    const rest = words.slice(3).join(" ");
    return { main, rest };
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none overscroll-none">
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

      <div className={cn("w-full h-full transition-all duration-700", showOverlay ? "scale-95 blur-md opacity-50" : "scale-100 blur-0 opacity-100")}>
        <PlayerEngine 
          playlist={activePlaylist} 
          onMediaChange={setCurrentIndex}
          serial={deviceInfo?.serial}
        />
      </div>

      <AnimatePresence>
        {showOverlay && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-12"
            style={{ 
              backgroundColor: product?.visual?.fundo_legibilidade ? `${product.visual.fundo_legibilidade}CC` : 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(20px)'
            }}
          >
            {isConsulting ? (
              <div className="flex flex-col items-center gap-6 text-white">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <h2 className="text-[clamp(1.5rem,5vw,3rem)] font-bold">Consultando produto...</h2>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-6 text-center max-w-lg text-white">
                <AlertCircle className="h-[clamp(4rem,10vw,6rem)] w-[clamp(4rem,10vw,6rem)] text-red-500" />
                <h2 className="text-[clamp(2rem,6vw,4rem)] font-bold">Ops!</h2>
                <p className="text-[clamp(1.2rem,4vw,2.5rem)] text-white/80">{error}</p>
                {lastConsultedEan && (
                  <p className="text-[clamp(0.8rem,2vw,1.2rem)] text-white/30 font-mono mt-2">EAN: {lastConsultedEan}</p>
                )}
                <button 
                  onClick={() => setShowOverlay(false)}
                  className="mt-8 px-8 py-3 md:px-12 md:py-4 bg-white/10 hover:bg-white/20 text-white rounded-full text-[clamp(1rem,3vw,1.5rem)] transition-all"
                >
                  Voltar
                </button>
              </div>
            ) : product && (
              <div className={cn(
                "w-full h-full flex gap-6 md:gap-12",
                isVertical ? "flex-col" : "flex-row"
              )}>
                <div className={cn(
                  "flex items-center justify-center bg-white/5 rounded-3xl overflow-hidden shadow-2xl relative",
                  isVertical ? "h-2/5 w-full" : "w-1/2 h-full order-2"
                )}>
                  {product.visual?.imagem_url ? (
                    <img 
                      src={product.visual.imagem_url.replace('http://', 'https://')} 
                      alt={product.description}
                      className="max-w-full max-h-full object-contain p-8"
                      onError={(e) => {
                        // Fallback caso HTTPS falhe (alguns domínios ddns podem não ter SSL)
                        (e.target as HTMLImageElement).src = product.visual?.imagem_url || "";
                      }}
                    />
                  ) : (
                    <Package className="w-48 h-48 text-white/20" />
                  )}
                  <div 
                    className="absolute inset-0 -z-10 opacity-30 blur-[100px]"
                    style={{ backgroundColor: product.visual?.cor_dominante_escuro || '#000' }}
                  />
                </div>

                <div className={cn(
                  "flex flex-col justify-between",
                  isVertical ? "h-3/5 w-full" : "w-1/2 h-full order-1 text-white"
                )}>
                  <div className="space-y-6">
                    <div className="inline-block px-4 py-1.5 md:px-6 md:py-2 rounded-full bg-white/10 text-white/60 text-base md:text-xl font-medium">
                      Código: {product.internal_id}
                      {product.is_cached && (
                        <span className="ml-3 text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase tracking-widest font-bold">Modo Offline</span>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-tight" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                        {getProductNameParts(product.description).main}
                      </h1>
                      <p className="text-[clamp(1.2rem,4vw,2.5rem)] text-white/50 font-medium">
                        {getProductNameParts(product.description).rest}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 scrollbar-hide">
                    {/* Preço Unitário Principal */}
                    {product.stock_prices.length === 0 ? (
                      <div className="p-12 rounded-[30px] bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center gap-4">
                        <Package className="w-16 h-16 text-white/20" />
                        <span className="text-white/40 text-xl font-bold uppercase tracking-widest">Preço não disponível</span>
                      </div>
                    ) : (
                      <>
                        {product.stock_prices.filter(p => p.unit_pack === 1).map((price, idx) => (
                      <div 
                        key={`unit-${idx}`}
                        className="p-6 md:p-8 rounded-[30px] shadow-xl relative overflow-hidden flex flex-col justify-center"
                        style={{ 
                          backgroundColor: product.visual?.cor_dominante_escuro || '#111',
                          border: `2px solid ${product.visual?.cor_dominante_claro || '#333'}66`
                        }}
                      >
                        <span className="text-white/40 text-sm md:text-xl font-bold uppercase tracking-wider block mb-1">Unidade</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl md:text-4xl text-white/40 font-bold">R$</span>
                          <span className="text-[clamp(3.5rem,10vw,8rem)] leading-none font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                            {formatPrice(price.price_prom_pack && price.price_prom_pack > 0 ? price.price_prom_pack : price.price_pack).replace('R$', '').trim()}
                          </span>
                        </div>
                        {price.stock_avaliable <= 0 && (
                          <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase">Indisponível</div>
                        )}
                      </div>
                    ))}

                    {/* Preços de Atacado / Packs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.stock_prices.filter(p => p.unit_pack > 1 || (p.whole_sale && Number(p.whole_sale) > 1)).map((price, idx) => {
                        const unitPrice = product.stock_prices.find(p => p.unit_pack === 1);
                        const currentUnitPrice = (price.price_prom_pack && price.price_prom_pack > 0 ? price.price_prom_pack : price.price_pack) / price.unit_pack;
                        const originalUnitPrice = unitPrice ? (unitPrice.price_prom_pack && unitPrice.price_prom_pack > 0 ? unitPrice.price_prom_pack : unitPrice.price_pack) : currentUnitPrice;
                        const economyPercent = originalUnitPrice > currentUnitPrice ? Math.round(((originalUnitPrice - currentUnitPrice) / originalUnitPrice) * 100) : 0;
                        
                        const isWholesale = price.whole_sale && Number(price.whole_sale) > 1 && Number(price.whole_sale) <= price.unit_pack;
                        const isBox = price.unit_pack >= 12;
                        const label = isWholesale ? `Atacado a partir de ${price.whole_sale} un` : (isBox ? `Caixa com ${price.unit_pack}` : `Pack com ${price.unit_pack}`);

                        return (
                          <div 
                            key={`pack-${idx}`}
                            className="p-5 md:p-6 rounded-[24px] bg-white/5 border border-white/10 shadow-lg flex flex-col justify-between relative"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-white/40 text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                  {label}
                                </span>
                                {economyPercent > 0 && (
                                  <span className="bg-primary/20 text-primary text-[10px] md:text-[12px] font-bold px-2 py-0.5 rounded-md border border-primary/30">
                                    -{economyPercent}%
                                  </span>
                                )}
                              </div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm md:text-lg text-white/40 font-bold">R$</span>
                                <span className="text-2xl md:text-4xl font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                                  {formatPrice(price.price_prom_pack && price.price_prom_pack > 0 ? price.price_prom_pack : price.price_pack).replace('R$', '').trim()}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center">
                              <span className="text-white/30 text-[10px] md:text-xs">Sai a:</span>
                              <span className="text-white/60 text-xs md:text-sm font-bold">{formatPrice(currentUnitPrice)} <span className="text-[8px] opacity-50">cada</span></span>
                            </div>

                            {price.stock_avaliable <= 0 && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] rounded-[24px] flex items-center justify-center">
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Esgotado</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        {/* Input visível para debug e captura do leitor de teclado */}
        <div className="flex flex-col items-center gap-2 mb-4 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Leitor Ativo (Foco Automático)</span>
          <Input 
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-64 h-10 bg-white/5 border-white/20 text-white text-center font-mono text-lg focus:ring-1 focus:ring-primary/50"
            placeholder="Aguardando scanner..."
            autoFocus
          />
          <div className="flex gap-2 text-[9px] text-white/30 uppercase font-medium">
            <span>O leitor envia Enter automaticamente</span>
            <span>•</span>
            <span>{inputValue.length} dígitos</span>
          </div>
        </div>

        <div className="flex items-center gap-3 opacity-30 grayscale">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center font-bold text-white">M</div>
          <span className="text-white font-medium tracking-[0.2em] text-[10px] md:text-xs lg:text-sm uppercase">Mupa Retail Media</span>
        </div>
        
        <AnimatePresence>
          {!showOverlay && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 md:px-6 md:py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3"
            >
              <Barcode className="w-4 h-4 md:w-5 md:h-5 text-primary animate-pulse" />
              <span className="text-white/40 text-[10px] md:text-xs lg:text-sm font-medium uppercase tracking-widest whitespace-nowrap">Aguardando leitura de código</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => setShowFaceDetections(v => !v)}
        className={cn(
          "absolute bottom-4 right-4 z-[70] rounded-full border border-white/10 bg-black/30 backdrop-blur-md p-2 text-white/40 transition-all",
          "hover:bg-black/50 hover:text-white/80",
          showFaceDetections && "bg-black/60 text-white/80 border-white/20"
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
    </div>
  );
}
