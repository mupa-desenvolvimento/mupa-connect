import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Monitor, 
  Activity, 
  WifiOff, 
  Search, 
  Clock, 
  Play,
  Filter,
  ShieldAlert,
  BarChart3,
  AlertCircle,
  History,
  Info
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type DeviceStatus = "ativo" | "online" | "offline";

interface Device {
  id: number;
  serial: string;
  apelido_interno: string;
  num_filial: string;
  grupo_dispositivos: string;
  last_heartbeat_at: string | null;
  last_proof_at: string | null;
  current_playlist_id: string | null;
  current_media_id: string | null;
}

interface PerformanceLog {
  id: string;
  serial: string;
  event_type: string;
  message: string;
  metadata: any;
  duration_ms: number | null;
  created_at: string;
}

export default function PlayerMonitoring() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [performanceLogs, setPerformanceLogs] = useState<PerformanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("devices");
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin_global")
        .single();

      if (!roleData) {
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin(true);
        fetchDevices();
        fetchPerformanceLogs();
      }
    }

    checkAccess();

    const devicesChannel = supabase
      .channel('dispositivos_monitoring')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dispositivos' }, () => fetchDevices())
      .subscribe();

    const logsChannel = supabase
      .channel('player_logs_monitoring')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'player_performance_logs' }, (payload) => {
        setPerformanceLogs(prev => [payload.new as PerformanceLog, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(devicesChannel);
      supabase.removeChannel(logsChannel);
    };
  }, []);

  async function fetchPerformanceLogs() {
    const { data, error } = await supabase
      .from("player_performance_logs")
      .select("*")
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setPerformanceLogs(data);
    }
  }

  async function fetchDevices() {
    const { data, error } = await supabase
      .from("dispositivos")
      .select("id, serial, apelido_interno, num_filial, grupo_dispositivos, last_heartbeat_at, last_proof_at, current_playlist_id, current_media_id")
      .order('last_heartbeat_at', { ascending: false });

    if (!error && data) {
      setDevices(data);
    }
    setLoading(false);
  }

  const getStatus = (device: Device): DeviceStatus => {
    if (!device.last_heartbeat_at) return "offline";
    
    const now = new Date();
    const lastHeartbeat = new Date(device.last_heartbeat_at);
    const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;

    if (diffSeconds > 60) return "offline";

    if (device.last_proof_at) {
      const lastProof = new Date(device.last_proof_at);
      const proofDiffSeconds = (now.getTime() - lastProof.getTime()) / 1000;
      if (proofDiffSeconds < 30) return "ativo";
    }

    return "online";
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.serial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.apelido_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.num_filial?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getStatus(device);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: devices.length,
    online: devices.filter(d => getStatus(d) === "online").length,
    ativo: devices.filter(d => getStatus(d) === "ativo").length,
    offline: devices.filter(d => getStatus(d) === "offline").length,
  };

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-500 hover:bg-green-600 gap-1"><Play className="h-3 w-3 fill-current" /> Rodando Mídia</Badge>;
      case "online":
        return <Badge className="bg-blue-500 hover:bg-blue-600 gap-1"><Activity className="h-3 w-3" /> Online</Badge>;
      default:
        return <Badge variant="destructive" className="gap-1"><WifiOff className="h-3 w-3" /> Offline</Badge>;
    }
  };

  if (isSuperAdmin === false) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Esta página é reservada apenas para administradores globais do sistema.
        </p>
        <Button onClick={() => navigate("/")}>Voltar ao Dashboard</Button>
      </div>
    );
  }

  if (isSuperAdmin === null) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'init_start': return <Badge variant="outline" className="text-blue-500 border-blue-500/30">Iniciando</Badge>;
      case 'manifest_fetch_success': return <Badge variant="outline" className="text-green-500 border-green-500/30">Manifesto OK</Badge>;
      case 'engine_ready': return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 font-bold">Engine Ready</Badge>;
      case 'media_cache_success': return <Badge variant="outline" className="text-cyan-500 border-cyan-500/30">Cache OK</Badge>;
      case 'media_cache_error': return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">Erro Cache</Badge>;
      case 'media_play_error': return <Badge variant="destructive">Erro Play</Badge>;
      case 'media_play_timeout': return <Badge variant="destructive" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Timeout</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoramento de Players</h1>
          <p className="text-muted-foreground">Acompanhe a performance e status dos dispositivos em tempo real.</p>
        </div>
      </div>

      <Tabs defaultValue="devices" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="devices" className="flex gap-2">
            <Monitor className="h-4 w-4" /> Dispositivos
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex gap-2">
            <BarChart3 className="h-4 w-4" /> Performance & Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Dispositivos</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativos (Rodando)</CardTitle>
                <Play className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.ativo}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Apenas Online</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats.online}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offline</CardTitle>
                <WifiOff className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.offline}</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por serial, nome ou loja..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select 
                className="flex h-10 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Rodando Mídia</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Serial / Nome</TableHead>
                  <TableHead>Loja / Grupo</TableHead>
                  <TableHead>Último Heartbeat</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Playlist Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">Carregando dispositivos...</TableCell>
                  </TableRow>
                ) : filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum dispositivo encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        {getStatusBadge(getStatus(device))}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{device.apelido_interno || "Sem nome"}</div>
                        <div className="text-xs text-muted-foreground font-mono">{device.serial}</div>
                      </TableCell>
                      <TableCell>
                        <div>Filial: {device.num_filial || "—"}</div>
                        <div className="text-xs text-muted-foreground">{device.grupo_dispositivos || "Sem grupo"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          {device.last_heartbeat_at ? (
                            formatDistanceToNow(new Date(device.last_heartbeat_at), { addSuffix: true, locale: ptBR })
                          ) : "Nunca"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          {device.last_proof_at ? (
                            formatDistanceToNow(new Date(device.last_proof_at), { addSuffix: true, locale: ptBR })
                          ) : "Sem atividade"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono max-w-[150px] truncate" title={device.current_playlist_id || ""}>
                          {device.current_playlist_id || "Nenhuma"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" /> Logs de Performance em Tempo Real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[180px]">Dispositivo (Serial)</TableHead>
                      <TableHead className="w-[150px]">Evento</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="w-[120px]">Duração</TableHead>
                      <TableHead className="w-[180px]">Data/Hora</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performanceLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">
                          Aguardando novos eventos dos players...
                        </TableCell>
                      </TableRow>
                    ) : (
                      performanceLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs">{log.serial}</TableCell>
                          <TableCell>{getEventBadge(log.event_type)}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              {log.event_type.includes('error') && <AlertCircle className="h-3 w-3 text-destructive" />}
                              {log.message}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.duration_ms ? (
                              <span className={cn(
                                "text-xs font-medium",
                                log.duration_ms > 5000 ? "text-orange-500" : "text-muted-foreground"
                              )}>
                                {log.duration_ms}ms
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <pre className="text-[10px] max-w-xs overflow-auto">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
}
