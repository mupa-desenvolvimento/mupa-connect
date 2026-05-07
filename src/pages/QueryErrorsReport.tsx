import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from "recharts";
import { 
  AlertTriangle, 
  Package, 
  Monitor, 
  Filter,
  Calendar,
  Store,
  RefreshCw,
  FileText,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CircleAlert,
  Inbox,
  LayoutGrid,
  List,
  Download,
  FileSpreadsheet,
  File,
  Sparkles,
  Brain,
  Zap,
  ChevronRight,
  Loader2,
  TrendingUp,
  History
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#10b981"];

export default function QueryErrorsReport() {
  const [period, setPeriod] = useState("7");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedDevice, setSelectedDevice] = useState("all");
  const [selectedErrorType, setSelectedErrorType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const { data: errors, isLoading, refetch } = useQuery({
    queryKey: ["product-query-errors", period, selectedStore, selectedDevice, selectedErrorType, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("product_query_errors")
        .select("*");

      if (period === "custom" && dateRange?.from) {
        query = query.gte("created_at", startOfDay(dateRange.from).toISOString());
        if (dateRange.to) {
          query = query.lte("created_at", endOfDay(dateRange.to).toISOString());
        }
      } else if (period !== "all") {
        const days = parseInt(period);
        const date = subDays(new Date(), days);
        query = query.gte("created_at", date.toISOString());
      }

      if (selectedStore !== "all") query = query.eq("store_id", selectedStore);
      if (selectedDevice !== "all") query = query.eq("device_serial", selectedDevice);
      if (selectedErrorType !== "all") query = query.eq("error_type", selectedErrorType);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: stores } = useQuery({
    queryKey: ["filter-stores-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_query_errors")
        .select("store_id, store_name")
        .not("store_id", "is", null);
      
      if (error) return [];
      const uniqueStores = Array.from(new Map((data as any[]).map(d => [d.store_id, d.store_name || d.store_id])).entries());
      return uniqueStores.map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  const { data: devices } = useQuery({
    queryKey: ["filter-devices-errors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_query_errors")
        .select("device_serial, device_name")
        .not("device_serial", "is", null);
      
      if (error) return [];
      const uniqueDevices = Array.from(new Map((data as any[]).map(d => [d.device_serial, d.device_name || d.device_serial])).entries());
      return uniqueDevices.map(([serial, name]) => ({ serial, name })).sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  // Aggregations
  const groupedData = errors?.reduce((acc: any, curr) => {
    const key = `${curr.device_serial}-${curr.ean}-${curr.error_type}`;
    if (!acc[key]) {
      acc[key] = {
        ...curr,
        error_count: 0,
        last_occurrence: curr.created_at,
      };
    }
    acc[key].error_count++;
    if (new Date(curr.created_at) > new Date(acc[key].last_occurrence)) {
      acc[key].last_occurrence = curr.created_at;
    }
    return acc;
  }, {});

  const aggregatedList = Object.values(groupedData || []) as any[];
  const filteredList = aggregatedList.filter(item => 
    item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ean?.includes(searchTerm) ||
    item.device_serial?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const kpis = {
    totalErrors: errors?.length || 0,
    affectedProducts: new Set(errors?.map(e => e.ean)).size,
    criticalStores: new Set(errors?.filter(e => aggregatedList.find(a => a.store_id === e.store_id && a.error_count > 50)).map(e => e.store_id)).size,
    affectedDevices: new Set(errors?.map(e => e.device_serial)).size
  };

  // Rankings
  const topProducts = [...aggregatedList]
    .sort((a, b) => b.error_count - a.error_count)
    .slice(0, 5);

  const storesRanking = aggregatedList.reduce((acc: any, curr) => {
    const key = curr.store_id || 'central';
    if (!acc[key]) acc[key] = { name: curr.store_name || 'Loja Central', count: 0 };
    acc[key].count += curr.error_count;
    return acc;
  }, {});

  const topStores = Object.values(storesRanking)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5) as any[];

  const devicesRanking = aggregatedList.reduce((acc: any, curr) => {
    const key = curr.device_serial;
    if (!acc[key]) acc[key] = { name: curr.device_name || curr.device_serial, count: 0 };
    acc[key].count += curr.error_count;
    return acc;
  }, {});

  const topDevices = Object.values(devicesRanking)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5) as any[];

  const handleAnalyzeWithAI = async () => {
    if (aggregatedList.length === 0) {
      toast({ title: "Aviso", description: "Não há dados suficientes para análise." });
      return;
    }

    setIsAiPanelOpen(true);
    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-errors', {
        body: { errors: aggregatedList }
      });

      if (error) throw error;
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      toast({
        title: "Erro na Análise",
        description: "Não foi possível completar a análise com IA no momento.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverity = (count: number) => {
    if (count > 100) return "critical";
    if (count > 50) return "high";
    if (count > 20) return "medium";
    return "low";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "text-destructive border-destructive/50 bg-destructive/10 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse";
      case "high": return "text-orange-500 border-orange-500/50 bg-orange-500/10";
      case "medium": return "text-yellow-500 border-yellow-500/50 bg-yellow-500/10";
      default: return "text-blue-500 border-blue-500/50 bg-blue-500/10";
    }
  };

  const handleExportCSV = () => {
    const headers = ["Dispositivo", "Serial", "Produto", "EAN", "Loja", "Erro", "Quantidade", "Última Ocorrência", "Status"];
    const csvData = filteredList.map(item => [
      `"${item.device_name || 'Desconhecido'}"`,
      `"${item.device_serial}"`,
      `"${item.product_name || 'Produto s/ Nome'}"`,
      `"${item.ean || 'N/A'}"`,
      `"${item.store_name || 'Loja Central'}"`,
      `"${item.error_type}"`,
      item.error_count,
      `"${format(parseISO(item.last_occurrence), "dd/MM/yyyy HH:mm")}"`,
      `"${item.status === 'active' ? 'Ativo' : 'Resolvido'}"`
    ]);

    const csvContent = [headers, ...csvData].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-erros-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Sucesso", description: "Relatório CSV exportado com sucesso." });
  };

  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredList.map(item => ({
      "Dispositivo": item.device_name || 'Desconhecido',
      "Serial": item.device_serial,
      "Produto": item.product_name || 'Produto s/ Nome',
      "EAN": item.ean || 'N/A',
      "Loja": item.store_name || 'Loja Central',
      "Erro": item.error_type,
      "Quantidade": item.error_count,
      "Última Ocorrência": format(parseISO(item.last_occurrence), "dd/MM/yyyy HH:mm"),
      "Status": item.status === 'active' ? 'Ativo' : 'Resolvido'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Erros de Consulta");
    XLSX.writeFile(workbook, `relatorio-erros-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Sucesso", description: "Relatório Excel exportado com sucesso." });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Relatório de Erros de Consulta de Produtos", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 22);
    
    const tableColumn = ["Dispositivo", "Produto", "Erro", "Qtd", "Última Ocorrência"];
    const tableRows = filteredList.map(item => [
      item.device_name || item.device_serial,
      item.product_name || item.ean,
      item.error_type,
      item.error_count,
      format(parseISO(item.last_occurrence), "dd/MM/yy HH:mm")
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillStyle: 'f', fillColor: [59, 130, 246] }
    });
    
    doc.save(`relatorio-erros-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "Sucesso", description: "Relatório PDF exportado com sucesso." });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Consultas com Erro"
        description="Monitore falhas de integração e produtos não encontrados preventivamente."
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px] h-9">
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hoje</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="all">Todo o histórico</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              {period === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateRange?.from ? format(dateRange.from, "dd/MM/yy") : "Início"} - {dateRange?.to ? format(dateRange.to, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent mode="range" selected={dateRange} onSelect={setDateRange} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-[140px] h-9">
                <Store className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Lojas</SelectItem>
                {stores?.map(store => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-[160px] h-9">
                <Monitor className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Dispositivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Dispositivos</SelectItem>
                {devices?.map(dev => (
                  <SelectItem key={dev.serial} value={dev.serial}>{dev.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              className="h-9 gap-2 border-primary/30 hover:bg-primary/5 text-primary"
              onClick={handleAnalyzeWithAI}
            >
              <Sparkles className="h-4 w-4" />
              Analisar com IA
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-gradient-primary shadow-glow h-9 gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportCSV} className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Exportar para CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="h-4 w-4 text-green-500" />
                  Exportar para Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                  <File className="h-4 w-4 text-red-500" />
                  Exportar para PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="p-6 border-b bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <Brain className="h-6 w-6" />
              </div>
              <div>
                <SheetTitle className="text-xl font-display font-bold">Inky AI Analytics</SheetTitle>
                <SheetDescription>
                  Análise inteligente de padrões e prevenção de falhas operacionais.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            {isAnalyzing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 pt-20">
                <div className="relative">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <Sparkles className="h-5 w-5 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Analisando dados...</h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Nossa IA está interpretando milhares de registros para encontrar padrões e causas raiz.
                  </p>
                </div>
                
                <div className="w-full max-w-md space-y-3 pt-8">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton className="h-4 flex-1 rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ) : aiAnalysis ? (
              <div className="prose prose-sm dark:prose-invert max-w-none pb-10">
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-primary m-0">
                    Esta análise baseia-se nos logs mais recentes e padrões de comportamento do ERP e dispositivos.
                  </p>
                </div>
                <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <CircleAlert className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <p className="text-muted-foreground">Ocorreu um problema ao processar a análise. Tente novamente.</p>
                <Button variant="outline" className="mt-4" onClick={handleAnalyzeWithAI}>Tentar Novamente</Button>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Erros", value: kpis.totalErrors, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
          { label: "Produtos Afetados", value: kpis.affectedProducts, icon: Package, color: "text-warning", bg: "bg-warning/10" },
          { label: "Lojas Críticas", value: kpis.criticalStores, icon: Store, color: "text-primary", bg: "bg-primary/10" },
          { label: "Dispositivos Críticos", value: kpis.affectedDevices, icon: Monitor, color: "text-accent", bg: "bg-accent/10" },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/40 overflow-hidden relative group transition-all hover:shadow-lg hover:border-primary/20">
            <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-2xl opacity-10", kpi.bg)} />
            <CardContent className="p-5 flex items-center gap-4">
              <div className={cn("h-12 w-12 rounded-xl grid place-items-center shrink-0", kpi.bg, kpi.color)}>
                <kpi.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-display font-bold">{kpi.value.toLocaleString()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inky AI Insight */}
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <CardContent className="p-4 flex gap-4 items-center">
          <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center shrink-0">
            <CircleAlert className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-primary mb-0.5">Inky AI - Análise Preventiva</p>
            <p className="text-sm text-muted-foreground">
              {kpis.totalErrors > 0 
                ? `Detectamos que o produto ${aggregatedList[0]?.product_name || aggregatedList[0]?.ean} é o mais crítico, com ${aggregatedList[0]?.error_count} falhas. Verifique a integração do ERP.`
                : "Tudo certo por aqui! Não detectamos padrões de erro críticos no período selecionado."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por produto, EAN ou serial..." 
              className="pl-9 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)} className="w-full md:w-auto">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="table" className="gap-2"><List className="h-4 w-4" /> Tabela</TabsTrigger>
                <TabsTrigger value="cards" className="gap-2"><LayoutGrid className="h-4 w-4" /> Cards</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="h-96 flex flex-col items-center justify-center border rounded-xl bg-card/50 text-muted-foreground">
            <Inbox className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum erro encontrado</p>
            <p className="text-sm">Tente ajustar os filtros ou o termo de busca.</p>
          </div>
        ) : viewMode === "table" ? (
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[150px]">Dispositivo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Erro</TableHead>
                    <TableHead className="text-center">Qtd.</TableHead>
                    <TableHead>Última Ocorrência</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{item.device_name || 'Desconhecido'}</span>
                          <code className="text-[10px] text-muted-foreground uppercase">{item.device_serial}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm truncate max-w-[200px]">{item.product_name || 'Produto s/ Nome'}</span>
                          <span className="text-xs text-muted-foreground">EAN: {item.ean || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{item.store_name || 'Loja Central'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">
                          {item.error_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border",
                          getSeverityColor(getSeverity(item.error_count))
                        )}>
                          {item.error_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(item.last_occurrence), "dd/MM/yy 'às' HH:mm")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={cn(
                          item.status === 'active' ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"
                        )}>
                          {item.status === 'active' ? 'Ativo' : 'Resolvido'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredList.map((item) => (
              <Card key={item.id} className="border-border/60 hover:border-primary/30 transition-all hover:shadow-md group">
                <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase">
                      {item.error_type}
                    </Badge>
                    <h4 className="font-bold text-sm truncate leading-none pt-2" title={item.product_name}>
                      {item.product_name || 'Produto sem nome'}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">EAN: {item.ean || 'N/A'}</p>
                  </div>
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold border",
                    getSeverityColor(getSeverity(item.error_count))
                  )}>
                    {item.error_count}
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Loja</p>
                      <p className="text-xs truncate">{item.store_name || 'Matriz'}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">Terminal</p>
                      <p className="text-xs truncate">{item.device_name || item.device_serial}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground">
                      Última: {format(parseISO(item.last_occurrence), "dd/MM 'às' HH:mm")}
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] hover:text-primary">
                      Ver logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Future Enhancements Teaser */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border/40">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40">
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent grid place-items-center">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">RANKING SEMANAL</p>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40">
          <div className="h-10 w-10 rounded-lg bg-success/10 text-success grid place-items-center">
            <ArrowDownRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">AUTOMAÇÃO WHATSAPP</p>
            <p className="text-xs text-muted-foreground">Em breve</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/40">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <ArrowUpRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">IA PREDITIVA</p>
            <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
          </div>
        </div>
      </div>
    </div>
  );
}
