
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ExternalLink, 
  Plus, 
  Loader2, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  Search, 
  Store, 
  Monitor, 
  Settings, 
  Play,
  FilterX,
  RotateCcw
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Session } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { issueDeviceCommand } from "@/lib/device-commands";
import { toast } from "sonner";

type DeviceStatus = "online" | "unstable" | "offline";

export default function DevicesPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["dispositivos-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispositivos")
        .select("*")
        .eq("empresa", "1728965891007x215886838679286700") // Filtrar por Stok Center
        .order("apelido_interno");
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: stores } = useQuery({
    queryKey: ["stores-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("id, name, code");
      if (error) return [];
      return data;
    }
  });

  const getStatus = (lastHeartbeat: string | null, lastProof: string | null): DeviceStatus => {
    if (!lastHeartbeat) return "offline";
    const now = new Date().getTime();
    const heartbeatTime = new Date(lastHeartbeat).getTime();
    const proofTime = lastProof ? new Date(lastProof).getTime() : 0;
    
    const isHeartbeatRecent = (now - heartbeatTime) < 60000; // 60s
    const isProofRecent = (now - proofTime) < 60000; // 60s
    
    if (isHeartbeatRecent) {
      return isProofRecent ? "online" : "unstable";
    }
    return "offline";
  };

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    
    return devices.filter(d => {
      const status = getStatus(d.last_heartbeat_at, d.last_proof_at);
      const matchesSearch = 
        d.apelido_interno?.toLowerCase().includes(search.toLowerCase()) || 
        d.serial?.toLowerCase().includes(search.toLowerCase());
      
      const matchesStore = storeFilter === "all" || d.num_filial === storeFilter;
      const matchesGroup = groupFilter === "all" || d.grupo_dispositivos === groupFilter;
      const matchesStatus = statusFilter === "all" || status === statusFilter;

      return matchesSearch && matchesStore && matchesGroup && matchesStatus;
    });
  }, [devices, search, storeFilter, groupFilter, statusFilter]);

  const groups = useMemo(() => {
    if (!devices) return [];
    const uniqueGroups = Array.from(new Set(devices.map(d => d.grupo_dispositivos).filter(Boolean)));
    return uniqueGroups;
  }, [devices]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Agora";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStoreFilter("all");
    setGroupFilter("all");
    setStatusFilter("all");
  };

  const handleRebootAll = async () => {
    if (!filteredDevices.length) return;
    
    const confirm = window.confirm(`Deseja reiniciar ${filteredDevices.length} dispositivos filtrados?`);
    if (!confirm) return;

    try {
      const promises = filteredDevices.map(d => 
        issueDeviceCommand(d.id.toString(), "reboot", {})
      );
      await Promise.all(promises);
      toast.success(`Comando de reiniciar enviado para ${filteredDevices.length} dispositivos`);
    } catch (err) {
      console.error("Error rebooting all:", err);
      toast.error("Falha ao enviar comandos em massa");
    }
  };

  const handleRebootDevice = async (deviceId: string, name: string) => {
    try {
      await issueDeviceCommand(deviceId, "reboot", {});
      toast.success(`Reiniciando ${name}...`);
    } catch (err) {
      console.error("Error rebooting device:", err);
      toast.error("Falha ao enviar comando");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Dispositivos"
        description="Monitoramento real dos terminais da rede com status de exibição."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg p-1 bg-muted/30">
              <Button 
                variant={viewMode === "table" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-2"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === "grid" ? "secondary" : "ghost"} 
                size="sm" 
                className="h-8 px-2"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRebootAll} 
              disabled={isLoading || filteredDevices.length === 0} 
              className="h-10 text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reiniciar {filteredDevices.length < devices?.length ? "Filtrados" : "Todos"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="h-10">
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Atualizar
            </Button>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-10">
              <Plus className="h-4 w-4 mr-2" /> Novo
            </Button>
          </div>
        }
      />

      {/* Filters Area */}
      <div className="bg-card border-y p-4 flex flex-wrap items-center gap-4 sticky top-0 z-10 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou serial..." 
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Todas as Lojas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {stores?.map(s => (
              <SelectItem key={s.id} value={s.code || s.id.toString()}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Todos os Grupos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Grupos</SelectItem>
            {groups.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-10">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="unstable">Instável</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>

        {(search || storeFilter !== "all" || groupFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <FilterX className="h-4 w-4 mr-2" /> Limpar
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Sincronizando dispositivos...</p>
            </div>
          ) : filteredDevices.length > 0 ? (
            viewMode === "table" ? (
              <Card className="border-border/60 shadow-elegant overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[200px]">Dispositivo</TableHead>
                      <TableHead>Serial</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Última Atividade</TableHead>
                      <TableHead>Status Real</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDevices.map((d) => {
                      const status = getStatus(d.last_heartbeat_at, d.last_proof_at);
                      return (
                        <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-lg bg-primary/10",
                                status === "offline" && "bg-muted",
                                status === "unstable" && "bg-warning/10"
                              )}>
                                <Monitor className={cn(
                                  "h-4 w-4 text-primary",
                                  status === "offline" && "text-muted-foreground",
                                  status === "unstable" && "text-warning"
                                )} />
                              </div>
                              <span className="font-semibold block truncate max-w-[150px]">
                                {d.apelido_interno || "Sem nome"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {d.serial || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Store className="h-3 w-3 text-muted-foreground" />
                                <span>Loja {d.num_filial || "-"}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                                {d.grupo_dispositivos || "Sem Grupo"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Heartbeat:</span>
                                <span>{formatDate(d.last_heartbeat_at)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-muted-foreground">Exibição:</span>
                                <span>{formatDate(d.last_proof_at)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                                <Link to={`/dispositivos/${d.id}`}>
                                  <Settings className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRebootDevice(d.id.toString(), d.apelido_interno)}
                                title="Reiniciar Player"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                                <Link to={`/play/${d.serial}`} target="_blank">
                                  <Play className="h-3 w-3" /> Player
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDevices.map((d) => {
                  const status = getStatus(d.last_heartbeat_at, d.last_proof_at);
                  return (
                    <Card key={d.id} className={cn(
                      "hover:shadow-md transition-all border-l-4",
                      status === "online" ? "border-l-success" : 
                      status === "unstable" ? "border-l-warning" : "border-l-destructive"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm truncate max-w-[120px]">
                              {d.apelido_interno || "Sem nome"}
                            </h3>
                          </div>
                          <StatusBadge status={status} />
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Serial:</span>
                            <span className="font-mono">{d.serial || "-"}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Loja:</span>
                            <Badge variant="outline" className="h-5 text-[10px]">{d.num_filial || "-"}</Badge>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Grupo:</span>
                            <span className="truncate max-w-[100px]">{d.grupo_dispositivos || "-"}</span>
                          </div>
                        </div>

                        <div className="bg-muted/30 rounded p-2 mb-4 text-[10px] space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Heartbeat:</span>
                            <span>{formatDate(d.last_heartbeat_at)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Exibição:</span>
                            <span>{formatDate(d.last_proof_at)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRebootDevice(d.id.toString(), d.apelido_interno)}
                            title="Reiniciar Player"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs">
                            <Link to={`/dispositivos/${d.id}`}>Detalhes</Link>
                          </Button>
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link to={`/play/${d.serial}`} target="_blank">
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl">
              <div className="p-3 bg-muted rounded-full">
                <Monitor className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-muted-foreground">Nenhum dispositivo encontrado</p>
                <p className="text-xs text-muted-foreground/60">Tente ajustar seus filtros de busca.</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
