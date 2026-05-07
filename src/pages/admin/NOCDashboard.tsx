import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertCircle, TriangleAlert, Monitor, WifiOff, Clock, Activity, List, ShieldCheck } from "lucide-react";

// New Components
import { NOCHeader } from "@/components/admin/noc/NOCHeader";
import { NOCStatsBar } from "@/components/admin/noc/NOCStatsBar";
import { StoreHealthCard } from "@/components/admin/noc/StoreHealthCard";
import { EventsFeed } from "@/components/admin/noc/EventsFeed";
import { InkyInsights } from "@/components/admin/noc/InkyInsights";
import { NOCFooter } from "@/components/admin/noc/NOCFooter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

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

  const ROTATION_INTERVAL = 15000;

  const normalize = (value: any) => String(value || "").replace(/^0+/, "").trim();

  const stats = useMemo(() => {
    const online = devices.filter(d => getDeviceStatus(d) === "online").length;
    const offline = devices.filter(d => getDeviceStatus(d) === "offline").length;
    const unstable = devices.filter(d => getDeviceStatus(d) === "unstable").length;
    
    const noPlaylist = devices.filter(d => !d.playlist_id && !d.current_playlist_id).length;
    const playerStuck = devices.filter(d => 
      d.player_status === 'stuck' || 
      (d.last_player_activity_at && (Date.now() - new Date(d.last_player_activity_at).getTime()) > 600000)
    ).length;

    const processedStores = stores.map(store => {
      const cleanCode = normalize(store.code);
      const storeDevices = devices.filter(d => {
        const deviceCode = normalize(d.num_filial);
        return (deviceCode && cleanCode && deviceCode === cleanCode) || 
               d.empresa === store.name;
      });
      
      const sOnline = storeDevices.filter(d => getDeviceStatus(d) === "online").length;
      const sOffline = storeDevices.filter(d => getDeviceStatus(d) === "offline").length;
      const sUnstable = storeDevices.filter(d => getDeviceStatus(d) === "unstable").length;
      
      let status: "online" | "offline" | "unstable" = "online";
      if (sOffline > 0) status = "offline";
      else if (sUnstable > 0) status = "unstable";
      
      const healthScore = storeDevices.length > 0 ? Math.round((sOnline / storeDevices.length) * 100) : 100;
      const sla = 99.2;

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

    const criticalStores = processedStores.filter(s => s.healthScore < 80);

    return {
      online,
      offline,
      unstable,
      noPlaylist,
      playerStuck,
      criticalStoresCount: criticalStores.length,
      criticalStoresList: criticalStores,
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
  }, [companyId, tenantId, isSuperAdmin]);

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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a0a0c] text-white">
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

  const storesPerPage = layout === "4" ? 4 : layout === "6" ? 6 : layout === "9" ? 9 : 12;
  const totalPages = Math.ceil(stats.processedStores.length / storesPerPage);
  const currentPage = rotationIndex % (totalPages || 1);
  const paginatedStores = stats.processedStores.slice(currentPage * storesPerPage, (currentPage + 1) * storesPerPage);

  const gridCols = layout === "4" ? "lg:grid-cols-2" : layout === "6" ? "lg:grid-cols-3" : layout === "9" ? "lg:grid-cols-3" : "lg:grid-cols-3 xl:grid-cols-4";

  return (
    <div className={cn(
      "flex flex-col h-screen w-full bg-[#050507] text-white overflow-hidden selection:bg-primary/30 font-sans",
      "fixed inset-0 z-[60]"
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

      <NOCStatsBar stats={{...stats, criticalStores: stats.criticalStoresCount}} />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            <AnimatePresence mode="wait">
              {layout === 'auto' || layout === '4' || layout === '6' || layout === '9' ? (
                <motion.div
                  key="grid-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-8"
                >
                  {/* Critical Incidents Section */}
                  {stats.criticalStoresList.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
                          Incidentes Críticos Ativos
                        </h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.criticalStoresList.slice(0, 3).map(store => (
                          <div key={store.id} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <TriangleAlert className="h-5 w-5 text-red-500" />
                              <div>
                                <p className="text-[10px] font-black uppercase text-white/80">{store.name}</p>
                                <p className="text-[9px] text-red-500 font-bold uppercase">{store.offline} OFF / {store.total} TOTAL</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-red-500">{store.healthScore}%</p>
                              <p className="text-[8px] font-bold text-white/30 uppercase">HEALTH</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                            i === currentPage ? "w-6 bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "w-1.5 bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className={cn(
                      "grid grid-cols-1 md:grid-cols-2 gap-6",
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
                </motion.div>
              ) : layout === 'list' ? (
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-[#111114] border border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[11px] font-bold uppercase">
                      <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                          <th className="px-4 py-3 text-white/40">Dispositivo</th>
                          <th className="px-4 py-3 text-white/40">Loja</th>
                          <th className="px-4 py-3 text-white/40">Status</th>
                          <th className="px-4 py-3 text-white/40">Último Heartbeat</th>
                          <th className="px-4 py-3 text-white/40">Playlist</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {devices.map((device) => {
                          const status = getDeviceStatus(device);
                          return (
                            <tr key={device.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 text-white">{device.apelido_interno || device.serial}</td>
                              <td className="px-4 py-3 text-white/60">{device.num_filial || '—'}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={cn(
                                  "text-[9px] h-5 font-black uppercase",
                                  status === 'online' ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20"
                                )}>
                                  {status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-white/40">
                                {device.last_heartbeat_at ? formatDistanceToNow(new Date(device.last_heartbeat_at), { addSuffix: true, locale: ptBR }) : 'Nunca'}
                              </td>
                              <td className="px-4 py-3 text-primary">{device.playlist_id ? 'Sincronizada' : 'Sem Playlist'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              ) : layout === 'executive' ? (
                <motion.div
                  key="executive-view"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="space-y-6">
                    <div className="bg-[#111114] border border-white/5 rounded-2xl p-8 flex flex-col items-center text-center">
                      <ShieldCheck className="h-16 w-16 text-primary mb-4" />
                      <h2 className="text-2xl font-black uppercase text-white mb-2">SLA Operacional Global</h2>
                      <span className="text-6xl font-black text-primary">99.8%</span>
                      <p className="text-white/40 text-sm mt-4 uppercase font-bold tracking-widest">Disponibilidade em Tempo Real</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#111114] border border-white/5 rounded-2xl p-6">
                        <span className="text-3xl font-black text-green-500">{stats.online}</span>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Dispositivos Ativos</p>
                      </div>
                      <div className="bg-[#111114] border border-white/5 rounded-2xl p-6">
                        <span className="text-3xl font-black text-red-500">{stats.offline}</span>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Fora de Operação</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 flex flex-col">
                    <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-6">Lojas com Baixa Performance</h3>
                    <div className="flex-1 space-y-4">
                      {stats.processedStores.filter(s => s.healthScore < 90).sort((a,b) => a.healthScore - b.healthScore).map(store => (
                        <div key={store.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                          <div>
                            <p className="text-sm font-black text-white uppercase">{store.name}</p>
                            <p className="text-[10px] text-white/30 font-bold uppercase">{store.code}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn("text-xl font-black", store.healthScore > 80 ? "text-yellow-500" : "text-red-500")}>
                              {store.healthScore}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : layout === 'map' ? (
                <motion.div
                  key="map-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3"
                >
                  {stats.processedStores.map(store => (
                    <div 
                      key={store.id} 
                      onClick={() => navigate(`/admin/monitoring/store/${store.id}`)}
                      className={cn(
                        "aspect-square rounded-xl border flex flex-col items-center justify-center p-2 text-center transition-all cursor-pointer hover:scale-105",
                        store.status === 'online' ? "bg-green-500/10 border-green-500/20 text-green-500" :
                        store.status === 'unstable' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                        "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase truncate w-full">{store.name}</span>
                      <span className="text-[14px] font-black mt-1">{store.healthScore}%</span>
                    </div>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </ScrollArea>

          <InkyInsights devices={devices} stores={stats.processedStores} />
        </div>

        <aside className="hidden xl:block w-80 shrink-0 border-l border-white/5 bg-[#08080a]">
          <EventsFeed tenantId={tenantId} />
        </aside>
      </main>

      <NOCFooter />
    </div>
  );
}
