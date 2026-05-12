import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  User, 
  Search, 
  BarChart3, 
  Info, 
  Cpu, 
  Zap, 
  Eye, 
  Smile, 
  Clock,
  ChevronRight,
  ChevronLeft,
  Layout,
  Play,
  Settings2,
  Terminal,
  RefreshCw,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DevEvent {
  id: string;
  type: "face" | "product" | "campaign" | "system";
  title: string;
  subtitle: string;
  details?: string[];
  timestamp: Date;
  icon: React.ReactNode;
  color: string;
}

interface DevShowcaseOverlayProps {
  isDevMode: boolean;
  deviceInfo: any;
  currentFaceDetections: any[];
  lastProduct?: any;
  currentMedia?: any;
  onToggleAutoDemo: (active: boolean) => void;
  isAutoDemoActive: boolean;
}

export const DevShowcaseOverlay: React.FC<DevShowcaseOverlayProps> = ({
  isDevMode,
  deviceInfo,
  currentFaceDetections,
  lastProduct,
  currentMedia,
  onToggleAutoDemo,
  isAutoDemoActive
}) => {
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalConsultas: 142,
    consultasHoje: 12,
    totalDetections: 856,
    avgAttention: 8.4,
    uptime: "02:14:45",
    fps: 24,
  });

  const lastProcessedProductRef = useRef<string | null>(null);
  const lastProcessedMediaRef = useRef<string | null>(null);

  // Add event helper
  const addEvent = useCallback((event: Omit<DevEvent, "id" | "timestamp">) => {
    const newEvent: DevEvent = {
      ...event,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 5));
  }, []);

  // Monitor face detections for events
  const lastFaceCountRef = useRef(0);
  const faceCooldownRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    if (!isDevMode || currentFaceDetections.length === 0) {
      lastFaceCountRef.current = 0;
      return;
    }
    
    currentFaceDetections.forEach((face) => {
      const faceKey = `${face.gender}-${face.age}`;
      const now = Date.now();
      
      // Only trigger if this specific demographic hasn't been toasted in 10s
      if (!faceCooldownRef.current[faceKey] || now - faceCooldownRef.current[faceKey] > 10000) {
        faceCooldownRef.current[faceKey] = now;
        
        addEvent({
          type: "face",
          title: "Pessoa Detectada",
          subtitle: `${face.gender === 'male' ? 'Masculino' : 'Feminino'} • ${face.age} anos`,
          details: [
            `Atenção: ${Math.floor(Math.random() * 5 + 5)}s`,
            `Humor: ${face.mostProbableExpression?.expression || 'Neutral'}`,
            `Confiança: ${Math.round((face.mostProbableExpression?.probability || 0.9) * 100)}%`
          ],
          icon: <User className="w-5 h-5" />,
          color: "from-cyan-400 to-cyan-600"
        });
        
        setStats(prev => ({ ...prev, totalDetections: prev.totalDetections + 1 }));
      }
    });
    
    lastFaceCountRef.current = currentFaceDetections.length;
  }, [currentFaceDetections, isDevMode, addEvent]);


  // Monitor products
  useEffect(() => {
    if (!isDevMode || !lastProduct) return;
    
    const productId = lastProduct.internal_id || lastProduct.ean;
    if (productId !== lastProcessedProductRef.current) {
      lastProcessedProductRef.current = productId;
      addEvent({
        type: "product",
        title: "Consulta Realizada",
        subtitle: lastProduct.description || "Produto Detectado",
        details: [
          `EAN: ${lastProduct.ean || "N/A"}`,
          `Tempo: ${Math.floor(Math.random() * 300 + 200)}ms`,
          `Status: Encontrado`
        ],
        icon: <Search className="w-5 h-5" />,
        color: "from-cyan-500 to-blue-500"
      });
      
      setStats(prev => ({ ...prev, totalConsultas: prev.totalConsultas + 1, consultasHoje: prev.consultasHoje + 1 }));
    }
  }, [lastProduct, isDevMode, addEvent]);

  // Monitor Media
  useEffect(() => {
    if (!isDevMode || !currentMedia) return;
    
    const mediaId = currentMedia.id || currentMedia.url;
    if (mediaId !== lastProcessedMediaRef.current) {
      lastProcessedMediaRef.current = mediaId;
      addEvent({
        type: "campaign",
        title: "Campanha Exibida",
        subtitle: currentMedia.name || "Mídia Padrão",
        details: [
          `Duração: ${currentMedia.duration}s`,
          `Tipo: ${currentMedia.type?.toUpperCase() || "IMAGE"}`
        ],
        icon: <Play className="w-5 h-5" />,
        color: "from-purple-500 to-pink-500"
      });
    }
  }, [currentMedia, isDevMode, addEvent]);

  // Update uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        fps: 22 + Math.floor(Math.random() * 6),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isDevMode) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. HUD: Mini Painel Discreto (Bottom-Left) */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="absolute bottom-10 left-10 w-80 pointer-events-auto"
      >
        <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.1)] overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Cpu className="w-12 h-12 text-cyan-400" />
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
              <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-bold">System Status</div>
              <div className="text-white font-bold text-lg">Mupa Intelligence</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-white/40 font-bold">Uptime</div>
              <div className="text-white font-mono text-sm">{stats.uptime}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-white/40 font-bold">FPS</div>
              <div className="text-cyan-400 font-mono text-sm">{stats.fps} avg</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-white/40 font-bold">Consultas Hoje</div>
              <div className="text-white font-mono text-sm">{stats.consultasHoje}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] uppercase text-white/40 font-bold">Face Detections</div>
              <div className="text-white font-mono text-sm">{stats.totalDetections}</div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[10px] uppercase font-bold text-cyan-500">Online</span>
            </div>
            <div className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
              {deviceInfo?.serial || "DEV-MODE"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. LIVE TOASTS (Top-Right) */}
      <div className="absolute top-10 right-10 flex flex-col gap-4 w-96 items-end">
        <AnimatePresence mode="popLayout">
          {events.map((event) => (
            <motion.div
              key={event.id}
              layout
              initial={{ x: 50, opacity: 0, scale: 0.9 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 100, opacity: 0, scale: 0.9 }}
              className="w-full pointer-events-auto"
            >
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
                <div className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", event.color)} />
                <div className="flex gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br opacity-80", event.color)}>
                    <div className="text-white">{event.icon}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className="text-white font-bold text-sm truncate">{event.title}</h4>
                      <span className="text-[10px] font-mono text-white/30 shrink-0">
                        {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs font-medium truncate mb-2">{event.subtitle}</p>
                    
                    {event.details && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {event.details.map((detail, i) => (
                          <span key={i} className="text-[9px] font-bold text-cyan-400/80 uppercase tracking-tight">
                            • {detail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 3. FACE-ID BOUNDING BOXES */}
      <div className="absolute inset-0 pointer-events-none">
        {currentFaceDetections.map((detection, i) => {
          // This would ideally use the actual bounding box from face-api
          // For now we'll simulate a scanning effect if it's active
          return (
            <div key={`detection-${i}`} className="hidden">
              {/* Bounding boxes are hard to render correctly without the raw coordinates from the video element scaling */}
            </div>
          );
        })}
      </div>

      {/* 4. SIDE PANEL (Retractable) */}
      <div className={cn(
        "absolute inset-y-0 right-0 w-80 bg-black/80 backdrop-blur-2xl border-l border-white/10 pointer-events-auto transition-transform duration-500 ease-in-out z-50",
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 w-10 h-24 bg-black/80 backdrop-blur-2xl border-l border-t border-b border-white/10 rounded-l-2xl flex items-center justify-center group"
        >
          {isSidebarOpen ? <ChevronRight className="text-cyan-400" /> : <ChevronLeft className="text-cyan-400 group-hover:scale-125 transition-transform" />}
        </button>

        <div className="h-full flex flex-col p-8 overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Settings2 className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Showcase</h2>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Control Panel</p>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <h3 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">Demonstration</h3>
              <button 
                onClick={() => onToggleAutoDemo(!isAutoDemoActive)}
                className={cn(
                  "w-full p-4 rounded-2xl flex items-center justify-between transition-all border",
                  isAutoDemoActive 
                    ? "bg-cyan-500/20 border-cyan-500 text-white" 
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isAutoDemoActive ? "bg-cyan-500/30" : "bg-white/10")}>
                    {isAutoDemoActive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  </div>
                  <span className="font-bold text-sm">Auto Demo Mode</span>
                </div>
                <div className={cn("w-2 h-2 rounded-full", isAutoDemoActive ? "bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]" : "bg-white/20")} />
              </button>
            </section>

            <section className="space-y-4">
              <h3 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">Audience Analytics</h3>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/30 uppercase font-bold">Attention Rate</span>
                    <div className="text-2xl font-bold text-white">74.2%</div>
                  </div>
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-cyan-500 w-[74%]" />
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/30 uppercase font-bold">Interactions</span>
                    <div className="text-2xl font-bold text-white">12.5k</div>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-bold mb-2">+12% ↑</div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-bold mb-4">Device Config</h3>
              <div className="space-y-3">
                {[
                  { label: "Internal IP", value: "192.168.1.142" },
                  { label: "Hardware", value: "X96 Max Plus" },
                  { label: "OS", value: "Android 9.0" },
                  { label: "Version", value: "v4.2.0-mupa" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-[10px] text-white/40 font-bold uppercase">{item.label}</span>
                    <span className="text-[10px] font-mono text-white/60">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-auto pt-10">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/10">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Enterprise Ready</span>
              </div>
              <p className="text-[9px] text-white/40 leading-relaxed uppercase font-bold">
                Mupa Digital Signage Ecosystem • Commercial Showcase License
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
