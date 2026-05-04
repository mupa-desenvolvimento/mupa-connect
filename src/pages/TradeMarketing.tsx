import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  MonitorPlay, 
  PlayCircle, 
  Clock, 
  Activity, 
  Calendar,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TradeMarketingDashboard() {
  const [range, setRange] = useState("7"); // days
  const [mediaType, setMediaType] = useState("all");

  const dateLimit = startOfDay(subDays(new Date(), parseInt(range)));

  // Query for KPIs
  const { data: stats, isLoading } = useQuery({
    queryKey: ["trade-stats", range, mediaType],
    queryFn: async () => {
      let query = supabase
        .from("media_events")
        .select(`
          id, 
          media_id,
          duration, 
          created_at,
          metadata
        `)
        .gte("created_at", dateLimit.toISOString());

      if (mediaType !== "all") {
        query = query.contains("metadata", { media_type: mediaType });
      }

      const { data, error } = await query;
      if (error) throw error;

      const totalViews = data.length;
      const totalDuration = data.reduce((acc, curr) => acc + (curr.duration || 0), 0);
      
      // Calculate active devices from events
      const uniqueDevices = new Set(data.map(d => (d.metadata as any)?.serial)).size;

      // Group by media for ranking
      const mediaMap = new Map();
      data.forEach(event => {
        const name = (event.metadata as any)?.media_name || "Mídia Desconhecida";
        const id = event.media_id;
        if (!mediaMap.has(name)) {
          mediaMap.set(name, { name, views: 0, duration: 0 });
        }
        const current = mediaMap.get(name);
        current.views += 1;
        current.duration += (event.duration || 0);
      });

      const topMedias = Array.from(mediaMap.values())
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      return {
        totalViews,
        totalDuration,
        uniqueDevices,
        topMedias,
        allEvents: data
      };
    }
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${seconds % 60}s`;
  };

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Marketing</h1>
          <p className="text-muted-foreground">Analise o desempenho e visibilidade das suas mídias nos pontos de venda.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total de Exibições</CardTitle>
            <PlayCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalViews?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Impactos visuais no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tempo em Tela</CardTitle>
            <Clock className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(stats?.totalDuration || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Exposição total acumulada</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dispositivos Ativos</CardTitle>
            <MonitorPlay className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueDevices || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pontos de venda transmitindo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Uptime Médio</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.4%</div>
            <p className="text-xs text-muted-foreground mt-1">Disponibilidade da rede</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Top 5 Mídias (Exibições)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topMedias || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribuição por Mídia</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.topMedias || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="views"
                >
                  {(stats?.topMedias || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes de Exibição</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Mídia</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Dispositivo (Serial)</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Duração</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {stats?.allEvents?.slice(0, 10).map((event) => (
                  <tr key={event.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle font-medium">{(event.metadata as any)?.media_name || "Desconhecida"}</td>
                    <td className="p-4 align-middle font-mono text-xs">{(event.metadata as any)?.serial || "N/A"}</td>
                    <td className="p-4 align-middle">{event.duration}s</td>
                    <td className="p-4 align-middle text-muted-foreground">
                      {format(new Date(event.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
                {(!stats?.allEvents || stats.allEvents.length === 0) && !isLoading && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum evento registrado no período.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}