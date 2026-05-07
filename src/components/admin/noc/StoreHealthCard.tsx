import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Monitor, WifiOff, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StoreHealthCardProps {
  store: {
    id: string;
    name: string;
    code: string;
    online: number;
    offline: number;
    unstable: number;
    total: number;
    healthScore: number;
    sla: number;
    lastActivity: string | null;
    status: "online" | "offline" | "unstable";
  };
}

export function StoreHealthCard({ store }: StoreHealthCardProps) {
  const navigate = useNavigate();
  const isCritical = store.offline > 0 || store.healthScore < 80;

  return (
    <div className={cn(
      "group relative flex flex-col bg-[#111114] border-2 rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl",
      store.status === "online" ? "border-green-500/20 shadow-green-500/5" :
      store.status === "unstable" ? "border-yellow-500/30 shadow-yellow-500/5" :
      "border-red-500/40 shadow-red-500/10"
    )}>
      {/* Glow Effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
        store.status === "online" ? "bg-green-500" :
        store.status === "unstable" ? "bg-yellow-500" :
        "bg-red-500"
      )} />

      {/* Header */}
      <div className="p-4 border-b border-white/5 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-black uppercase text-white truncate leading-tight tracking-tight">
              {store.name}
            </h3>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-0.5">
              Code: {store.code}
            </span>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className={cn(
              "h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(0,0,0,0.5)]",
              store.status === "online" ? "bg-green-500 shadow-green-500/50" :
              store.status === "unstable" ? "bg-yellow-500 shadow-yellow-500/50" :
              "bg-red-500 shadow-red-500/50 animate-pulse"
            )} />
            {isCritical && (
              <Badge variant="destructive" className="mt-2 text-[8px] h-4 px-1.5 font-black uppercase animate-pulse">
                CRÍTICO
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Content */}
      <div className="p-4 flex-1 flex flex-col gap-4 relative z-10">
        {/* Health Score & SLA */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Saúde</span>
              <span className={cn(
                "text-xs font-black",
                store.healthScore > 90 ? "text-green-500" : store.healthScore > 70 ? "text-yellow-500" : "text-red-500"
              )}>
                {store.healthScore}%
              </span>
            </div>
            <Progress value={store.healthScore} className="h-1 bg-white/5" indicatorClassName={cn(
              store.healthScore > 90 ? "bg-green-500" : store.healthScore > 70 ? "bg-yellow-500" : "bg-red-500"
            )} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">SLA</span>
              <span className="text-xs font-black text-blue-500">{store.sla}%</span>
            </div>
            <Progress value={store.sla} className="h-1 bg-white/5" indicatorClassName="bg-blue-500" />
          </div>
        </div>

        {/* Device Status Bar */}
        <div className="bg-black/20 rounded-lg p-2 flex items-center justify-around border border-white/5">
          <DeviceMiniStat icon={Monitor} count={store.online} label="ON" color="text-green-500" />
          <div className="w-px h-6 bg-white/5" />
          <DeviceMiniStat icon={WifiOff} count={store.offline} label="OFF" color="text-red-500" />
          <div className="w-px h-6 bg-white/5" />
          <DeviceMiniStat icon={AlertTriangle} count={store.unstable} label="INST" color="text-yellow-500" />
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-8 mt-2 border-white/5 bg-white/5 hover:bg-primary hover:text-primary-foreground group/btn transition-all duration-300"
          onClick={() => navigate(`/admin/monitoring/store/${store.id}`)}
        >
          <ExternalLink className="h-3 w-3 mr-2 group-hover/btn:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Monitorar Loja</span>
        </Button>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 text-white/30" />
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
            {store.lastActivity ? formatDistanceToNow(new Date(store.lastActivity), { addSuffix: true, locale: ptBR }) : 'Sem atividade'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity className={cn("h-3 w-3", store.status === 'online' ? "text-green-500" : "text-red-500")} />
          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
            {store.total} Dispositivos
          </span>
        </div>
      </div>
    </div>
  );
}

function DeviceMiniStat({ icon: Icon, count, label, color }: any) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3 opacity-50", color)} />
        <span className={cn("text-xs font-black", color)}>{count}</span>
      </div>
      <span className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">{label}</span>
    </div>
  );
}
