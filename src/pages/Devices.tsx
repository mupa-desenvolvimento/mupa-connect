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
  const { companyId, isSuperAdmin, isTecnico, isAdmin } = useUserRole();

  const openDeviceDrawer = (device: any) => {
    setSelectedDevice(device);
    setDrawerOpen(true);
  };

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["dispositivos-full", companyId],
    queryFn: async () => {
      let query = supabase.from("dispositivos").select("*");
      
      if (!isSuperAdmin && companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query.order("apelido_interno");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: stores } = useQuery({
    queryKey: ["stores-list", companyId],
    queryFn: async () => {
      let query = supabase.from("dispositivos").select("num_filial").not("num_filial", "is", null);
      if (!isSuperAdmin && companyId) {
        query = query.eq("company_id", companyId);
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
    const isHeartbeatRecent = (now - heartbeatTime) < 60000;
    const isProofRecent = (now - proofTime) < 60000;
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <PageHeader
        title="Dispositivos"
        description="Monitoramento real dos terminais da rede com status de exibição."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg p-1 bg-muted/30">
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
            {isTecnico && (
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="h-10 border-primary/40 text-primary hover:bg-primary/10">
                <Megaphone className="h-4 w-4 mr-2" /> Comandos
              </Button>
            )}
            {isTecnico && (
              <Button variant="outline" size="sm" onClick={handleRebootAll} className="h-10 text-destructive hover:bg-destructive/10">
                <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Todos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-10"><RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Atualizar</Button>
            {isAdmin && (
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-10"><Plus className="h-4 w-4 mr-2" /> Novo</Button>
            )}
          </div>
        }
      />

      <div className="bg-card border-y p-4 flex flex-wrap items-center gap-4 sticky top-0 z-10 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Lojas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {stores?.map(s => <SelectItem key={s.id} value={s.code || s.id.toString()}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue placeholder="Todos os Grupos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Grupos</SelectItem>
            {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-10"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="unstable">Instável</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        {(search || storeFilter !== "all" || groupFilter !== "all" || statusFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => {setSearch(""); setStoreFilter("all"); setGroupFilter("all"); setStatusFilter("all");}}><FilterX className="h-4 w-4 mr-2" /> Limpar</Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
            <Card className="border-border/60 shadow-elegant overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Dispositivo</TableHead>
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
                      <TableRow key={d.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openDeviceDrawer(d)}>
                        <TableCell><div className="flex items-center gap-3"><Monitor className="h-4 w-4 text-primary" />{d.apelido_interno}</div></TableCell>
                        <TableCell className="font-mono text-xs">{d.serial}</TableCell>
                        <TableCell>Loja {d.num_filial}</TableCell>
                        <TableCell>{formatDate(d.last_heartbeat_at)}</TableCell>
                        <TableCell><StatusBadge status={status} /></TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            {isTecnico && (
                              <Button size="icon" variant="ghost" onClick={() => handleRebootDevice(d.id.toString(), d.apelido_interno)}><RotateCcw className="h-4 w-4 text-destructive" /></Button>
                            )}
                            <Button asChild size="sm" variant="outline"><Link to={`/play/${d.serial}`} target="_blank"><Play className="h-3 w-3 mr-1" /> Player</Link></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </ScrollArea>

      <DeviceFirebaseCommandDrawer
        device={selectedDevice}
        status={selectedDevice ? getStatus(selectedDevice.last_heartbeat_at, selectedDevice.last_proof_at) : "offline"}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        formatDate={formatDate}
      />
      <BulkCommandDialog open={bulkOpen} onOpenChange={setBulkOpen} selectedCount={filteredDevices.length} devices={filteredDevices} />
    </div>
  );
}
