import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// New Components
import { NOCHeader } from "@/components/admin/noc/NOCHeader";
import { NOCStatsBar } from "@/components/admin/noc/NOCStatsBar";
import { StoreHealthCard } from "@/components/admin/noc/StoreHealthCard";
import { EventsFeed } from "@/components/admin/noc/EventsFeed";
import { InkyInsights } from "@/components/admin/noc/InkyInsights";
import { NOCFooter } from "@/components/admin/noc/NOCFooter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";

export default function NOCDashboard() {
  const { isSuperAdmin, isTecnico, companyId, tenantId } = useUserRole();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layout, setLayout] = useState("auto");
  const [devices, setDevices] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [queryErrors, setQueryErrors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [sharing, setSharing] = useState(false);
  const [rotationIndex, setRotationIndex] = useState(0);

  const ROTATION_INTERVAL = 15000; // 15 seconds for rotation

  // Stats calculation
  const stats = useMemo(() => {
    const online = devices.filter(d => getDeviceStatus(d) === "online").length;
    const offline = devices.filter(d => getDeviceStatus(d) === "offline").length;
    const unstable = devices.filter(d => getDeviceStatus(d) === "unstable").length;
    
    const noPlaylist = devices.filter(d => !d.playlist_id && !d.current_playlist_id).length;
    const playerStuck = devices.filter(d => 
      d.player_status === 'stuck' || 
      (d.last_player_activity_at && (Date.now() - new Date(d.last_player_activity_at).getTime()) > 600000)
    ).length;

    // Store stats calculation
    const processedStores = stores.map(store => {
      const cleanCode = store.code?.replace(/^0+/, '');
      const storeDevices = devices.filter(d => {
        const deviceCode = d.num_filial?.replace(/^0+/, '');
        return (deviceCode && cleanCode && deviceCode === cleanCode) || 
               d.num_filial === store.code || 
               d.empresa === store.name;
      });
      
      const sOnline = storeDevices.filter(d => getDeviceStatus(d) === "online").length;
      const sOffline = storeDevices.filter(d => getDeviceStatus(d) === "offline").length;
      const sUnstable = storeDevices.filter(d => getDeviceStatus(d) === "unstable").length;
      
      let status: "online" | "offline" | "unstable" = "online";
      if (sOffline > 0) status = "offline";
      else if (sUnstable > 0) status = "unstable";
      
      const healthScore = storeDevices.length > 0 ? Math.round((sOnline / storeDevices.length) * 100) : 100;
      const sla = 99.2; // Example fixed SLA, could be calculated from historical logs

      return {
        ...store,
        online: sOnline,
        offline: sOffline,
        unstable: sUnstable,
        total: storeDevices.length,
        status,
        healthScore,
        sla,
        lastActivity: storeDevices.length > 0 ? storeDevices[0].last_heartbeat_at : null
      };
    });

    const criticalStores = processedStores.filter(s => s.healthScore < 80).length;

    return {
      online,
      offline,
      unstable,
      noPlaylist,
      playerStuck,
      criticalStores,
      queryErrors,
      processedStores
    };
  }, [devices, stores, queryErrors]);

  useEffect(() => {
    fetchInitialData();
    
    const devicesSubscription = supabase
      .channel('noc_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos' }, () => {
        fetchDevices();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchDevices();
      fetchQueryErrors();
    }, 15000);

    const rotInterval = setInterval(() => {
      setRotationIndex(prev => prev + 1);
    }, ROTATION_INTERVAL);

    return () => {
      supabase.removeChannel(devicesSubscription);
      clearInterval(interval);
      clearInterval(rotInterval);
    };
  }, [companyId, tenantId]);

  async function fetchInitialData() {
    setLoading(true);
    await Promise.all([fetchDevices(), fetchStores(), fetchQueryErrors()]);
    setLoading(false);
  }

  async function fetchDevices() {
    let query = supabase.from("dispositivos").select("*");
    
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
    let query = supabase.from("stores").select("id, name, code, tenant_id");
    
    if (!isSuperAdmin && tenantId) {
      query = query.eq("tenant_id", tenantId);
    }
    
    const { data } = await query;
    if (data) setStores(data);
  }

  async function fetchQueryErrors() {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count } = await supabase
        .from("product_queries_log")
        .select("*", { count: 'exact', head: true })
        .not("status_code", "eq", "200")
        .gt("created_at", oneHourAgo);
      
      if (count !== null) setQueryErrors(count);
    } catch (e) {
      console.error("Error fetching query errors:", e);
    }
  }

  function getDeviceStatus(device: any) {
    if (!device.last_heartbeat_at) return "offline";
    const now = new Date();
    const lastHeartbeat = new Date(device.last_heartbeat_at);
    const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;
    
    if (diffSeconds > 120) return "offline";
    if (diffSeconds > 60) return "unstable";
    return "online";
  }

  const handleShare = async () => {
    if (!companyId || !tenantId) {
      toast.error("Erro ao identificar empresa/tenant.");
      return;
    }

    setSharing(true);
    try {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      const { error } = await supabase
        .from("monitoring_views" as any)
        .insert({
          token,
          company_id: companyId,
          tenant_id: tenantId,
          config: { layout, mode: 'noc' },
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
        });

      if (error) throw error;

      const url = `${window.location.origin}/monitoring/view/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Link de monitoramento copiado!");
      window.open(url, '_blank');
    } catch (err) {
      toast.error("Falha ao gerar link compartilhado.");
    } finally {
      setSharing(false);
    }
  };

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

  if (!isTecnico && !loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0c] text-white">
        <div className="text-center p-8 border border-white/5 rounded-2xl bg-white/5">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Acesso Restrito</h2>
          <p className="text-white/40 text-sm">Esta área é exclusiva para técnicos e administradores.</p>
          <button onClick={() => navigate("/")} className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-xs uppercase tracking-widest">
            Voltar para Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate pagination for stores
  const storesPerPage = layout === "4" ? 4 : layout === "6" ? 6 : layout === "9" ? 9 : 12;
  const totalPages = Math.ceil(stats.processedStores.length / storesPerPage);
  const currentPage = rotationIndex % (totalPages || 1);
  const paginatedStores = stats.processedStores.slice(currentPage * storesPerPage, (currentPage + 1) * storesPerPage);

  const gridCols = layout === "4" ? "lg:grid-cols-2" : layout === "6" ? "lg:grid-cols-3" : layout === "9" ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={cn(
      "flex flex-col h-screen w-full bg-[#050507] text-white overflow-hidden selection:bg-primary/30",
      isFullscreen && "fixed inset-0 z-50"
    )}>
      <NOCHeader 
        lastUpdate={lastUpdate}
        loading={loading}
        isFullscreen={isFullscreen}
        layout={layout}
        onLayoutChange={setLayout}
        onFullscreenToggle={toggleFullscreen}
        onShare={handleShare}
        onExit={() => navigate("/")}
        sharing={sharing}
      />

      <NOCStatsBar stats={stats} />

      <main className="flex-1 flex overflow-hidden">
        {/* Main Grid Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">
                  Visão Operacional de Lojas
                </h2>
                <div className="h-px w-20 bg-white/5" />
                {totalPages > 1 && (
                  <span className="text-[10px] font-bold text-primary uppercase">
                    Página {currentPage + 1} de {totalPages}
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1 rounded-full transition-all duration-500",
                      i === currentPage ? "w-6 bg-primary" : "w-1.5 bg-white/10"
                    )}
                  />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-2 gap-4",
                  gridCols
                )}
              >
                {paginatedStores.map((store) => (
                  <StoreHealthCard key={store.id} store={store} />
                ))}
                
                {stats.processedStores.length === 0 && !loading && (
                  <div className="col-span-full py-20 text-center opacity-20">
                    <p className="text-sm font-black uppercase tracking-widest">Nenhuma loja configurada</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </ScrollArea>

          <InkyInsights devices={devices} stores={stores} />
        </div>

        {/* Sidebar Feed Area */}
        <aside className="hidden xl:block w-80 shrink-0">
          <EventsFeed tenantId={tenantId} />
        </aside>
      </main>

      <NOCFooter />
    </div>
  );
}
