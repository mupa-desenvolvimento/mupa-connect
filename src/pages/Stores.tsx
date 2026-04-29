import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, MonitorPlay, Plus, Loader2, RefreshCw, Store } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function StoresPage() {
  const stockCenterId = "003ZAF";

  const { data: storesData, isLoading, refetch } = useQuery({
    queryKey: ["stores-stock-center"],
    queryFn: async () => {
      // 1. Get all unique branch numbers from devices of Stock Center
      const { data: devices, error: deviceError } = await supabase
        .from("dispositivos")
        .select("num_filial, online")
        .eq("empresa", stockCenterId);
      
      if (deviceError) throw deviceError;

      // 2. Count devices per branch
      const branchStats: Record<string, { total: number, online: number }> = {};
      devices?.forEach(d => {
        const filial = d.num_filial || "Sem Filial";
        if (!branchStats[filial]) {
          branchStats[filial] = { total: 0, online: 0 };
        }
        branchStats[filial].total += 1;
        if (d.online) branchStats[filial].online += 1;
      });

      // 3. Transform to display format
      return Object.entries(branchStats).map(([filial, stats]) => ({
        id: filial,
        name: `Stock Center - Filial ${filial}`,
        code: `SC-${filial.padStart(3, '0')}`,
        city: "Passo Fundo", // Default for Stock Center
        devicesCount: stats.total,
        onlineCount: stats.online
      })).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    },
  });

  return (
    <>
      <PageHeader
        title="Lojas - Stock Center"
        description="Gestão de unidades físicas e monitoramento de terminais por filial."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Nova loja
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando lojas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storesData && storesData.length > 0 ? (
            storesData.map((s) => (
              <Card key={s.id} className="hover:shadow-elegant transition-all duration-300 border-border/60 hover:border-primary/30 group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-display font-bold text-lg truncate">{s.name}</div>
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5 px-1.5 py-0.5 bg-muted rounded w-fit">
                        {s.code}
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-gradient-primary shadow-sm grid place-items-center text-primary-foreground text-xs font-bold shrink-0">
                      <Store className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>{s.city}</span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MonitorPlay className="h-4 w-4 text-primary" />
                        <span>{s.devicesCount} Dispositivos</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-2 w-2 rounded-full bg-success animate-pulse"></span>
                        <span className="text-xs font-semibold text-success">{s.onlineCount} Online</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="ghost" className="w-full mt-4 h-8 text-xs font-semibold text-primary hover:bg-primary/5 group-hover:bg-primary/5">
                    Ver detalhes da filial
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed rounded-xl border-border/40">
              <p className="text-muted-foreground">Nenhuma filial encontrada para Stock Center.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
