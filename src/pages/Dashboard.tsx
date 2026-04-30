import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Activity, MonitorPlay, Image as ImageIcon, Store, ArrowUpRight, Search, AlertTriangle, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subHours, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, ResponsiveContainer } from "recharts";

  // Removendo estatísticas estáticas para usar dinâmicas via useQuery


export default function DashboardPage() {
  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: devicesData } = await supabase.from("dispositivos").select("id, online");
      const { count: storesCount } = await supabase.from("stores").select("*", { count: 'exact', head: true });
      const { count: mediaCount } = await supabase.from("media_items").select("*", { count: 'exact', head: true });
      const { count: playlistCount } = await supabase.from("playlists").select("*", { count: 'exact', head: true });

      const totalDevices = devicesData?.length || 0;
      const onlineDevices = devicesData?.filter(d => d.online).length || 0;

      return [
        { label: "Dispositivos online", value: onlineDevices, total: totalDevices, icon: MonitorPlay, accent: "text-success" },
        { label: "Lojas ativas",        value: storesCount || 0, icon: Store,       accent: "text-primary" },
        { label: "Mídias publicadas",   value: mediaCount || 0, icon: ImageIcon,  accent: "text-accent" },
        { label: "Playlists em uso",    value: playlistCount || 0, icon: Activity,    accent: "text-warning" },
      ];
    }
  });

  const { data: devicesList } = useQuery({
    queryKey: ["dashboard-devices-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dispositivos")
        .select("*")
        .limit(10);
      return data || [];
    }
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["dashboard-ean-analytics"],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("product_queries_log" as any)
        .select("*")
        .gte("created_at", today);
      
      if (error) throw error;
      return data as any[];
    }
  });

  const { data: recentChartData } = useQuery({
    queryKey: ["dashboard-ean-chart"],
    queryFn: async () => {
      const sixHoursAgo = subHours(new Date(), 6).toISOString();
      const { data, error } = await supabase
        .from("product_queries_log" as any)
        .select("created_at")
        .gte("created_at", sixHoursAgo);
      
      if (error) return [];
      
      // Group by hour
      const grouped = (data as any[]).reduce((acc: any, log) => {
        const hour = format(new Date(log.created_at), "HH:00");
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});
      
      return Object.entries(grouped).map(([hour, count]) => ({ hour, count }));
    }
  });

  const todayTotal = analyticsData?.length || 0;
  const todayErrors = analyticsData?.filter(l => l.status_code !== 200 && l.status_code !== "200").length || 0;
  const todayErrorRate = todayTotal > 0 ? (todayErrors / todayTotal) * 100 : 0;
  
  const productCounts = analyticsData?.reduce((acc: any, log) => {
    const key = log.ean || "N/A";
    if (!acc[key]) acc[key] = { desc: log.descricao_produto || "Sem descrição", count: 0 };
    acc[key].count++;
    return acc;
  }, {});
  
  const topProduct = Object.values(productCounts || {}).sort((a: any, b: any) => b.count - a.count)[0] as any;

  const deviceCounts = analyticsData?.reduce((acc: any, log) => {
    const key = log.device_id;
    if (!acc[key]) acc[key] = { name: log.apelido || log.device_id, count: 0 };
    acc[key].count++;
    return acc;
  }, {});

  const topDevice = Object.values(deviceCounts || {}).sort((a: any, b: any) => b.count - a.count)[0] as any;

  return (

    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação Mupa 3.0 — em tempo real."
        actions={
          <Button asChild className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
            <Link to="/dispositivos">Gerenciar dispositivos <ArrowUpRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        }
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {(statsData || []).map((s: any) => (
          <Card key={s.label} className="border-border/60 hover:shadow-elegant transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-2 font-display text-3xl font-bold">
                    {s.value}
                    {s.total !== undefined && <span className="text-base text-muted-foreground font-normal"> / {s.total}</span>}
                  </p>
                </div>
                <div className={`h-10 w-10 rounded-xl bg-muted grid place-items-center ${s.accent}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Consultas (Hoje)</p>
                <p className="mt-1 font-display text-2xl font-bold">{todayTotal}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <Search className="h-4 w-4" />
              </div>
            </div>
            {recentChartData && recentChartData.length > 0 && (
              <div className="h-8 mt-2 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recentChartData}>
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Taxa de Erro EAN</p>
                <p className={`mt-1 font-display text-2xl font-bold ${todayErrorRate > 10 ? 'text-destructive' : 'text-success'}`}>
                  {todayErrorRate.toFixed(1)}%
                </p>
              </div>
              <div className={`h-8 w-8 rounded-lg grid place-items-center ${todayErrorRate > 10 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dispositivo Ativo</p>
                <p className="mt-1 font-display text-sm font-bold truncate">{topDevice?.name || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{topDevice?.count || 0} consultas</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-accent/10 grid place-items-center text-accent shrink-0">
                <MonitorPlay className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top Produto</p>
                <p className="mt-1 font-display text-sm font-bold truncate">{topProduct?.desc || "—"}</p>
                <p className="text-[10px] text-muted-foreground">{topProduct?.count || 0} consultas</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-warning/10 grid place-items-center text-warning shrink-0">
                <Package className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display">Status dos dispositivos</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {devicesList?.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center shrink-0">
                    <MonitorPlay className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.apelido_interno || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.empresa || "Sem loja"} · {d.serial}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {d.last_heartbeat_at ? format(new Date(d.last_heartbeat_at), "HH:mm") : "N/A"}
                  </span>
                  <StatusBadge status={d.online ? "online" : "offline"} />
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/play/${d.serial}`} target="_blank">Abrir player</Link>
                  </Button>
                </div>
              </div>
            ))}
            {(!devicesList || devicesList.length === 0) && (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum dispositivo encontrado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
              <div className="flex-1">
                <div>Sistema sincronizado</div>
                <div className="text-xs text-muted-foreground">Agora</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground italic">
              Novos logs de atividade serão implementados em breve.
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
