import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Legend,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Monitor, 
  TrendingUp, 
  Filter,
  Calendar,
  Store,
  RefreshCw,
  Download,
  FileText
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportGeneratorModal } from "@/components/ReportGeneratorModal";

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function ProductQueriesAnalytics() {
  const [period, setPeriod] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["product-queries-logs", period, selectedStore, selectedDevice],
    queryFn: async () => {
      let query = supabase
        .from("product_queries_log")
        .select("*");

      if (period !== "all") {
        const days = parseInt(period);
        const date = subDays(new Date(), days);
        query = query.gte("created_at", date.toISOString());
      }

      if (selectedStore !== "all") {
        query = query.eq("loja", selectedStore);
      }

      if (selectedDevice !== "all") {
        query = query.eq("device_id", selectedDevice);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stores } = useQuery({
    queryKey: ["filter-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_queries_log")
        .select("loja")
        .not("loja", "is", null);
      
      if (error) return [];
      const uniqueStores = Array.from(new Set((data as any[]).map(d => d.loja)));
      return uniqueStores.sort() as string[];
    }
  });

  const { data: devices } = useQuery({
    queryKey: ["filter-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_queries_log")
        .select("device_id, apelido");
      
      if (error) return [];
      const uniqueDevices = Array.from(new Map((data as any[]).map(d => [d.device_id, d.apelido || d.device_id])).entries());
      return uniqueDevices.map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  // KPI Calculations
  const totalConsultas = logs?.length || 0;
  const uniqueDevicesCount = new Set(logs?.map(l => l.device_id)).size;
  const errorLogs = logs?.filter(l => l.status_code !== 200) || [];
  const erroRate = totalConsultas > 0 ? (errorLogs.length / totalConsultas) * 100 : 0;
  
  const productCounts = logs?.reduce((acc: any, log) => {
    const key = log.ean || "N/A";
    if (!acc[key]) acc[key] = { ean: key, desc: log.descricao_produto || "Sem descrição", count: 0 };
    acc[key].count++;
    return acc;
  }, {});
  
  const topProduct = Object.values(productCounts || {}).sort((a: any, b: any) => b.count - a.count)[0] as any;

  // Chart Data Preparation
  const queriesByDate = logs?.reduce((acc: any, log) => {
    const date = format(parseISO(log.created_at), "dd/MM");
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const timelineData = Object.entries(queriesByDate || {})
    .map(([date, count]) => ({ date, count }))
    .reverse();

  const topProductsData = Object.values(productCounts || {})
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5) as any[];

  const devicesRanking = logs?.reduce((acc: any, log) => {
    const name = log.apelido || log.device_id;
    if (!acc[log.device_id]) acc[log.device_id] = { name, count: 0, errors: 0 };
    acc[log.device_id].count++;
    if (log.status_code !== 200) acc[log.device_id].errors++;
    return acc;
  }, {});

  const topDevicesData = Object.values(devicesRanking || {})
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5) as any[];

  const errorStatusData = errorLogs.reduce((acc: any, log) => {
    const status = log.status_code?.toString() || "Erro Desconhecido";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const errorChartData = Object.entries(errorStatusData).map(([status, count]) => ({ status, count }));

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast({ title: "Sem dados", description: "Não há registros para exportar.", variant: "destructive" });
      return;
    }
    const headers = ["Data", "EAN", "Produto", "Loja", "Dispositivo", "Status", "Resposta"];
    const rows = logs.map((l: any) => [
      format(parseISO(l.created_at), "dd/MM/yyyy HH:mm:ss"),
      l.ean ?? "",
      (l.descricao_produto ?? "").replace(/"/g, '""'),
      l.loja ?? "",
      l.apelido ?? l.device_id ?? "",
      l.status_code ?? "",
      typeof l.response === "string" ? l.response.replace(/"/g, '""') : JSON.stringify(l.response ?? "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c ?? "")}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consultas-ean-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado", description: `${logs.length} registros baixados.` });
  };

  const handleExportPDF = () => {
    if (!logs || logs.length === 0) {
      toast({ title: "Sem dados", description: "Não há registros para exportar.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Inteligência de Consultas — Logs EAN", 14, 14);
    doc.setFontSize(9);
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} • ${logs.length} registros • Período: ${period === "all" ? "Todo o tempo" : period === "1" ? "Hoje" : `Últimos ${period} dias`}`,
      14,
      20
    );

    autoTable(doc, {
      startY: 26,
      head: [["Data", "EAN", "Produto", "Loja", "Dispositivo", "Status"]],
      body: logs.map((l: any) => [
        format(parseISO(l.created_at), "dd/MM/yy HH:mm"),
        l.ean ?? "",
        (l.descricao_produto ?? "").substring(0, 40),
        l.loja ?? "",
        l.apelido ?? l.device_id ?? "",
        String(l.status_code ?? ""),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });

    doc.save(`consultas-ean-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
    toast({ title: "PDF exportado", description: `${logs.length} registros baixados.` });
  };


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Inteligência de Consultas"
        description="Insights operacionais e performance de consultas EAN"
        actions={
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[140px]">
                <Store className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Lojas</SelectItem>
                {stores?.map(store => (
                  <SelectItem key={store} value={store}>{store}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[180px]">
                <Monitor className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Dispositivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Dispositivos</SelectItem>
                {devices?.map(dev => (
                  <SelectItem key={dev.id} value={dev.id}>{dev.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" onClick={() => refetch()} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="outline" onClick={handleExportCSV} title="Exportar CSV">
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>

            <Button variant="outline" onClick={handleExportPDF} title="Exportar PDF">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Consultas</p>
                <p className="mt-2 font-display text-3xl font-bold">{totalConsultas}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Dispositivos Ativos</p>
                <p className="mt-2 font-display text-3xl font-bold">{uniqueDevicesCount}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-accent/10 grid place-items-center text-accent">
                <Monitor className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Taxa de Erro</p>
                <div className="flex items-baseline gap-2">
                  <p className="mt-2 font-display text-3xl font-bold">{erroRate.toFixed(1)}%</p>
                  <span className="text-xs text-muted-foreground">({errorLogs.length})</span>
                </div>
              </div>
              <div className={`h-10 w-10 rounded-xl grid place-items-center ${erroRate > 10 ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                {erroRate > 10 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Top Produto</p>
                <p className="mt-2 font-display text-lg font-bold truncate" title={topProduct?.desc}>
                  {topProduct?.desc || "—"}
                </p>
                <p className="text-xs text-muted-foreground">{topProduct?.count || 0} consultas</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-warning/10 grid place-items-center text-warning shrink-0 ml-2">
                <Package className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Consultas por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top 5 Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="ean" 
                    type="category" 
                    width={100} 
                    fontSize={10} 
                    tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '...' : val}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [value, 'Consultas']}
                    labelFormatter={(label) => {
                      const item = topProductsData.find(d => d.ean === label);
                      return item?.desc || label;
                    }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Uso por Dispositivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topDevicesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {topDevicesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Erros por Status Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
                  <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Performance por Dispositivo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead className="text-right">Consultas</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead className="text-right">% Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(devicesRanking || {}).sort((a: any, b: any) => b.count - a.count).slice(0, 5).map((dev: any) => {
                  const devErrorRate = (dev.errors / dev.count) * 100;
                  return (
                    <TableRow key={dev.name}>
                      <TableCell className="font-medium">{dev.name}</TableCell>
                      <TableCell className="text-right">{dev.count}</TableCell>
                      <TableCell className="text-right">{dev.errors}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={devErrorRate > 15 ? "destructive" : "secondary"}>
                          {devErrorRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Ranking de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EAN</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(productCounts || {}).sort((a: any, b: any) => b.count - a.count).slice(0, 5).map((prod: any) => (
                  <TableRow key={prod.ean}>
                    <TableCell className="font-mono text-xs">{prod.ean}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{prod.desc}</TableCell>
                    <TableCell className="text-right font-bold">{prod.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
