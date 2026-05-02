import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
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
  RotateCcw,
  Megaphone
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { issueDeviceCommand } from "@/lib/device-commands";
import { toast } from "sonner";
import { DeviceFirebaseCommandDrawer } from "@/components/DeviceFirebaseCommandDrawer";
import { BulkCommandDialog } from "@/components/BulkCommandDialog";
import { useUserRole } from "@/hooks/use-user-role";

type DeviceStatus = "online" | "unstable" | "offline";

export default function DevicesPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { tenantId, isSuperAdmin, isTecnico, isAdmin } = useUserRole();

  const openDeviceDrawer = (device: any) => {
    setSelectedDevice(device);
    setDrawerOpen(true);
  };

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["dispositivos-full", tenantId],
    queryFn: async () => {
      let query = supabase.from("dispositivos").select("*");
      
      // Filtrar por tenantId se disponível
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (!isSuperAdmin) {
        // Fallback de segurança se não for super admin e não tiver tenantId
        return [];
      }
      
      const { data, error } = await query.order("apelido_interno");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: stores } = useQuery({
    queryKey: ["stores-list", tenantId],
    queryFn: async () => {
      let query = supabase.from("dispositivos").select("num_filial").not("num_filial", "is", null);
      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (!isSuperAdmin) {
        return [];
      }
      const { data, error } = await query;
      if (error) return [];
      const uniqueFiliais = Array.from(new Set(data.map(d => d.num_filial))).sort();
      return uniqueFiliais.map(f => ({ id: f, name: `Loja ${f}`, code: f }));
    }
  });

  const getStatus = (lastHeartbeat: string | null, lastProof: string | null): DeviceStatus => {
    if (!lastHeartbeat) return "offline";
    const now = new Date().getTime();
    const heartbeatTime = new Date(lastHeartbeat).getTime();
    const proofTime = lastProof ? new Date(lastProof).getTime() : 0;
    // Aumentado para 5 minutos (300000ms) para ser mais tolerante a variações de conexão
    const isHeartbeatRecent = (now - heartbeatTime) < 300000;
    const isProofRecent = (now - proofTime) < 300000;
    if (isHeartbeatRecent) return isProofRecent ? "online" : "unstable";
    return "offline";
  };

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(d => {
      const status = getStatus(d.last_heartbeat_at, d.last_proof_at);
      const matchesSearch = d.apelido_interno?.toLowerCase().includes(search.toLowerCase()) || d.serial?.toLowerCase().includes(search.toLowerCase());
      const matchesStore = storeFilter === "all" || d.num_filial === storeFilter;
      const matchesGroup = groupFilter === "all" || d.grupo_dispositivos === groupFilter;
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStore && matchesGroup && matchesStatus;
    });
  }, [devices, search, storeFilter, groupFilter, statusFilter]);

  const groups = useMemo(() => {
    if (!devices) return [];
    return Array.from(new Set(devices.map(d => d.grupo_dispositivos).filter(Boolean)));
  }, [devices]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "Agora";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const handleRebootAll = async () => {
    if (!filteredDevices.length) return;
    if (!window.confirm(`Deseja reiniciar ${filteredDevices.length} dispositivos?`)) return;
    try {
      const promises = filteredDevices.map(d => issueDeviceCommand(d.id.toString(), "reboot", {}));
      await Promise.all(promises);
      toast.success(`Comandos enviados`);
    } catch (err) {
      toast.error("Falha ao enviar comandos");
    }
  };

  const handleRebootDevice = async (deviceId: string, name: string) => {
    try {
      await issueDeviceCommand(deviceId, "reboot", {});
      toast.success(`Reiniciando ${name}...`);
    } catch (err) {
      toast.error("Falha ao enviar comando");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Dispositivos"
        description="Monitoramento real dos terminais da rede com status de exibição."
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex border rounded-lg p-1 bg-muted/30 mr-2">
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
            {isTecnico && (
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="h-9 border-primary/40 text-primary hover:bg-primary/10">
                <Megaphone className="h-4 w-4 mr-2" /> Comandos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9"><RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Atualizar</Button>
            {isAdmin && (
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-9"><Plus className="h-4 w-4 mr-2" /> Novo</Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-xl border border-border/60 shadow-sm sticky top-0 z-10">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar dispositivo ou serial..." className="pl-10 h-10 bg-background/50 border-border/40 focus:bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full md:w-[160px] h-10 bg-background/50 border-border/40"><SelectValue placeholder="Lojas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Lojas</SelectItem>
              {stores?.map(s => <SelectItem key={s.id} value={s.code || s.id.toString()}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[130px] h-10 bg-background/50 border-border/40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="unstable">Instável</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          {(search || storeFilter !== "all" || groupFilter !== "all" || statusFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-10 text-muted-foreground hover:text-primary" onClick={() => {setSearch(""); setStoreFilter("all"); setGroupFilter("all"); setStatusFilter("all");}}><FilterX className="h-4 w-4 mr-2" /> Limpar</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-border/60 rounded-xl bg-card shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" /></div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%]">Dispositivo</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((d) => {
                  const status = getStatus(d.last_heartbeat_at, d.last_proof_at);
                  return (
                    <TableRow key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openDeviceDrawer({ ...d, status })}>
                      <TableCell><div className="flex items-center gap-3"><Monitor className="h-4 w-4 text-primary opacity-70" />{d.apelido_interno}</div></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d.serial}</TableCell>
                      <TableCell><span className="text-xs px-2 py-1 bg-muted rounded-md">Loja {d.num_filial}</span></TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(d.last_heartbeat_at)}</TableCell>
                      <TableCell><StatusBadge status={status} /></TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {isTecnico && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRebootDevice(d.id.toString(), d.apelido_interno)} title="Reiniciar"><RotateCcw className="h-4 w-4" /></Button>
                          )}
                          <Button asChild size="sm" variant="ghost" className="h-8 text-primary hover:bg-primary/10"><Link to={`/play/${d.serial}`} target="_blank"><Play className="h-3.5 w-3.5 mr-1" /> Player</Link></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <DeviceFirebaseCommandDrawer
        device={selectedDevice}
        status={selectedDevice?.status || "offline"}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        formatDate={formatDate}
      />
      <BulkCommandDialog 
        open={bulkOpen} 
        onOpenChange={setBulkOpen} 
        devices={filteredDevices} 
        stores={stores || []}
        groups={groups}
      />
    </div>
  );
}
