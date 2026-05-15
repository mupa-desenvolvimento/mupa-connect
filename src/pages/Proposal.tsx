import { useState } from "react";
import { 
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
  Building,
  User,
  DollarSign,
  Package,
  Layers,
  Cpu,
  Globe,
  Lock,
  MessageCircle,
  Clock,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const [proposalDate] = useState(new Date().toLocaleDateString("pt-BR"));
  
  const totalMonthly = unitPrice * quantity;

  const features = [
    {
      category: "Infraestrutura e Performance",
      items: [
        { icon: Monitor, title: "Player Offline-First", desc: "Continua rodando sem internet. Sincronização automática em segundo plano." },
        { icon: Zap, title: "Mídia Programática", desc: "Troca de conteúdo instantânea via regras de negócio, horários ou sensores." },
        { icon: WifiOff, title: "Cache Inteligente", desc: "Pré-carregamento de vídeos e imagens para garantir transições com 0 delay." },
        { icon: Smartphone, title: "Suporte Multi-Plataforma", desc: "Compatível com Android, TV Box, Zebra ET40, Tablets e WebViews." },
        { icon: Layers, title: "Zonas de Conteúdo", desc: "Divida a tela em múltiplas áreas para exibir diferentes tipos de mídia simultaneamente." },
        { icon: Cpu, title: "Aceleração de Hardware", desc: "Otimização total para 4K e vídeos de alta taxa de quadros sem travamentos." }
      ]
    },
    {
      category: "Inteligência e Analytics",
      items: [
        { icon: Brain, title: "Visão Computacional", desc: "IA para detecção de audiência, idade, gênero e emoções (100% anônimo e LGPD)." },
        { icon: BarChart3, title: "Analytics em Tempo Real", desc: "Dashboard completo com métricas de tempo de visualização e impacto das campanhas." },
        { icon: Search, title: "Trade Marketing Digital", desc: "Consulta EAN vinculada a disparos de campanhas automáticas de cross-selling." },
        { icon: CheckCircle2, title: "Proof of Play (PoP)", desc: "Relatórios auditáveis com log de cada segundo de mídia efetivamente exibida." },
        { icon: Globe, title: "Geolocalização", desc: "Segmentação de conteúdo baseada na localização física de cada dispositivo ou loja." },
        { icon: Clock, title: "Agendamento Avançado", desc: "Planejamento anual de campanhas com datas de início e fim automatizadas." }
      ]
    },
    {
      category: "Gestão e Segurança",
      items: [
        { icon: Package, title: "Editor de Playlists", desc: "Interface intuitiva drag-and-drop para montagem rápida de grades de programação." },
        { icon: ShieldCheck, title: "Saúde do Dispositivo", desc: "Monitoramento de temperatura, memória, conexão e status da tela em tempo real." },
        { icon: Building, title: "Gestão Centralizada", desc: "Hierarquia completa de permissões por empresa, revenda, grupo e loja." },
        { icon: User, title: "Multi-Usuário", desc: "Controle de acesso granular (Admin, Marketing, Técnico, Visualizador)." },
        { icon: Lock, title: "Kiosk Mode", desc: "Bloqueio total do sistema operacional para garantir que apenas o app Mupa seja exibido." },
        { icon: MessageCircle, title: "Notificações de Alerta", desc: "Avisos automáticos via WhatsApp/Email se um dispositivo ficar offline." }
      ]
    }
  ];

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Função para converter imagem para Base64
      const getBase64Image = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.setAttribute('crossOrigin', 'anonymous');
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = reject;
          img.src = url;
        });
      };

      let logoBase64 = "";
      try {
        logoBase64 = await getBase64Image("/logo.svg");
      } catch (e) {
        console.warn("Logo not found for PDF", e);
      }

      // Capa
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth/2 - 30, 60, 60, 20);
      }
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text("PROPOSTA COMERCIAL", pageWidth/2, 110, { align: "center" });
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text("Soluções de Retail Media & Digital Signage", pageWidth/2, 120, { align: "center" });
      
      doc.setDrawColor(6, 182, 212); // cyan-500
      doc.setLineWidth(1);
      doc.line(pageWidth/2 - 20, 130, pageWidth/2 + 20, 130);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(`Cliente: ${clientName}`, pageWidth/2, 160, { align: "center" });
      doc.text(`Empresa: ${clientCompany}`, pageWidth/2, 170, { align: "center" });
      doc.text(`Data: ${proposalDate}`, pageWidth/2, 180, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("mupa.com.br", pageWidth/2, pageHeight - 20, { align: "center" });

      // Nova Página - Detalhes Técnicos
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 25, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("DIFERENCIAIS TECNOLÓGICOS", 15, 16);

      let currentY = 40;
      features.forEach(cat => {
        doc.setTextColor(6, 182, 212);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(cat.category.toUpperCase(), 15, currentY);
        currentY += 8;

        const tableData = cat.items.map(item => [item.title, item.desc]);
        
        autoTable(doc, {
          startY: currentY,
          head: [],
          body: tableData,
          theme: "plain",
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 
            0: { fontStyle: 'bold', cellWidth: 40 },
            1: { cellWidth: 130 }
          },
          margin: { left: 15 }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 12;
      });

      // Nova Página - Investimento
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("INVESTIMENTO E LICENCIAMENTO", 15, 16);

      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const investmentText = "O modelo de licenciamento Mupa é baseado em SaaS (Software as a Service), garantindo que sua operação esteja sempre atualizada com as últimas inovações em inteligência artificial e performance de vídeo.";
      const splitInvestment = doc.splitTextToSize(investmentText, pageWidth - 30);
      doc.text(splitInvestment, 15, 40);

      autoTable(doc, {
        startY: 55,
        head: [["Descrição do Serviço", "Qtd", "Valor Unitário", "Total Mensal"]],
        body: [[
          "Licença Mensal Mupa Cloud (Software)",
          quantity.toString(),
          `R$ ${unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          `R$ ${totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        ]],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, halign: "center" },
        columnStyles: { 0: { halign: "left", cellWidth: 80 } }
      });

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("* Valores expressos em Reais (BRL).", 15, (doc as any).lastAutoTable.finalY + 10);
      doc.text("* Faturamento mensal via boleto ou cartão.", 15, (doc as any).lastAutoTable.finalY + 15);

      // Rodapé em todas as páginas (exceto capa)
      const pageCount = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : ((doc as any).internal.pages?.length - 1 || 1);
      for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("MupaMídias & Retail Intelligence", 15, pageHeight - 10);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, pageHeight - 10);
      }

      doc.save(`Proposta_Mupa_${clientCompany.replace(/\s+/g, "_")}.pdf`);
      
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
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Editor Panel */}
        <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden">
          <div className="bg-cyan-500 h-1 w-full" />
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-end justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Nome do Cliente</Label>
                  <Input 
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Empresa</Label>
                  <Input 
                    value={clientCompany} 
                    onChange={(e) => setClientCompany(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Licença Unitária (R$)</Label>
                  <Input 
                    type="number" 
                    value={unitPrice} 
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="bg-white/5 border-white/10 text-white focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400 text-xs uppercase font-bold tracking-wider">Quantidade de Telas</Label>
                  <Input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="bg-white/5 border-white/10 text-white focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <Button onClick={() => window.print()} variant="outline" className="border-white/10 hover:bg-white/5 text-white flex-1 md:flex-none">
                  <Printer className="w-4 h-4 mr-2" /> Imprimir
                </Button>
                <Button onClick={exportPDF} className="bg-cyan-500 hover:bg-cyan-600 text-white flex-1 md:flex-none shadow-lg shadow-cyan-500/20">
                  <Download className="w-4 h-4 mr-2" /> Exportar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visual Proposal Body */}
        <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-500">
          {/* Top Branding Bar */}
          <div className="bg-slate-900 py-8 px-12 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-4">
              <img src="/logo.svg" alt="Mupa" className="h-10 w-auto" />
              <div className="h-8 w-px bg-white/10 mx-2 hidden md:block" />
              <div className="hidden md:block">
                <p className="text-white font-bold tracking-tight text-lg">MupaMídias</p>
                <p className="text-cyan-500 text-[10px] uppercase font-black tracking-[0.2em]">Retail Intelligence</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Documento ID</p>
              <p className="text-white font-mono text-sm uppercase">PRP-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
            </div>
          </div>

          <div className="p-8 md:p-16 space-y-20">
            {/* Hero Section */}
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.15em]">Proposta Comercial &bull; 2024</span>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-slate-400 font-medium text-lg tracking-tight">Prezado(a) <span className="text-slate-900 dark:text-white font-bold">{clientName}</span>,</h2>
                  <h3 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-[0.9]">
                    Sua rede de telas <br /> <span className="text-cyan-500">inteligente.</span>
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed max-w-md">
                    Transformamos o ponto de venda da <span className="font-bold text-slate-700 dark:text-slate-200">{clientCompany}</span> em um canal de mídia programática orientado por dados.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-700/50 relative group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-cyan-500/10 transition-colors" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">Resumo do Projeto</p>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <p className="text-slate-500 text-sm">Quantidade de licenças:</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{quantity}</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <p className="text-slate-500 text-sm">Escopo:</p>
                      <p className="text-slate-900 dark:text-white font-bold">Full Platform Access</p>
                    </div>
                  </div>
                  <Separator className="bg-slate-200 dark:bg-slate-700" />
                  <div className="pt-2">
                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Investimento Mensal</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-cyan-500 tracking-tighter">R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <span className="text-slate-400 text-xs font-medium">/mês</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Grid - More Detailed */}
            <div className="space-y-16">
              <div className="text-center space-y-4">
                <h4 className="text-xs font-black text-cyan-500 uppercase tracking-[0.3em]">Full Stack Capabilities</h4>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">O que está incluído na plataforma?</h3>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
                {features.map((cat, idx) => (
                  <div key={idx} className="space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-1 bg-cyan-500 rounded-full" />
                      <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">{cat.category}</h5>
                    </div>
                    <div className="space-y-8">
                      {cat.items.map((item, i) => (
                        <div key={i} className="flex gap-5 group">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:border-cyan-500 transition-all duration-300">
                            <item.icon className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-white transition-colors" />
                          </div>
                          <div className="space-y-1.5">
                            <h6 className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">{item.title}</h6>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Table Section */}
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Detalhamento Comercial</h3>
                <div className="h-px flex-1 mx-8 bg-slate-100 dark:bg-slate-800 hidden md:block" />
              </div>
              
              <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição do Serviço</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Unitário</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900 dark:text-white">Licenciamento Mupa Cloud Enterprise</p>
                        <p className="text-xs text-slate-500 mt-1">SaaS - Software as a Service. Inclui CDN, Hosting, Updates e IA.</p>
                      </td>
                      <td className="px-8 py-6 text-center font-bold text-slate-900 dark:text-white">{quantity}</td>
                      <td className="px-8 py-6 text-right font-medium text-slate-600 dark:text-slate-400">R$ {unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td className="px-8 py-6 text-right font-black text-slate-900 dark:text-white">R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                      <td colSpan={3} className="px-8 py-6 text-right text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Investimento Total Mensal</td>
                      <td className="px-8 py-6 text-right text-3xl font-black text-cyan-500 tracking-tighter">R$ {totalMonthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Terms / Footer */}
            <div className="grid md:grid-cols-2 gap-12 pt-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condições Gerais</p>
                <ul className="space-y-2">
                  <li className="flex gap-3 text-xs text-slate-500 font-medium">
                    <div className="h-1 w-1 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                    Faturamento mensal via boleto bancário (D+30).
                  </li>
                  <li className="flex gap-3 text-xs text-slate-500 font-medium">
                    <div className="h-1 w-1 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                    Suporte técnico N1 e N2 via canal direto.
                  </li>
                  <li className="flex gap-3 text-xs text-slate-500 font-medium">
                    <div className="h-1 w-1 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                    SLA de disponibilidade de 99.8%.
                  </li>
                </ul>
              </div>
              <div className="md:text-right space-y-4">
                <img src="/logo.svg" alt="Mupa" className="h-8 w-auto md:ml-auto opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Mupa Desenvolvimento de Soluções LTDA</p>
                <p className="text-[10px] text-slate-400">CNPJ: 50.667.125/0001-48 &bull; mupa.com.br</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}