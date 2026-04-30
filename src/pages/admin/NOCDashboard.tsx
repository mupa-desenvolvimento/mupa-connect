import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Monitor, 
  LayoutGrid, 
  Maximize2, 
  Minimize2, 
  Settings2,
  AlertCircle,
  Activity,
  WifiOff,
  Search,
  RefreshCw,
  Store,
  Warehouse,
  X,
  Share2,
  ExternalLink,
  Copy,
  Clock,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ProductQueriesFeed } from "@/components/admin/monitoring/ProductQueriesFeed";

type PanelType = "status" | "metrics" | "alerts" | "charts" | "store_view" | "queries_feed";
type LayoutType = "1" | "2h" | "2v" | "4" | "6";

interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  storeId?: string;
}

export default function NOCDashboard() {
  const { isSuperAdmin, isTecnico, companyId, tenantId, role } = useUserRole();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layout, setLayout] = useState<LayoutType>("4");
  const [panels, setPanels] = useState<PanelConfig[]>([
    { id: "p1", type: "metrics", title: "Métricas Gerais" },
    { id: "p2", type: "alerts", title: "Alertas Críticos" },
    { id: "p3", type: "status", title: "Status Dispositivos" },
    { id: "p4", type: "store_view", title: "Visão por Loja" }
  ]);
  const [devices, setDevices] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [sharing, setSharing] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);
  const ROTATION_INTERVAL = 10000; // 10 segundos para leitura confortável
  const ITEMS_PER_PAGE = 8;

  const storeStats = useMemo(() => {
    return stores.map(store => {
      const cleanCode = store.code?.replace(/^0+/, '');
      const storeDevices = devices.filter(d => {
        const deviceCode = d.num_filial?.replace(/^0+/, '');
        return (deviceCode && cleanCode && deviceCode === cleanCode) || 
               d.num_filial === store.code || 
               d.empresa === store.name;
      });
      
      const online = storeDevices.filter(d => getDeviceStatus(d) === "online").length;
      const offline = storeDevices.filter(d => getDeviceStatus(d) === "offline").length;
      const unstable = storeDevices.filter(d => getDeviceStatus(d) === "unstable").length;
      
      let status: "online" | "offline" | "unstable" = "online";
      if (offline > 0) status = "offline";
      else if (unstable > 0) status = "unstable";
      
      return {
        ...store,
        deviceCount: storeDevices.length,
        online,
        offline,
        unstable,
        status,
        lastActivity: storeDevices.length > 0 ? storeDevices[0].last_heartbeat_at : null
      };
    });
  }, [stores, devices]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotationIndex(prev => prev + 1);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchInitialData();
    
    const devicesSubscription = supabase
      .channel('noc_devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos' }, () => {
        fetchDevices();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchDevices();
    }, 10000);

    return () => {
      supabase.removeChannel(devicesSubscription);
      clearInterval(interval);
    };
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    await Promise.all([fetchDevices(), fetchStores()]);
    setLoading(false);
  }

  async function fetchDevices() {
    let query = supabase.from("dispositivos").select("*");
    
    // Se não for super admin, filtrar pela empresa
    if (!isSuperAdmin && companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query.order('last_heartbeat_at', { ascending: false });
    if (data) {
      setDevices(data);
      setLastUpdate(new Date());
    }
  }

  async function fetchStores() {
    // Como stores não tem company_id diretamente, filtramos pelo tenant_id
    // que é único por empresa no nosso modelo atual
    let query = supabase.from("stores").select("id, name, code, tenant_id");
    
    if (!isSuperAdmin && tenantId) {
      query = query.eq("tenant_id", tenantId);
    }
    
    const { data } = await query;
    if (data) setStores(data);
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleShare = async () => {
    if (!companyId || !tenantId) {
      toast.error("Erro ao identificar empresa/tenant.");
      return;
    }

    setSharing(true);
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase
        .from("monitoring_views" as any)
        .insert({
          token,
          company_id: companyId,
          tenant_id: tenantId,
          config: {
            layout,
            panels
          },
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString() // 7 dias
        })
        .select()
        .single();

      if (error) throw error;

      const url = `${window.location.origin}/monitoring/view/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link de monitoramento copiado para a área de transferência! Válido por 7 dias.");
      
      // Opcional: abrir em nova aba
      window.open(url, '_blank');
    } catch (err) {
      console.error("Error sharing monitoring:", err);
      toast.error("Falha ao gerar link compartilhado.");
    } finally {
      setSharing(false);
    }
  };

  const getDeviceStatus = (device: any) => {
    if (!device.last_heartbeat_at) return "offline";
    const now = new Date();
    const lastHeartbeat = new Date(device.last_heartbeat_at);
    const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;
    
    if (diffSeconds > 120) return "offline";
    if (diffSeconds > 60) return "unstable";
    return "online";
  };

  const updatePanel = (id: string, updates: Partial<PanelConfig>) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  // Render Panel content based on type
  const renderPanelContent = (panel: PanelConfig) => {
    switch (panel.type) {
      case "metrics":
        const onlineCount = devices.filter(d => getDeviceStatus(d) === "online").length;
        const unstableCount = devices.filter(d => getDeviceStatus(d) === "unstable").length;
        const offlineCount = devices.filter(d => getDeviceStatus(d) === "offline").length;
        return (
          <div className="grid grid-cols-2 gap-4 h-full p-2">
            <MetricCard label="Online" value={onlineCount} color="text-green-500" icon={Activity} />
            <MetricCard label="Offline" value={offlineCount} color="text-red-500" icon={WifiOff} />
            <MetricCard label="Instáveis" value={unstableCount} color="text-yellow-500" icon={AlertCircle} />
            <MetricCard label="Total" value={devices.length} color="text-blue-500" icon={Monitor} />
          </div>
        );
      case "alerts":
        const alerts = devices.filter(d => getDeviceStatus(d) !== "online").slice(0, 20);
        return (
          <ScrollArea className="h-full pr-4">
            <div className="space-y-2 p-1">
              {alerts.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">Nenhum alerta crítico</p>
              ) : (
                alerts.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border bg-background/50 border-destructive/20">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm uppercase">{d.apelido_interno || d.serial}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{d.empresa || 'Sem Loja'}</span>
                    </div>
                    <Badge variant="destructive" className="animate-pulse">OFFLINE</Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        );
      case "queries_feed":
        const storeForFeed = stores.find(s => s.id === panel.storeId);
        return (
          <ProductQueriesFeed 
            storeId={panel.storeId} 
            storeCode={storeForFeed?.code}
            tenantId={tenantId}
            isSuperAdmin={isSuperAdmin}
          />
        );
      case "status":
      case "store_view":
        const isStoreView = panel.type === "store_view";
        const hasSelectedStore = !!panel.storeId;
        
        let items = [];
        let ItemComponent: any;

        if (isStoreView && !hasSelectedStore) {
          // Visão Geral de Lojas (Gid de Lojas)
          items = storeStats;
          ItemComponent = StoreCard;
        } else {
          // Status de Dispositivos ou Loja Específica
          let displayDevices = devices;
          if (hasSelectedStore) {
            const store = stores.find(s => s.id === panel.storeId);
            if (store) {
              const cleanCode = store.code?.replace(/^0+/, '');
              displayDevices = devices.filter(d => {
                const deviceCode = d.num_filial?.replace(/^0+/, '');
                return (deviceCode && cleanCode && deviceCode === cleanCode) || 
                       d.num_filial === store.code || 
                       d.empresa === store.name;
              });
            }
          }
          items = displayDevices;
          ItemComponent = DeviceCard;
        }

        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
        const currentPage = rotationIndex % (totalPages || 1);
        const paginatedItems = items.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

        return (
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${panel.id}-${currentPage}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 p-1 h-full content-start overflow-y-auto custom-scrollbar"
                >
                  {paginatedItems.map((item: any) => (
                    <ItemComponent 
                      key={item.id} 
                      item={item} 
                      status={panel.type === "status" ? getDeviceStatus(item) : item.status} 
                    />
                  ))}
                  {items.length === 0 && (
                    <div className="col-span-full flex items-center justify-center h-40 text-muted-foreground italic">
                      Nenhum item encontrado
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-2 pb-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      i === currentPage ? "w-6 bg-primary" : "w-1.5 bg-border"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        );
      default:
        return <div className="flex items-center justify-center h-full text-muted-foreground italic">Em desenvolvimento...</div>;
    }
  };

  const getGridLayoutClass = () => {
    switch (layout) {
      case "1": return "grid-cols-1";
      case "2h": return "grid-cols-1 grid-rows-2";
      case "2v": return "grid-cols-2";
      case "4": return "grid-cols-2 grid-rows-2";
      case "6": return "grid-cols-3 grid-rows-2";
      default: return "grid-cols-2 grid-rows-2";
    }
  };

  if (!isTecnico && !loading) {
    return <div className="p-20 text-center">Acesso restrito a técnicos e administradores.</div>;
  }

  const isNOCRoute = window.location.pathname === "/admin/monitoring";

  return (
    <div className={cn(
      "flex flex-col bg-background text-foreground transition-all duration-500",
      (isFullscreen || isNOCRoute) ? "fixed inset-0 z-50 p-4 bg-[#09090b]" : "h-full w-full"
    )}>
      {/* Header do NOC */}
      <div className="flex items-center justify-between mb-4 border-b pb-4 border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase">NOC <span className="text-primary">Monitor</span></h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Atualizado: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-2 text-primary border-primary/20 hover:bg-primary/5"
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            <span>Compartilhar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <LayoutGrid className="h-4 w-4" />
                <span>Layout</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Escolher Grid</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
                <DropdownMenuRadioItem value="1">1 Painel (100%)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="2h">2 Painéis (Horiz)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="2v">2 Painéis (Vert)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="4">4 Painéis (2x2)</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="6">6 Painéis (3x2)</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant={isFullscreen ? "secondary" : "default"} 
            size="sm" 
            className="h-9 gap-2"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span>{isFullscreen ? "Sair Fullscreen" : "Modo Monitor"}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0"
            onClick={() => navigate("/")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Grid de Painéis */}
      <div className={cn(
        "grid flex-1 gap-4 overflow-hidden",
        getGridLayoutClass()
      )}>
        {panels.slice(0, layout === "6" ? 6 : layout === "4" ? 4 : layout === "1" ? 1 : 2).map((panel) => (
          <Card key={panel.id} className="border-border/60 bg-card/30 flex flex-col overflow-hidden shadow-elegant border-2">
            <CardHeader className="py-2 px-4 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                {panel.type === "metrics" && <Activity className="h-3.5 w-3.5 text-primary" />}
                {panel.type === "alerts" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                {panel.type === "status" && <Monitor className="h-3.5 w-3.5 text-green-500" />}
                {panel.type === "store_view" && <Warehouse className="h-3.5 w-3.5 text-blue-500" />}
                {panel.type === "queries_feed" && <Search className="h-3.5 w-3.5 text-purple-500" />}
                {panel.title}
              </CardTitle>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Settings2 className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Configurar Painel</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase opacity-60">Tipo de Dado</label>
                      <select 
                        className="w-full h-8 rounded border bg-background text-xs px-2"
                        value={panel.type}
                        onChange={(e) => updatePanel(panel.id, { type: e.target.value as PanelType, title: getPanelDefaultTitle(e.target.value as PanelType) })}
                      >
                        <option value="metrics">Métricas Gerais</option>
                        <option value="alerts">Alertas Críticos</option>
                        <option value="status">Status Dispositivos</option>
                        <option value="store_view">Visão por Loja</option>
                        <option value="queries_feed">Consultas em Tempo Real</option>
                      </select>
                    </div>

                    {(panel.type === "store_view" || panel.type === "queries_feed") && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase opacity-60">Selecionar Loja</label>
                        <select 
                          className="w-full h-8 rounded border bg-background text-xs px-2"
                          value={panel.storeId}
                          onChange={(e) => {
                            const store = stores.find(s => s.id === e.target.value);
                            updatePanel(panel.id, { storeId: e.target.value, title: `Loja: ${store?.name || 'Selecione'}` });
                          }}
                        >
                          <option value="">Selecione uma loja</option>
                          {stores.map(s => (
                            <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="flex-1 p-3 overflow-hidden">
              {renderPanelContent(panel)}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, icon: Icon }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-border/40 bg-background/40">
      <Icon className={cn("h-8 w-8 mb-2 opacity-80", color)} />
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</span>
      <span className={cn("text-3xl font-black mt-1", color)}>{value}</span>
    </div>
  );
}

function StoreCard({ item, status }: any) {
  const statusColor = status === "online" ? "bg-green-500" : status === "unstable" ? "bg-yellow-500" : "bg-red-500";
  const borderColor = status === "online" ? "border-green-500/20" : status === "unstable" ? "border-yellow-500/20" : "border-red-500/20";
  const textColor = status === "online" ? "text-green-500" : status === "unstable" ? "text-yellow-500" : "text-red-500";

  return (
    <div className={cn(
      "flex flex-col justify-between p-3 rounded-lg border-2 bg-[#09090b] transition-all hover:scale-[1.02]",
      borderColor
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-black uppercase truncate text-white leading-tight">{item.name}</span>
          <span className="text-[10px] opacity-50 font-bold uppercase tracking-wider">{item.code}</span>
        </div>
        <div className={cn("h-3 w-3 rounded-full shrink-0 mt-1 shadow-[0_0_10px_rgba(0,0,0,0.5)]", statusColor)} />
      </div>
      
      <div className="flex items-end justify-between mt-1">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold opacity-40">Dispositivos</span>
          <span className="text-lg font-black leading-none">{item.deviceCount}</span>
        </div>
        <div className="flex gap-1 text-[8px] font-black">
          {item.offline > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500">{item.offline} OFF</span>}
          {item.unstable > 0 && <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500">{item.unstable} WARN</span>}
          {item.online > 0 && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-500">{item.online} ON</span>}
        </div>
      </div>
    </div>
  );
}

function DeviceCard({ item, status }: any) {
  const statusColor = status === "online" ? "bg-green-500" : status === "unstable" ? "bg-yellow-500" : "bg-red-500";
  const borderColor = status === "online" ? "border-green-500/20" : status === "unstable" ? "border-yellow-500/20" : "border-red-500/20";
  const textColor = status === "online" ? "text-green-500" : status === "unstable" ? "text-yellow-500" : "text-red-500";

  return (
    <div className={cn(
      "flex flex-col justify-between p-3 rounded-lg border-2 bg-[#09090b] transition-all hover:scale-[1.02]",
      borderColor
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs font-black uppercase truncate text-white leading-tight">{item.apelido_interno || item.serial}</span>
          <span className="text-[10px] opacity-50 font-bold uppercase tracking-wider">{item.num_filial || 'Sem Filial'}</span>
        </div>
        <div className={cn("h-3 w-3 rounded-full shrink-0 mt-1 shadow-[0_0_10px_rgba(0,0,0,0.5)]", statusColor, status !== 'offline' && "animate-pulse")} />
      </div>
      
      <div className="flex items-end justify-between mt-1">
        <div className="flex flex-col">
          <span className="text-[9px] uppercase font-bold opacity-40">Visto por último</span>
          <span className="text-[10px] font-bold truncate">
            {item.last_heartbeat_at ? formatDistanceToNow(new Date(item.last_heartbeat_at), { addSuffix: true, locale: ptBR }) : 'Nunca'}
          </span>
        </div>
        <Badge variant="outline" className={cn("text-[8px] h-4 px-1 border-0 bg-background/50 uppercase font-black", textColor)}>
          {status}
        </Badge>
      </div>
    </div>
  );
}

function getPanelDefaultTitle(type: PanelType): string {
  switch (type) {
    case "metrics": return "Métricas Gerais";
    case "alerts": return "Alertas Críticos";
    case "status": return "Status Dispositivos";
    case "store_view": return "Visão por Loja";
    case "queries_feed": return "Consultas em Tempo Real";
    default: return "Painel";
  }
}
