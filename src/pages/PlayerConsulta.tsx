import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, ScheduleResolver, MediaCacheService } from "@/components/PlayerServices";
import { ManifestService } from "@/services/ManifestService";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Package, AlertCircle, Barcode } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProductData {
  ean: string;
  internal_id: string;
  description: string;
  price: {
    price_pack: number;
    price_unit: number;
    promo_text?: string;
    pack_quantity?: number;
  } | null;
  visual: {
    imagem_url: string;
    cor_assinatura_produto: string;
    fundo_legibilidade: string;
    cor_dominante_claro: string;
    cor_dominante_escuro: string;
  } | null;
}

export default function PlayerConsulta() {
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
  const [error, setError] = useState<string | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState("");

  const [isVertical, setIsVertical] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    const handleResize = () => setIsVertical(window.innerHeight > window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 1. CARREGAMENTO DO PLAYER
  useEffect(() => {
    if (!deviceCode && !isPreview) return;

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

  // 3. FOCO NO INPUT E LISTENER DE BARCODE
  useEffect(() => {
    const focusInput = () => {
      if (inputRef.current) inputRef.current.focus();
    };

    // Foca inicialmente
    focusInput();

    // Re-foca se perder o foco (importante para terminais)
    const handleFocusLoss = () => {
      setTimeout(focusInput, 100);
    };

    window.addEventListener("click", focusInput);
    window.addEventListener("touchstart", focusInput);
    
    return () => {
      window.removeEventListener("click", focusInput);
      window.removeEventListener("touchstart", focusInput);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (inputValue.length >= 3) {
        handleConsult(inputValue);
        setInputValue("");
      }
    }
  };

  const handleConsult = async (ean: string) => {
    console.log("[Consulta] Iniciando para EAN:", ean);
    setIsConsulting(true);
    setShowOverlay(true);
    setError(null);

    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    try {
      const cachedKey = `product_${ean}`;
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 3600000 || !navigator.onLine) {
          setProduct(parsed.data);
          setIsConsulting(false);
          startHideTimer();
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("integra-assai", {
        body: { ean }
      });

      if (error) throw error;

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
  };

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
                <h2 className="text-3xl font-bold">Consultando produto...</h2>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-6 text-center max-w-lg text-white">
                <AlertCircle className="h-24 w-24 text-red-500" />
                <h2 className="text-4xl font-bold">Ops!</h2>
                <p className="text-2xl text-white/80">{error}</p>
                <button 
                  onClick={() => setShowOverlay(false)}
                  className="mt-8 px-12 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full text-xl transition-all"
                >
                  Voltar
                </button>
              </div>
            ) : product && (
              <div className={cn(
                "w-full h-full flex gap-12",
                isVertical ? "flex-col" : "flex-row"
              )}>
                <div className={cn(
                  "flex items-center justify-center bg-white/5 rounded-3xl overflow-hidden shadow-2xl relative",
                  isVertical ? "h-2/5 w-full" : "w-1/2 h-full order-2"
                )}>
                  {product.visual?.imagem_url ? (
                    <img 
                      src={product.visual.imagem_url} 
                      alt={product.description}
                      className="max-w-full max-h-full object-contain p-8"
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
                    <div className="inline-block px-6 py-2 rounded-full bg-white/10 text-white/60 text-xl font-medium">
                      Código: {product.internal_id}
                    </div>
                    
                    <div className="space-y-2">
                      <h1 className="text-6xl md:text-8xl font-black leading-tight" style={{ fontFamily: 'Satoshi, sans-serif' }}>
                        {getProductNameParts(product.description).main}
                      </h1>
                      <p className="text-3xl md:text-4xl text-white/50 font-medium">
                        {getProductNameParts(product.description).rest}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-4">
                      {product.price?.promo_text && (
                        <div className="px-6 py-3 rounded-2xl bg-primary/20 border border-primary/30 text-primary text-2xl font-bold flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                          {product.price.promo_text}
                        </div>
                      )}
                      {product.price?.pack_quantity && (
                        <div className="px-6 py-3 rounded-2xl bg-white/10 border border-white/10 text-white text-2xl font-medium">
                          Leve {product.price.pack_quantity} un
                        </div>
                      )}
                    </div>

                    <div 
                      className="p-12 rounded-[40px] shadow-2xl relative overflow-hidden"
                      style={{ 
                        backgroundColor: product.visual?.cor_dominante_escuro || '#111',
                        border: `1px solid ${product.visual?.cor_dominante_claro}33`
                      }}
                    >
                      <div 
                        className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-40"
                        style={{ backgroundColor: product.visual?.cor_assinatura_produto || '#00C2FF' }}
                      />

                      <div className="relative z-10">
                        <span className="text-white/40 text-3xl font-bold uppercase tracking-wider block mb-2">Preço Exclusivo</span>
                        <div className="flex items-baseline gap-4">
                          <span className="text-5xl md:text-6xl text-white/40 font-bold">R$</span>
                          <span className="text-[140px] md:text-[200px] leading-none font-black text-white" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>
                            {formatPrice(product.price?.price_pack).replace('R$', '').trim()}
                          </span>
                        </div>
                        
                        {product.price?.price_unit && (
                          <div className="mt-4 pt-6 border-t border-white/10 flex justify-between items-center">
                            <span className="text-white/40 text-2xl">Preço Unitário</span>
                            <span className="text-white/80 text-3xl font-bold">{formatPrice(product.price.price_unit)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Invisível para Scanner HID */}
      <div className="fixed top-0 left-0 w-0 h-0 opacity-0 overflow-hidden pointer-events-none">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 opacity-30 grayscale">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center font-bold text-white">M</div>
          <span className="text-white font-medium tracking-[0.2em] text-sm uppercase">Mupa Retail Media</span>
        </div>
        
        <AnimatePresence>
          {!showOverlay && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-6 py-3 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3"
            >
              <Barcode className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-white/40 text-sm font-medium uppercase tracking-widest">Aguardando leitura de código</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
