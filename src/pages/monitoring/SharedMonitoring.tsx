import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Monitor, WifiOff, AlertCircle, Warehouse, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ProductQueriesFeed } from "@/components/admin/monitoring/ProductQueriesFeed";

type PanelType = "status" | "metrics" | "alerts" | "store_view" | "queries_feed";
type LayoutType = "1" | "2h" | "2v" | "4" | "6";

interface PanelConfig {
  id: string;
  type: PanelType;
  title: string;
  storeId?: string;
}

export default function SharedMonitoringPage() {
  const { token } = useParams<{ token: string }>();
  const [viewData, setViewData] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    async function fetchView() {
      if (!token) return;

      try {
        const { data, error: vError } = await supabase
          .from("monitoring_views")
          .select("*")
          .eq("token", token)
          .eq("is_active", true)
          .maybeSingle() as any;

        if (vError || !data) {
          setError("Link de monitoramento inválido, expirado ou inativo.");
          setLoading(false);
          return;
        }

        // Check expiration
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError("Este link de monitoramento expirou.");
          setLoading(false);
          return;
        }

        setViewData(data);
        await Promise.all([fetchDevices(data), fetchStores(data)]);
        
        // Setup subscriptions
        const devicesSubscription = supabase
          .channel(`shared_noc_devices_${token}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'dispositivos' }, () => {
            fetchDevices(data);
          })
          .subscribe();

        const interval = setInterval(() => {
          fetchDevices(data);
        }, 15000);

        setLoading(false);

        return () => {
          supabase.removeChannel(devicesSubscription);
          clearInterval(interval);
        };
      } catch (err) {
        console.error("Error fetching shared view:", err);
        setError("Erro ao carregar o monitoramento.");
        setLoading(false);
      }
    }

    fetchView();
  }, [token]);

  async function fetchDevices(vData: any) {
    let query = supabase.from("dispositivos").select("*");
    
    if (vData.company_id) {
      query = query.eq("company_id", vData.company_id);
    }

    const { data } = await query.order('last_heartbeat_at', { ascending: false });
    if (data) {
      setDevices(data);
      setLastUpdate(new Date());
    }
  }

  async function fetchStores(vData: any) {
    let query = supabase.from("stores").select("id, name, code, tenant_id");
    if (vData.tenant_id) {
      query = query.eq("tenant_id", vData.tenant_id);
    }
    const { data } = await query;
    if (data) setStores(data);
  }

  const getDeviceStatus = (device: any) => {
    if (!device.last_heartbeat_at) return "offline";
    const now = new Date();
    const lastHeartbeat = new Date(device.last_heartbeat_at);
    const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;
    
    if (diffSeconds > 120) return "offline";
    if (diffSeconds > 60) return "unstable";
    return "online";
  };

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
            tenantId={viewData?.tenant_id}
            isSuperAdmin={false}
          />
        );
      case "status":
      case "store_view":
        let displayDevices = devices;
        if (panel.type === "store_view" && panel.storeId) {
          const store = stores.find(s => s.id === panel.storeId);
          if (store) {
            displayDevices = devices.filter(d => d.num_filial === store.code || d.empresa === store.name);
          }
        }
        return (
          <ScrollArea className="h-full pr-4">
            <div className="grid grid-cols-1 gap-1 p-1">
              {displayDevices.map(d => {
                const status = getDeviceStatus(d);
                return (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded border bg-background/30 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        status === "online" ? "bg-green-500" : status === "unstable" ? "bg-yellow-500" : "bg-red-500"
                      )} />
                      <div className="flex flex-col">
                        <span className="font-bold uppercase truncate max-w-[120px]">{d.apelido_interno || d.serial}</span>
                        <span className="text-[9px] opacity-60 uppercase">{d.num_filial || '—'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] opacity-60">
                      {d.last_heartbeat_at ? formatDistanceToNow(new Date(d.last_heartbeat_at), { addSuffix: true, locale: ptBR }) : 'Nunca'}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        );
      default:
        return null;
    }
  };

  const getGridLayoutClass = (layout: LayoutType) => {
    switch (layout) {
      case "1": return "grid-cols-1";
      case "2h": return "grid-cols-1 grid-rows-2";
      case "2v": return "grid-cols-2";
      case "4": return "grid-cols-2 grid-rows-2";
      case "6": return "grid-cols-3 grid-rows-2";
      default: return "grid-cols-2 grid-rows-2";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const config = viewData?.config || {};
  const layout = (config.layout as LayoutType) || "4";
  const panels = (config.panels as PanelConfig[]) || [];

  return (
    <div className="fixed inset-0 z-50 p-4 bg-[#09090b] flex flex-col text-foreground overflow-hidden">
      {/* Header do NOC Compartilhado */}
      <div className="flex items-center justify-between mb-4 border-b pb-4 border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase text-white">NOC <span className="text-primary">Monitor</span></h1>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Live Update: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/70">
          VISUALIZAÇÃO COMPARTILHADA
        </Badge>
      </div>

      {/* Grid de Painéis */}
      <div className={cn(
        "grid flex-1 gap-4 overflow-hidden",
        getGridLayoutClass(layout)
      )}>
        {panels.slice(0, layout === "6" ? 6 : layout === "4" ? 4 : layout === "1" ? 1 : 2).map((panel) => (
          <Card key={panel.id} className="border-border/60 bg-card/30 flex flex-col overflow-hidden shadow-elegant border-2">
            <CardHeader className="py-2 px-4 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-white">
                {panel.type === "metrics" && <Activity className="h-3.5 w-3.5 text-primary" />}
                {panel.type === "alerts" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                {panel.type === "status" && <Monitor className="h-3.5 w-3.5 text-green-500" />}
                {panel.type === "store_view" && <Warehouse className="h-3.5 w-3.5 text-blue-500" />}
                {panel.type === "queries_feed" && <Search className="h-3.5 w-3.5 text-purple-500" />}
                {panel.title}
              </CardTitle>
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
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-muted-foreground">{label}</span>
      <span className={cn("text-3xl font-black mt-1", color)}>{value}</span>
    </div>
  );
}
