import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Search, ChevronLeft, ChevronRight, Smartphone, ExternalLink, MoreVertical } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useUserRole } from "@/hooks/use-user-role";
import { QuickAccessModal } from "@/components/QuickAccessModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function StoresPage() {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedStore, setSelectedStore] = useState<{ id: string; name: string } | null>(null);
  
  const { companyId, tenantId, isSuperAdmin, isLoading: roleLoading } = useUserRole();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["stores-paginated", page, debouncedSearch, statusFilter, companyId, tenantId, isSuperAdmin],
    enabled: !roleLoading,
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select("id, name, code, is_active, tenant_id", { count: "exact" });

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }
      
      if (statusFilter !== "all") {
        query = query.eq("is_active", statusFilter === "active");
      }

      // Role based filtering
      if (!isSuperAdmin) {
        if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        } else if (companyId) {
          // In this schema, stores relate to tenants, and companies relate to tenants.
          // Usually one company = one tenant or many companies in one tenant.
          // The previous code implied tenantId was the store filter.
        }
      }

      const { data: stores, error, count } = await query
        .order("name")
        .range(page * pageSize, (page + 1) * pageSize - 1);
        
      if (error) throw error;

      // Fetch device counts for the current page
      // Filtered by tenantId if available
      let deviceQuery = supabase.from("dispositivos").select("num_filial");
      
      if (tenantId && !isSuperAdmin) {
        deviceQuery = deviceQuery.eq("tenant_id", tenantId);
      }
      
      const { data: allDevices } = await deviceQuery;

      const normalize = (val: string | null | undefined) => {
        if (!val) return "";
        // Remove "FIL-", "fil-", "Fil-" case insensitive
        let normalized = val.replace(/FIL-/gi, "");
        // Remove spaces
        normalized = normalized.replace(/\s+/g, "");
        // Remove leading zeros
        normalized = normalized.replace(/^0+/, "");
        // If it was "0", it becomes empty, so we should probably keep "0" if it's just zero, 
        // but the rule says "remover zeros à esquerda". Let's assume "01" -> "1".
        // If it was just "0", normalized is now "". Let's make it "0" if empty but original had content.
        if (normalized === "" && val.trim() !== "") {
          const onlyDigits = val.replace(/[^0-9]/g, "");
          if (onlyDigits.match(/^0+$/)) return "0";
        }
        return normalized.toLowerCase();
      };

      const storesWithCounts = stores.map((s) => {
        const storeCode = s.code;
        let count = 0;
        
        if (allDevices) {
          const normalizedStoreCode = normalize(storeCode);
          
          const filteredDevices = allDevices.filter(d => {
            const normalizedDeviceFilial = normalize(d.num_filial);
            const match = normalizedStoreCode !== "" && normalizedStoreCode === normalizedDeviceFilial;
            
            // Debug logs as requested
            if (normalizedStoreCode !== "" && normalizedDeviceFilial !== "") {
              console.log(`[Matching] Store: ${s.name} (${storeCode} -> ${normalizedStoreCode}) | Device Filial: (${d.num_filial} -> ${normalizedDeviceFilial}) | Match: ${match}`);
            }
            
            return match;
          });
          
          count = filteredDevices.length;
        }

        return {
          ...s,
          devicesCount: count,
        };
      });

      return {
        stores: storesWithCounts,
        count: count || 0,
      };
    },
  });

  const totalPages = Math.ceil((data?.count || 0) / pageSize);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, statusFilter]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Lojas"
        description="Gestão de unidades físicas e monitoramento de terminais."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="hidden md:flex">
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button className="bg-gradient-primary shadow-glow" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova Loja
            </Button>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-xl border border-border/60 shadow-sm">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-background/50 border-border/40 focus:bg-background"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px] bg-background/50 border-border/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-border/60 rounded-xl bg-card shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 border-b border-border/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[30%]">Nome da Loja</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Dispositivos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || roleLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <div className="h-10 w-full bg-muted/40 animate-pulse rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Search className="h-10 w-10 opacity-20" />
                      <p>Nenhuma loja encontrada com os filtros atuais.</p>
                      <Button variant="link" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                        Limpar filtros
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.stores.map((s) => (
                  <TableRow key={s.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground/90">
                      {s.name}
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                        {s.code || "---"}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={s.is_active ? "default" : "secondary"}
                        className={s.is_active ? "bg-success/10 text-success border-success/20 hover:bg-success/20" : "bg-muted text-muted-foreground border-border"}
                      >
                        {s.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex items-center justify-center px-2 py-1 bg-primary/5 rounded-md text-primary font-medium text-xs">
                        {s.devicesCount}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => setSelectedStore({ id: s.id, name: s.name })}
                          title="Acesso Rápido"
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              Configurações
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium">{data?.stores.length}</span> de <span className="font-medium">{data?.count}</span> lojas
            </p>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(0, p - 1))} 
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} 
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <QuickAccessModal
        isOpen={!!selectedStore}
        onClose={() => setSelectedStore(null)}
        storeId={selectedStore?.id}
        storeName={selectedStore?.name}
        companyId={companyId || undefined}
        tenantId={tenantId || undefined}
      />
    </div>
  );
}