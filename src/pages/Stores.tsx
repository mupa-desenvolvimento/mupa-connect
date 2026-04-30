import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, MonitorPlay, Plus, Loader2, RefreshCw, Store, Smartphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QuickAccessModal } from "@/components/QuickAccessModal";
import { useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";

export default function StoresPage() {
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string } | null>(null);
  const { companyId, tenantId, isSuperAdmin, isLoading: roleLoading } = useUserRole();

  // Buscar dados da empresa ativa para nomear as filiais corretamente
  const { data: company } = useQuery({
    queryKey: ["company-info", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, code, name")
        .eq("id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: storesData, isLoading, refetch } = useQuery({
    queryKey: ["stores-by-company", companyId],
    enabled: !roleLoading && (!!companyId || isSuperAdmin),
    queryFn: async () => {
      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("id, name, code, tenant_id")
        .eq("is_active", true);

      if (storesError) throw storesError;

      // Filtrar as lojas se não for super admin
      let filteredStores = stores || [];
      if (!isSuperAdmin) {
        if (tenantId) {
          // Gerente de loja - vê apenas as lojas vinculadas ao seu tenant
          filteredStores = filteredStores.filter(s => s.tenant_id === tenantId);
        } else if (companyId) {
          // Admin da empresa - vê todas as lojas da empresa (o RLS já deve cuidar disso, mas aqui garantimos via lógica)
          // Se as lojas tivessem company_id, filtraríamos por ele. Como usam tenant_id/RLS, mantemos a lista.
        }
      }

      // Agora buscamos as estatísticas de dispositivos para essas lojas
      const { data: devices, error: deviceError } = await supabase
        .from("dispositivos")
        .select("num_filial, online");

      if (deviceError) throw deviceError;

      const branchStats: Record<string, { total: number; online: number }> = {};
      devices?.forEach((d) => {
        const filial = d.num_filial || "Sem Filial";
        if (!branchStats[filial]) branchStats[filial] = { total: 0, online: 0 };
        branchStats[filial].total += 1;
        if (d.online) branchStats[filial].online += 1;
      });

      const companyName = company?.name?.trim() || "Empresa";

      return filteredStores.map((s) => ({
        id: s.id,
        name: s.name || `${companyName} - Filial ${s.code}`,
        code: s.code || "---",
        city: "—",
        devicesCount: branchStats[s.code]?.total || 0,
        onlineCount: branchStats[s.code]?.online || 0,
      })).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    },
  });

  const showEmptyState = !roleLoading && !companyId && !isSuperAdmin;

  return (
    <>
      <PageHeader
        title={`Lojas${company?.name ? ` - ${company.name.trim()}` : ""}`}
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

      {showEmptyState ? (
        <div className="h-40 flex items-center justify-center border-2 border-dashed rounded-xl border-border/40">
          <p className="text-muted-foreground">Nenhuma empresa selecionada para este usuário.</p>
        </div>
      ) : isLoading || roleLoading ? (
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

                  <div className="flex gap-2 mt-4">
                    <Button variant="ghost" className="flex-1 h-8 text-xs font-semibold text-primary hover:bg-primary/5">
                      Detalhes
                    </Button>
                    <Button
                      variant="outline"
                      className="h-8 px-2 text-primary border-primary/20 hover:bg-primary/5"
                      onClick={() => setSelectedStore({ id: s.id, name: s.name })}
                      title="Gerenciar Acesso Rápido"
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full h-40 flex items-center justify-center border-2 border-dashed rounded-xl border-border/40">
              <p className="text-muted-foreground">
                Nenhuma filial encontrada{company?.name ? ` para ${company.name.trim()}` : ""}.
              </p>
            </div>
          )}
        </div>
      )}

      <QuickAccessModal
        isOpen={!!selectedStore}
        onClose={() => setSelectedStore(null)}
        storeId={selectedStore?.id}
        storeName={selectedStore?.name}
        companyId={companyId || undefined}
        tenantId={tenantId || undefined}
      />
    </>
  );
}
