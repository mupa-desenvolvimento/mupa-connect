import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  WifiOff, 
  Monitor, 
  AlertCircle, 
  ChevronLeft, 
  ShieldCheck, 
  Clock,
  Search,
  Zap,
  PlayCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { NOCFooter } from "@/components/admin/noc/NOCFooter";

export default function StoreMonitoringPage() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { isSuperAdmin, companyId, tenantId } = useUserRole();
  const [store, setStore] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const normalize = (value: any) => String(value || "").replace(/^0+/, "").trim();

  useEffect(() => {
    if (!storeId) return;
    fetchData();

    const channel = supabase
      .channel(`store_noc_${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos' }, () => {
        fetchDevices();
      })
      .subscribe();

    const interval = setInterval(() => {
      fetchDevices();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [storeId]);

  async function fetchData() {
    setLoading(true);
    await Promise.all([fetchStore(), fetchDevices()]);
    setLoading(false);
  }

  async function fetchStore() {
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("id", storeId)
      .single();
    if (data) setStore(data);
  }

  async function fetchDevices() {
    let query = supabase.from("dispositivos").select("*");
    
    // First try to get devices by store_id if it exists
    const { data: byId } = await query.eq("store_id", storeId);
    
    if (byId && byId.length > 0) {
      setDevices(byId);
      setLastUpdate(new Date());
      return;
    }

    // Fallback: search by code normalization if we have the store info
    if (store?.code) {
      const cleanCode = normalize(store.code);
      const { data: byCode } = await supabase.from("dispositivos").select("*");
      if (byCode) {
        const filtered = byCode.filter(d => normalize(d.num_filial) === cleanCode);
        setDevices(filtered);
      }
    } else {
      // If store info not loaded yet, wait or fetch everything and filter
      const { data: all } = await supabase.from("dispositivos").select("*");
      if (all && store) {
        const cleanCode = normalize(store.code);
        const filtered = all.filter(d => normalize(d.num_filial) === cleanCode);
        setDevices(filtered);
      }
    }
    setLastUpdate(new Date());
  }

  const stats = useMemo(() => {
    const online = devices.filter(d => getStatus(d) === "online").length;
    const offline = devices.filter(d => getStatus(d) === "offline").length;
    const unstable = devices.filter(d => getStatus(d) === "unstable").length;
    const healthScore = devices.length > 0 ? Math.round((online / devices.length) * 100) : 100;
    
    return { online, offline, unstable, total: devices.length, healthScore };
  }, [devices]);

  function getStatus(device: any) {
    if (!device.last_heartbeat_at) return "offline";
    const diff = (Date.now() - new Date(device.last_heartbeat_at).getTime()) / 1000;
    if (diff > 120) return "offline";
    if (diff > 60) return "unstable";
    return "online";
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#050507] flex items-center justify-center">
        <Activity className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#050507] text-white overflow-hidden font-sans fixed inset-0 z-[70]">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#0a0a0c] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/monitoring")} className="text-white/40">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black uppercase tracking-tighter text-white leading-none">
              {store?.name} <span className="text-primary/40 font-light ml-2">Store NOC</span>
            </h1>
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
              Código: {store?.code} • Sync: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <StoreStat label="Online" value={stats.online} color="text-green-500" />
          <StoreStat label="Offline" value={stats.offline} color="text-red-500" pulse={stats.offline > 0} />
          <StoreStat label="Saúde" value={`${stats.healthScore}%`} color={stats.healthScore > 80 ? "text-primary" : "text-red-500"} />
          <div className="w-px h-8 bg-white/5 mx-2" />
          <Button variant="secondary" size="sm" className="bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px]">
            Relatório de Uptime
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Top Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard title="Dispositivos" value={stats.total} icon={Monitor} color="text-blue-500" />
            <SummaryCard title="Disponibilidade" value="99.8%" icon={Zap} color="text-yellow-500" />
            <SummaryCard title="Incidentes (24h)" value="2" icon={AlertCircle} color="text-red-500" />
            <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">Score Operacional</span>
                <span className="text-sm font-black text-primary">{stats.healthScore}%</span>
              </div>
              <Progress value={stats.healthScore} className="h-1.5 bg-white/5" />
            </div>
          </div>

          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-4">Dispositivos em Operação</h2>
          
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
              <AnimatePresence>
                {devices.map((device) => (
                  <DeviceNocCard key={device.id} device={device} status={getStatus(device)} />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar Alerts */}
        <aside className="w-80 shrink-0 border-l border-white/5 bg-[#08080a] flex flex-col">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Incidentes da Loja</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {stats.offline > 0 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase">Dispositivo Offline</span>
                  </div>
                  <p className="text-[11px] text-white/60">Verifique a conexão de rede ou fonte de energia.</p>
                </div>
              )}
              {devices.length === 0 && (
                <div className="text-center py-20 opacity-20">
                  <Activity className="h-10 w-10 mx-auto mb-2" />
                  <span className="text-[10px] font-black uppercase">Nenhum dado</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </main>

      <NOCFooter />
    </div>
  );
}

function StoreStat({ label, value, color, pulse }: any) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">{label}</span>
      <span className={cn("text-lg font-black leading-none", color, pulse && "animate-pulse")}>{value}</span>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-[#111114] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
      <div className={cn("h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{title}</span>
        <span className="text-xl font-black text-white">{value}</span>
      </div>
    </div>
  );
}

function DeviceNocCard({ device, status }: any) {
  const isStuck = device.player_status === 'stuck';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "p-4 rounded-xl border-2 bg-[#111114] transition-all hover:border-primary/40",
        status === 'online' ? "border-green-500/10" : status === 'unstable' ? "border-yellow-500/20" : "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black uppercase text-white truncate">{device.apelido_interno || device.serial}</span>
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-0.5">{device.serial}</span>
        </div>
        <div className={cn(
          "h-2.5 w-2.5 rounded-full",
          status === 'online' ? "bg-green-500" : status === 'unstable' ? "bg-yellow-500" : "bg-red-500 animate-pulse"
        )} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40 uppercase font-black tracking-tighter">Playlist Ativa</span>
          <div className="flex items-center gap-1.5 text-primary">
            <PlayCircle className="h-3 w-3" />
            <span className="font-bold truncate max-w-[120px]">{device.playlist_id ? 'Sincronizada' : 'Sem Playlist'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-white/40 uppercase font-black tracking-tighter">Último Heartbeat</span>
          <div className="flex items-center gap-1.5 text-white/60">
            <Clock className="h-3 w-3" />
            <span className="font-bold">
              {device.last_heartbeat_at ? formatDistanceToNow(new Date(device.last_heartbeat_at), { addSuffix: true, locale: ptBR }) : 'Nunca'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
        {isStuck && <Badge variant="destructive" className="text-[8px] h-4 px-1 font-black">PLAYER TRAVADO</Badge>}
        {device.persistence && <Badge variant="secondary" className="text-[8px] h-4 px-1 font-black bg-blue-500/20 text-blue-500">PERSISTENCE</Badge>}
        <Badge variant="outline" className={cn("text-[8px] h-4 px-1 font-black uppercase", status === 'online' ? "text-green-500 border-green-500/20" : "text-red-500 border-red-500/20")}>
          {status}
        </Badge>
      </div>
    </motion.div>
  );
}
