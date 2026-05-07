import { Sparkles, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface Insight {
  type: "warning" | "info" | "success";
  title: string;
  description: string;
  icon: any;
}

interface InkyInsightsProps {
  devices: any[];
  stores: any[];
}

export function InkyInsights({ devices, stores }: InkyInsightsProps) {
  const insights = useMemo(() => {
    const list: Insight[] = [];

    // Check for multiple devices offline in the same store
    const storeOfflineCounts = stores.map(store => {
      const cleanCode = store.code?.replace(/^0+/, '');
      const storeDevices = devices.filter(d => {
        const deviceCode = d.num_filial?.replace(/^0+/, '');
        return (deviceCode && cleanCode && deviceCode === cleanCode) || 
               d.num_filial === store.code || 
               d.empresa === store.name;
      });
      
      const offline = storeDevices.filter(d => {
        if (!d.last_heartbeat_at) return true;
        const diff = (Date.now() - new Date(d.last_heartbeat_at).getTime()) / 1000;
        return diff > 120;
      }).length;

      return { store, offline, total: storeDevices.length };
    });

    const criticalStores = storeOfflineCounts.filter(s => s.offline >= 2 || (s.total > 0 && s.offline === s.total));
    
    if (criticalStores.length > 0) {
      list.push({
        type: "warning",
        title: "Possível Falha de Conexão",
        description: `${criticalStores.length} lojas possuem múltiplos dispositivos offline simultaneamente. Verifique a internet local.`,
        icon: AlertTriangle
      });
    }

    // SLA insight
    const onlineTotal = devices.filter(d => {
      if (!d.last_heartbeat_at) return false;
      const diff = (Date.now() - new Date(d.last_heartbeat_at).getTime()) / 1000;
      return diff <= 120;
    }).length;
    
    const slaPercent = devices.length > 0 ? (onlineTotal / devices.length) * 100 : 100;

    if (slaPercent > 99) {
      list.push({
        type: "success",
        title: "Estabilidade Operacional Alta",
        description: `SLA atual de ${slaPercent.toFixed(1)}% está acima da meta. Operação saudável.`,
        icon: Zap
      });
    }

    // Default Inky insight
    if (list.length === 0) {
      list.push({
        type: "info",
        title: "Monitoramento Ativo",
        description: "Inky está analisando o tráfego de dados. Nenhuma anomalia crítica detectada no momento.",
        icon: Lightbulb
      });
    }

    return list;
  }, [devices, stores]);

  return (
    <div className="bg-[#111114] border-t border-white/5 p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <h3 className="text-xs font-black uppercase tracking-widest text-primary">
          Inky <span className="text-white/40">Insights</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-black/40",
              insight.type === 'warning' ? "border-red-500/20" : 
              insight.type === 'success' ? "border-green-500/20" : "border-blue-500/20"
            )}
          >
            <div className={cn(
              "p-1.5 rounded-md",
              insight.type === 'warning' ? "bg-red-500/10 text-red-500" : 
              insight.type === 'success' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
            )}>
              <insight.icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase text-white tracking-tight">
                {insight.title}
              </span>
              <p className="text-[10px] font-medium text-white/40 leading-relaxed mt-1">
                {insight.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
