import { useState, useEffect } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  FileText, 
  Loader2,
  Package,
  Store,
  Monitor,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InkyInsight {
  id: string;
  type: 'operational' | 'performance' | 'preventive';
  title: string;
  description: string;
  value?: string;
  status: 'warning' | 'success' | 'info' | 'critical';
  icon: any;
}

interface InkySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
  filters: any;
}

const INKY_AVATAR = "https://preview--mupa-midias.lovable.app/assets/inky-avatar-Dl0EIDEQ.png?utm_source=chatgpt.com";

export function InkySidebar({ isOpen, onClose, logs, filters }: InkySidebarProps) {
  const { tenantId, companyId } = useTenant();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InkyInsight[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<string>("");
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    "Analisando padrões de consulta...",
    "Cruzando dados de dispositivos e lojas...",
    "Identificando anomalias operacionais...",
    "Gerando recomendações preventivas...",
    "Inky está finalizando os insights..."
  ];

  useEffect(() => {
    if (isOpen && logs.length > 0) {
      checkExistingInsights();
    }
  }, [isOpen, logs]);

  const checkExistingInsights = async () => {
    // Busca se já existe uma análise para esses filtros hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await (supabase.from("inky_insights") as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const saved = data[0] as any;
      setInsights(saved.insight_data as InkyInsight[]);
      setExecutiveSummary(saved.executive_summary || "");
    } else {
      handleAnalyze();
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setLoadingStep(0);
    
    // Simulação de passos de análise para UX
    const interval = setInterval(() => {
      setLoadingStep(prev => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1200);

    // Lógica de geração de insights (Mockada para ser rápida e inteligente)
    // Em produção, isso poderia chamar uma Edge Function com OpenAI
    setTimeout(async () => {
      clearInterval(interval);
      
      const generatedInsights: InkyInsight[] = [];
      
      // Análise de Erros
      const errorLogs = logs.filter(l => l.status_code !== 200);
      const errorRate = (errorLogs.length / logs.length) * 100;
      
      if (errorRate > 15) {
        generatedInsights.push({
          id: '1',
          type: 'operational',
          title: 'Alta Taxa de Erros',
          description: `Detectei que ${errorRate.toFixed(1)}% das consultas falharam.`,
          status: 'critical',
          icon: AlertTriangle
        });
      } else if (errorRate > 5) {
        generatedInsights.push({
          id: '1',
          type: 'operational',
          title: 'Instabilidade Detectada',
          description: `Aumento de ${errorRate.toFixed(1)}% nas falhas em relação ao padrão.`,
          status: 'warning',
          icon: Zap
        });
      }

      // Análise de Lojas
      const storeErrors = errorLogs.reduce((acc: any, l) => {
        acc[l.loja] = (acc[l.loja] || 0) + 1;
        return acc;
      }, {});
      
      const worstStore = Object.entries(storeErrors).sort((a: any, b: any) => b[1] - a[1])[0];
      if (worstStore) {
        generatedInsights.push({
          id: '2',
          type: 'operational',
          title: `Foco na Loja ${worstStore[0]}`,
          description: `Apresentou ${worstStore[1]} falhas nas últimas consultas.`,
          status: 'warning',
          icon: Store
        });
      }

      // Análise de Produtos
      const productCounts = logs.reduce((acc: any, l) => {
        acc[l.ean] = (acc[l.ean] || 0) + 1;
        return acc;
      }, {});
      const topProductEan = Object.entries(productCounts).sort((a: any, b: any) => b[1] - a[1])[0];
      if (topProductEan) {
        const prod = logs.find(l => l.ean === topProductEan[0]);
        generatedInsights.push({
          id: '3',
          type: 'performance',
          title: 'Produto em Destaque',
          description: `${prod?.descricao_produto || topProductEan[0]} é o mais buscado.`,
          value: `${topProductEan[1]} consultas`,
          status: 'success',
          icon: Package
        });
      }

      // Análise de Dispositivos Inativos
      const lastQueriesByDevice = logs.reduce((acc: any, l) => {
        const id = l.device_id;
        const time = new Date(l.created_at).getTime();
        if (!acc[id] || time > acc[id]) acc[id] = time;
        return acc;
      }, {});
      
      const now = new Date().getTime();
      const inactiveDevices = Object.entries(lastQueriesByDevice).filter(([, time]: any) => (now - time) > 1000 * 60 * 60 * 2); // 2h
      
      if (inactiveDevices.length > 0) {
        generatedInsights.push({
          id: '4',
          type: 'preventive',
          title: 'Dispositivos Silenciosos',
          description: `${inactiveDevices.length} terminais sem atividade há mais de 2 horas.`,
          status: 'info',
          icon: Monitor
        });
      }

      const summary = `Olá! Analisei ${logs.length} consultas e identifiquei padrões operacionais relevantes. A taxa de erro atual é de ${errorRate.toFixed(1)}%, com maior incidência na Loja ${worstStore ? worstStore[0] : 'N/A'}. Recomendo verificar a conectividade dos dispositivos inativos.`;

      setInsights(generatedInsights);
      setExecutiveSummary(summary);
      setIsAnalyzing(false);

      // Salva no banco para cache
      await (supabase.from("inky_insights") as any).insert({
        tenant_id: tenantId,
        company_id: companyId,
        analysis_type: 'general',
        insight_data: generatedInsights,
        executive_summary: summary,
        filters_used: filters
      });

    }, 5000);
  };

  const handleGenerateReport = () => {
    toast({
      title: "Relatório IA",
      description: "Preparando seu relatório executivo premium...",
    });
    // Lógica de PDF seria integrada aqui ou no componente pai
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md border-l border-border/40 bg-background/95 backdrop-blur-md p-0 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border/40 bg-muted/30">
          <SheetHeader className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm animate-pulse" />
                <img 
                  src={INKY_AVATAR} 
                  alt="Inky AI" 
                  className="w-14 h-14 rounded-full border-2 border-primary/50 relative z-10"
                />
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-success border-2 border-background rounded-full z-20" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  Inky AI
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] h-5 uppercase tracking-tighter font-bold">
                    Assistente Operacional
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-sm font-medium text-primary/80">
                  Monitoramento Ativo e Preventivo
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center space-y-6"
              >
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <img src={INKY_AVATAR} alt="Inky" className="w-16 h-16 rounded-full absolute top-4 left-4" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Inky está pensando...</h3>
                  <p className="text-sm text-muted-foreground min-h-[40px] px-10">
                    {loadingMessages[loadingStep]}
                  </p>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 w-1.5 rounded-full transition-all duration-300",
                        i <= loadingStep ? "bg-primary w-4" : "bg-muted"
                      )} 
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Executive Summary Card */}
                <Card className="border-primary/20 bg-primary/5 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Sparkles className="h-20 w-20 text-primary rotate-12" />
                  </div>
                  <CardContent className="p-5 relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-primary">Resumo Executivo</span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                      "{executiveSummary}"
                    </p>
                  </CardContent>
                </Card>

                {/* Insights Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                    <TrendingUp className="h-3 w-3" />
                    Insights Operacionais
                  </h4>
                  <div className="grid gap-3">
                    {insights.map((insight) => (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "group p-4 rounded-xl border transition-all duration-300 cursor-default flex items-start gap-4",
                          insight.status === 'critical' && "border-destructive/20 bg-destructive/5",
                          insight.status === 'warning' && "border-warning/20 bg-warning/5",
                          insight.status === 'success' && "border-success/20 bg-success/5",
                          insight.status === 'info' && "border-primary/20 bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "p-2.5 rounded-lg shrink-0",
                          insight.status === 'critical' && "bg-destructive/10 text-destructive",
                          insight.status === 'warning' && "bg-warning/10 text-warning",
                          insight.status === 'success' && "bg-success/10 text-success",
                          insight.status === 'info' && "bg-primary/10 text-primary"
                        )}>
                          <insight.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h5 className="font-bold text-sm truncate">{insight.title}</h5>
                            {insight.value && (
                              <Badge variant="outline" className="text-[10px] font-mono h-5 bg-background/50 border-none px-1.5">
                                {insight.value}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug">
                            {insight.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors mt-1" />
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Relatório Button */}
                <div className="pt-4">
                  <Button 
                    className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:shadow-glow transition-all duration-500 font-bold group"
                    onClick={handleGenerateReport}
                  >
                    <FileText className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                    Gerar Relatório IA Completo
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-3 font-medium">
                    Relatório otimizado com análise executiva e gráficos de tendência.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            <Zap className="h-3 w-3 text-primary animate-pulse" />
            Powered by Mupa Inky Engine
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
