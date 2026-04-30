import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

export default function StoresPage() {
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["stores-paginated", page, debouncedSearch, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("stores")
        .select("id, name, code, is_active, tenant_id", { count: "exact" })
        .order("name");

      if (debouncedSearch) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }
      if (statusFilter !== "all") {
        query = query.eq("is_active", statusFilter === "active");
      }

      const { data, error, count } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;

      // Fetch device counts
      const storeIds = data.map((s) => s.id);
      const { data: devices } = await supabase
        .from("dispositivos")
        .select("num_filial")
        .in("num_filial", data.map(s => s.code).filter(Boolean) as string[]);

      const deviceCounts = devices?.reduce((acc: Record<string, number>, d) => {
        acc[d.num_filial!] = (acc[d.num_filial!] || 0) + 1;
        return acc;
      }, {});

      return {
        stores: data.map((s) => ({
          ...s,
          devicesCount: deviceCounts?.[s.code!] || 0,
        })),
        count: count || 0,
      };
    },
  });

  const totalPages = Math.ceil((data?.count || 0) / pageSize);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <PageHeader
        title="Gestão de Lojas"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button className="bg-gradient-primary">
              <Plus className="h-4 w-4 mr-2" /> Nova Loja
            </Button>
          </div>
        }
      />

      <div className="flex gap-4 mb-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-hidden border rounded-md bg-card">
        <div className="h-full overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dispositivos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Carregando...</TableCell>
                </TableRow>
              ) : data?.stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">Nenhuma loja encontrada.</TableCell>
                </TableRow>
              ) : (
                data?.stores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{s.devicesCount}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Editar</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between py-4">
        <span className="text-sm text-muted-foreground">
          Página {page + 1} de {totalPages || 1}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}