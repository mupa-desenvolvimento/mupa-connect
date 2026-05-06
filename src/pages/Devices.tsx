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
  Activity,
  FilterX,
  RotateCcw,
  Megaphone,
  Layers,
  AlertTriangle,
  Edit2,
  CheckSquare,
  Square
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { CreateDeviceModal } from "@/components/CreateDeviceModal";
import { EditDeviceModal } from "@/components/EditDeviceModal";
import { PlaylistChangeModal } from "@/components/PlaylistChangeModal";
import { Checkbox } from "@/components/ui/checkbox";

type ConnectionStatus = "online" | "unstable" | "offline";
type PlayerStatus = "reproduzindo" | "parado" | "erro";

export default function DevicesPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [playlistFilter, setPlaylistFilter] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { tenantId, isSuperAdmin, isTecnico, isAdmin } = useUserRole();

  const openDeviceDrawer = (device: any) => {
    setSelectedDevice(device);
    setDrawerOpen(true);
  };

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ["dispositivos-full", tenantId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase.from("dispositivos").select(`
        *,
        playlists:playlist_id (
          id,
          name
        ),
        companies:company_id (
          id,
          name
        )
      `);
      
      // Se for super admin, não filtra por tenantId para ver tudo
      if (!isSuperAdmin) {
        if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        } else {
          console.log("No tenantId found for non-superadmin");
          return [];
        }
      }
      
      const { data, error } = await query.order("apelido_interno");
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const { data: stores } = useQuery({
    queryKey: ["stores-list", tenantId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase.from("dispositivos").select("num_filial").not("num_filial", "is", null);
      
      if (!isSuperAdmin) {
        if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        } else {
          console.log("No tenantId found for non-superadmin in stores list");
          return [];
        }
      }
      
      const { data, error } = await query;
      if (error) return [];
      const uniqueFiliais = Array.from(new Set(data.map(d => d.num_filial).filter(f => f && String(f).trim() !== ""))).sort();
      return uniqueFiliais.map(f => ({ id: f, name: `Loja ${f}`, code: f }));
    }
  });

  const parseTs = (ts: string | null): number => {
    if (!ts) return 0;
    // Normaliza formato Postgres ("2026-05-05 08:33:49.776+00") para ISO
    const iso = ts.includes("T") ? ts : ts.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  const getConnectionStatus = (lastHeartbeat: string | null): ConnectionStatus => {
    const heartbeatTime = parseTs(lastHeartbeat);
    if (!heartbeatTime) return "offline";
    const now = Date.now();
    const diff = (now - heartbeatTime) / 1000;
    
    if (diff < 90) return "online";
    if (diff < 180) return "unstable";
    return "offline";
  };

  const getPlayerStatus = (playerStatus: string | null): PlayerStatus => {
    if (playerStatus === "playing") return "reproduzindo";
    if (playerStatus === "error") return "erro";
    return "parado";
  };

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(d => {
      const connStatus = getConnectionStatus(d.last_heartbeat_at);
      const matchesSearch = 
        (d.apelido_interno?.toLowerCase().includes(search.toLowerCase()) || 
         d.serial?.toLowerCase().includes(search.toLowerCase()) ||
         d.companies?.name?.toLowerCase().includes(search.toLowerCase()));
      const matchesStore = storeFilter === "all" || d.num_filial === storeFilter;
      const matchesGroup = groupFilter === "all" || d.grupo_dispositivos === groupFilter;
      const matchesStatus = statusFilter === "all" || connStatus === statusFilter;
      const matchesPlaylist = 
        playlistFilter === "all" ? true :
        playlistFilter === "has" ? !!d.playlist_id :
        !d.playlist_id;
      return matchesSearch && matchesStore && matchesGroup && matchesStatus && matchesPlaylist;
    }).sort((a, b) => {
      // Prioridade: Sem playlist no topo
      if (!a.playlist_id && b.playlist_id) return -1;
      if (a.playlist_id && !b.playlist_id) return 1;
      return (a.apelido_interno || "").localeCompare(b.apelido_interno || "");
    });
  }, [devices, search, storeFilter, groupFilter, statusFilter, playlistFilter]);

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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDevices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const toggleSelect = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Dispositivos"
        description="Monitoramento real dos terminais da rede com status de exibição."
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-right-4">
                <Badge variant="secondary" className="h-9 px-3 font-mono">
                  {selectedIds.size} selecionado(s)
                </Badge>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-9 bg-primary text-primary-foreground"
                  onClick={() => setPlaylistModalOpen(true)}
                >
                  <Layers className="h-4 w-4 mr-2" /> Alterar Playlist
                </Button>
              </div>
            )}
            <div className="hidden sm:flex border rounded-lg p-1 bg-muted/30 mr-2">
              <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode("table")}><List className="h-4 w-4" /></Button>
              <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
            </div>
            {isTecnico && (
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="h-9 border-primary/40 text-primary hover:bg-primary/10">
                <Megaphone className="h-4 w-4 mr-2" /> Comandos
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => {refetch(); setSelectedIds(new Set());}} className="h-9"><RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Atualizar</Button>
            {isAdmin && (
              <Button 
                className="bg-gradient-primary text-primary-foreground shadow-glow h-9"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Novo
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-xl border border-border/60 shadow-sm sticky top-0 z-10">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={isSuperAdmin ? "Buscar por nome, serial ou empresa..." : "Buscar dispositivo ou serial..."} className="pl-10 h-10 bg-background/50 border-border/40 focus:bg-background" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <Select value={playlistFilter} onValueChange={setPlaylistFilter}>
            <SelectTrigger className="w-full md:w-[150px] h-10 bg-background/50 border-border/40"><SelectValue placeholder="Playlist" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Filtro Playlist</SelectItem>
              <SelectItem value="has">Com Playlist</SelectItem>
              <SelectItem value="none">Sem Playlist</SelectItem>
            </SelectContent>
          </Select>
          {(search || storeFilter !== "all" || groupFilter !== "all" || statusFilter !== "all" || playlistFilter !== "all") && (
            <Button variant="ghost" size="sm" className="h-10 text-muted-foreground hover:text-primary" onClick={() => {setSearch(""); setStoreFilter("all"); setGroupFilter("all"); setStatusFilter("all"); setPlaylistFilter("all");}}><FilterX className="h-4 w-4 mr-2" /> Limpar</Button>
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
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={filteredDevices.length > 0 && selectedIds.size === filteredDevices.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[25%]">Dispositivo</TableHead>
                  <TableHead>Serial</TableHead>
                  {isSuperAdmin && <TableHead>Empresa</TableHead>}
                  <TableHead>Loja</TableHead>
                  <TableHead>Playlist</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.map((d) => {
                  const connStatus = getConnectionStatus(d.last_heartbeat_at);
                  const playStatus = getPlayerStatus(d.player_status);
                  return (
                    <TableRow key={d.id} className={cn("hover:bg-muted/30 cursor-pointer transition-colors", selectedIds.has(d.id) && "bg-primary/5")} onClick={() => openDeviceDrawer({ ...d, status: connStatus })}>
                      <TableCell onClick={(e) => toggleSelect(e, d.id)}>
                        <Checkbox checked={selectedIds.has(d.id)} onCheckedChange={() => {}} />
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Monitor className="h-4 w-4 text-primary opacity-70" />
                          <div className="flex flex-col">
                            <span>{d.apelido_interno}</span>
                            <span className="flex items-center gap-1 mt-0.5">
                              <div className="flex flex-col gap-0.5">
                                {d.autostart !== false ? (
                                  <span className="flex items-center gap-1 text-[9px] text-green-600 font-medium">
                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                    Autostart Ativo
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-[9px] text-red-600 font-medium">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                    Autostart Inativo
                                  </span>
                                )}
                                {d.persistence && (
                                  <span className="flex items-center gap-1 text-[9px] text-blue-600 font-medium">
                                    <Activity className="h-2 w-2" />
                                    Monitorado
                                  </span>
                                )}
                              </div>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{d.serial}</TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded font-medium">
                            {d.companies?.name || "Global"}
                          </span>
                        </TableCell>
                      )}
                      <TableCell><span className="text-xs px-2 py-1 bg-muted rounded-md">Loja {d.num_filial}</span></TableCell>
                      <TableCell>
                        {d.playlists ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                            <Layers className="h-3 w-3 text-primary" />
                            {d.playlists.name}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-destructive font-bold">
                            <AlertTriangle className="h-3 w-3" />
                            Sem Playlist
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(d.last_heartbeat_at)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={connStatus} />
                          {playStatus === "reproduzindo" && (
                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1 ml-1">
                              <Play className="h-2 w-2 fill-current" /> Reproduzindo
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {isSuperAdmin && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-primary hover:bg-primary/10" 
                              onClick={() => {
                                setSelectedDevice(d);
                                setEditModalOpen(true);
                              }}
                              title="Editar Avançado"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
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
      <CreateDeviceModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => refetch()}
      />
      <EditDeviceModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        device={selectedDevice}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
