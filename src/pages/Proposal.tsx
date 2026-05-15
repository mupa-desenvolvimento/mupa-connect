import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Check, 
  Download, 
  Printer, 
  Monitor, 
  Zap, 
  Search, 
  WifiOff, 
  BarChart3, 
  Brain, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2,
  Calendar,
  Building,
  User,
  DollarSign,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Proposal() {
  const { toast } = useToast();
  const [unitPrice, setUnitPrice] = useState<number>(97);
  const [quantity, setQuantity] = useState<number>(10);
  const [clientName, setClientName] = useState("Nome do Cliente");
  const [clientCompany, setClientCompany] = useState("Empresa Exemplo");
  const [proposalDate, setProposalDate] = useState(new Date().toLocaleDateString("pt-BR"));
  
  const totalMonthly = unitPrice * quantity;

  const features = [
    {
      category: "Infraestrutura e Performance",
      items: [
        { icon: Monitor, title: "Player Offline-First", desc: "Continua rodando sem internet. Sincronização automática." },
        { icon: Zap, title: "Mídia Programática", desc: "Troca de conteúdo instantânea via regras ou sensores." },
        { icon: WifiOff, title: "Cache Inteligente", desc: "Pré-carregamento de vídeos e imagens para 0 delay." },
        { icon: Smartphone, title: "Suporte Multi-Plataforma", desc: "Android, TV Box, Zebra, Tablets e WebViews." },
      ]
    },
    {
      category: "Inteligência e Analytics",
      items: [
        { icon: Brain, title: "Visão Computacional", desc: "IA para detecção de idade, gênero e emoções (anônimo)." },
        { icon: BarChart3, title: "Analytics de Atenção", desc: "Métricas de tempo de visualização e impacto real." },
        { icon: Search, title: "Trade Marketing Inteligente", desc: "Consulta EAN vinculada a campanhas automáticas." },
        { icon: CheckCircle2, title: "Prova de Exibição", desc: "Logs auditáveis de cada segundo de mídia exibida." },
      ]
    },
    {
      category: "Gestão e Controle",
      items: [
        { icon: Package, title: "Gestão de Playlists", desc: "Editor visual com suporte a múltiplos formatos." },
        { icon: ShieldCheck, title: "Controle de Dispositivos", desc: "Reboot remoto, monitoramento de saúde e limpeza de cache." },
        { icon: Building, title: "Hierarquia de Lojas", desc: "Organização por grupos, cidades e regiões." },
        { icon: User, title: "Permissões Multi-Nível", desc: "Acessos específicos para marketing, técnico e admin." },
      ]
    }
  ];

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Proposta Comercial - MupaMídias", 15, 25);
      
      doc.setFontSize(10);
      doc.text(`Data: ${proposalDate}`, pageWidth - 45, 25);

      // Client Info
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text("Informações do Cliente:", 15, 55);
      doc.setFont("helvetica", "bold");
      doc.text(`${clientName}`, 15, 62);
      doc.setFont("helvetica", "normal");
      doc.text(`${clientCompany}`, 15, 68);

      // Description
      doc.setFontSize(11);
      const description = "Esta proposta contempla a licença de uso da plataforma MupaMídias, incluindo toda a infraestrutura de digital signage, retail media e ferramentas de trade marketing inteligente.";
      const splitDesc = doc.splitTextToSize(description, pageWidth - 30);
      doc.text(splitDesc, 15, 80);

      // Features Table
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Recursos Incluídos:", 15, 100);
      
      const featureRows = [];
      features.forEach(cat => {
        cat.items.forEach(item => {
          featureRows.push([item.title, item.desc]);
        });
      });

      autoTable(doc, {
        startY: 105,
        head: [["Recurso", "Descrição"]],
        body: featureRows,
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212] }, // cyan-500
        styles: { fontSize: 9 }
      });

      // Investment
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Investimento:", 15, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        head: [["Descrição", "Qtd", "Valor Unitário", "Total Mensal"]],
        body: [[
          "Licença Mensal de Uso (Software as a Service)",
          quantity.toString(),
          `R$ ${unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          `R$ ${totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        ]],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { halign: "center" }
      });

      // Footer
      const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : ((doc as any).internal.pages?.length - 1 || 1);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("MupaMídias - Tecnologia para o Varejo", 15, doc.internal.pageSize.getHeight() - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, doc.internal.pageSize.getHeight() - 10);
      }

      doc.save(`Proposta_MupaMidias_${clientCompany.replace(/\s+/g, "_")}.pdf`);
      
      toast({
        title: "Sucesso!",
        description: "PDF exportado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Configuration Header */}
        <Card className="border-none shadow-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="space-y-2">
                  <Label htmlFor="clientName" className="text-slate-300">Cliente</Label>
                  <Input 
                    id="clientName" 
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientCompany" className="text-slate-300">Empresa</Label>
                  <Input 
                    id="clientCompany" 
                    value={clientCompany} 
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitPrice" className="text-slate-300">Valor Unitário (R$)</Label>
                  <Input 
                    id="unitPrice" 
                    type="number" 
                    value={unitPrice} 
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity" className="text-slate-300">Quantidade de Telas</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button onClick={() => window.print()} variant="secondary" className="flex-1 md:flex-none">
                  <Printer className="w-4 h-4 mr-2" /> Imprimir
                </Button>
                <Button onClick={exportPDF} className="bg-cyan-500 hover:bg-cyan-600 text-white flex-1 md:flex-none">
                  <Download className="w-4 h-4 mr-2" /> Exportar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Content - The "Premium" Look */}
        <div id="proposal-paper" className="bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
          {/* Paper Header */}
          <div className="h-32 bg-slate-900 relative overflow-hidden flex items-center px-8 md:px-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            
            <div className="flex justify-between items-center w-full relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Monitor className="text-white w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">MupaMídias</h1>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-medium">Digital Signage & AI</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase font-medium">Proposta Comercial</p>
                <p className="text-white font-mono text-sm">{proposalDate}</p>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12 space-y-12">
            {/* Intro Section */}
            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Destinatário</span>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{clientName}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-lg">{clientCompany}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <Zap className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Resumo</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Solução completa de ponta a ponta para gestão de telas, automação de trade marketing e retail media com inteligência artificial integrada.
                </p>
              </div>
            </div>

            <Separator className="bg-slate-100 dark:bg-slate-800" />

            {/* Features Section */}
            <div className="space-y-10">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Diferenciais da Plataforma</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Tecnologia de ponta para elevar o patamar do seu PDV</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {features.map((cat, idx) => (
                  <div key={idx} className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{cat.category}</h4>
                    <div className="space-y-6">
                      {cat.items.map((item, i) => (
                        <div key={i} className="flex gap-4 group">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                            <item.icon className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-white" />
                          </div>
                          <div className="space-y-1">
                            <h5 className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">{item.title}</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Investment Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-8 md:p-12 border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-500" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Investimento</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Estrutura de Licenciamento</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2">Licença mensal por dispositivo. Inclui todas as atualizações, suporte técnico e infraestrutura cloud.</p>
                  </div>
                </div>

                <div className="w-full md:w-auto space-y-3">
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span className="text-sm">Valor unitário:</span>
                    <span className="font-semibold">R$ {unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-3 border-bottom border-slate-200 dark:border-slate-700">
                    <span className="text-sm">Quantidade:</span>
                    <span className="font-semibold">{quantity} {quantity === 1 ? 'tela' : 'telas'}</span>
                  </div>
                  <Separator />
                  <div className="pt-3">
                    <div className="flex justify-between items-center gap-12">
                      <span className="text-slate-900 dark:text-white font-bold uppercase tracking-widest text-xs">Total Mensal:</span>
                      <div className="text-right">
                        <span className="text-4xl font-black text-cyan-500 tracking-tighter">
                          R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Software as a Service</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer / CTA */}
            <div className="text-center pt-8 space-y-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto italic">
                "Nossa missão é transformar o varejo físico através da tecnologia, criando experiências que conectam marcas e consumidores de forma inteligente."
              </p>
              <div className="pt-4">
                <div className="h-px w-24 bg-slate-200 dark:bg-slate-800 mx-auto" />
                <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">MupaMídias &bull; Retail Intelligence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}