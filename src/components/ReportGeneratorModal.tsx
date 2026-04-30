import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2, BarChart3, Package, Monitor, Info, Store, Tag } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: any[];
  filters: {
    period: string;
    dateRange?: DateRange;
    store: string;
    device: string;
  };
}


export function ReportGeneratorModal({ isOpen, onClose, logs, filters }: ReportGeneratorModalProps) {
  const [reportType, setReportType] = useState<"general" | "products" | "devices" | "stores" | "tags">("general");
  const [formatType, setFormatType] = useState<"pdf" | "csv">("pdf");
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(";"),
      ...data.map(row => headers.map(header => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async () => {
    if (!logs || logs.length === 0) return;
    
    setIsGenerating(true);
    // Pequeno delay para UX do loading
    await new Promise(resolve => setTimeout(resolve, 800));

    const timestamp = format(new Date(), "yyyyMMdd-HHmm");
    let periodLabel = "";
    
    if (filters.period === "custom" && filters.dateRange?.from) {
      periodLabel = `${format(filters.dateRange.from, "dd/MM/yy")}${filters.dateRange.to ? ` - ${format(filters.dateRange.to, "dd/MM/yy")}` : ""}`;
    } else {
      periodLabel = filters.period === "all" ? "Todo o tempo" : filters.period === "1" ? "Hoje" : `Últimos ${filters.period} dias`;
      } 
      else if (reportType === "stores") {
        const storeStats = logs.reduce((acc: any, log) => {
          const storeName = log.loja || "Sem Loja";
          if (!acc[storeName]) acc[storeName] = { loja: storeName, consultas: 0, erros: 0 };
          acc[storeName].consultas++;
          if (log.status_code !== 200) acc[storeName].erros++;
          return acc;
        }, {});
        const data = Object.values(storeStats).sort((a: any, b: any) => b.consultas - a.consultas);

        if (formatType === "csv") {
          generateCSV(data, `relatorio-lojas-${timestamp}`);
        } else {
          const doc = new jsPDF();
          doc.text("Relatório de Consultas por Loja", 14, 15);
          doc.setFontSize(10);
          doc.text(`Período: ${periodLabel} | Lojas Ativas: ${data.length}`, 14, 22);
          
          autoTable(doc, {
            startY: 30,
            head: [["Loja", "Consultas", "Erros", "% Erro"]],
            body: data.map((item: any) => [
              item.loja, 
              item.consultas, 
              item.erros, 
              ((item.erros / item.consultas) * 100).toFixed(1) + "%"
            ]),
            headStyles: { fillColor: [245, 158, 11] }
          });
          doc.save(`relatorio-lojas-${timestamp}.pdf`);
        }
      }
      else if (reportType === "tags") {
        const tagStats = logs.reduce((acc: any, log) => {
          // Usando etiqueta do log se disponível, senão EAN como fallback se for etiqueta
          const tag = log.etiqueta || log.ean || "N/A";
          if (!acc[tag]) acc[tag] = { etiqueta: tag, descricao: log.descricao_produto || "Sem descrição", consultas: 0 };
          acc[tag].consultas++;
          return acc;
        }, {});
        const data = Object.values(tagStats).sort((a: any, b: any) => b.consultas - a.consultas);

        if (formatType === "csv") {
          generateCSV(data, `relatorio-etiquetas-${timestamp}`);
        } else {
          const doc = new jsPDF();
          doc.text("Relatório de Etiquetas Mais Consultadas", 14, 15);
          doc.setFontSize(10);
          doc.text(`Período: ${periodLabel} | Total de Etiquetas: ${data.length}`, 14, 22);
          
          autoTable(doc, {
            startY: 30,
            head: [["Etiqueta/EAN", "Descrição", "Consultas"]],
            body: data.map((item: any) => [item.etiqueta, item.descricao, item.consultas]),
            headStyles: { fillColor: [139, 92, 246] }
          });
          doc.save(`relatorio-etiquetas-${timestamp}.pdf`);
        }
      } 


    try {
      if (reportType === "products") {
        const productCounts = logs.reduce((acc: any, log) => {
          const key = log.ean || "N/A";
          if (!acc[key]) acc[key] = { ean: key, descricao: log.descricao_produto || "Sem descrição", consultas: 0 };
          acc[key].consultas++;
          return acc;
        }, {});
        const data = Object.values(productCounts).sort((a: any, b: any) => b.consultas - a.consultas);

        if (formatType === "csv") {
          generateCSV(data, `relatorio-produtos-${timestamp}`);
        } else {
          const doc = new jsPDF();
          doc.text("Relatório de Produtos (Ranking EAN)", 14, 15);
          doc.setFontSize(10);
          doc.text(`Período: ${periodLabel} | Total de Registros: ${logs.length}`, 14, 22);
          
          autoTable(doc, {
            startY: 30,
            head: [["EAN", "Descrição", "Qtd. Consultas"]],
            body: data.map((item: any) => [item.ean, item.descricao, item.consultas]),
            headStyles: { fillColor: [79, 70, 229] }
          });
          doc.save(`relatorio-produtos-${timestamp}.pdf`);
        }
      } 
      else if (reportType === "devices") {
        const deviceStats = logs.reduce((acc: any, log) => {
          const id = log.device_id;
          if (!acc[id]) acc[id] = { device_id: id, apelido: log.apelido || id, consultas: 0, erros: 0 };
          acc[id].consultas++;
          if (log.status_code !== 200) acc[id].erros++;
          return acc;
        }, {});
        const data = Object.values(deviceStats).sort((a: any, b: any) => b.consultas - a.consultas);

        if (formatType === "csv") {
          generateCSV(data, `relatorio-dispositivos-${timestamp}`);
        } else {
          const doc = new jsPDF();
          doc.text("Relatório de Dispositivos", 14, 15);
          doc.setFontSize(10);
          doc.text(`Período: ${periodLabel} | Dispositivos Ativos: ${data.length}`, 14, 22);
          
          autoTable(doc, {
            startY: 30,
            head: [["ID / Serial", "Apelido", "Consultas", "Erros", "% Erro"]],
            body: data.map((item: any) => [
              item.device_id, 
              item.apelido, 
              item.consultas, 
              item.erros, 
              ((item.erros / item.consultas) * 100).toFixed(1) + "%"
            ]),
            headStyles: { fillColor: [16, 185, 129] }
          });
          doc.save(`relatorio-dispositivos-${timestamp}.pdf`);
        }
      } 
      else {
        // Geral
        const total = logs.length;
        const errors = logs.filter(l => l.status_code !== 200).length;
        const devices = new Set(logs.map(l => l.device_id)).size;
        
        if (formatType === "csv") {
          const data = [{
            total_consultas: total,
            total_erros: errors,
            taxa_erro: ((errors / total) * 100).toFixed(2) + "%",
            dispositivos_ativos: devices,
            periodo: periodLabel
          }];
          generateCSV(data, `relatorio-geral-${timestamp}`);
        } else {
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.text("Relatório Geral Consolidado", 14, 20);
          
          doc.setFontSize(10);
          doc.text(`Data de Emissão: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 30);
          doc.text(`Período Selecionado: ${periodLabel}`, 14, 35);

          // KPIs Table
          autoTable(doc, {
            startY: 45,
            head: [["Métrica", "Valor"]],
            body: [
              ["Total de Consultas", total],
              ["Dispositivos Ativos", devices],
              ["Total de Erros", errors],
              ["Taxa de Erro Global", ((errors / total) * 100).toFixed(2) + "%"]
            ],
            theme: 'grid',
            headStyles: { fillColor: [31, 41, 55] }
          });

          doc.save(`relatorio-geral-${timestamp}.pdf`);
        }
      }
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setIsGenerating(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Gerador de Relatórios
          </DialogTitle>
          <DialogDescription>
            Escolha o tipo e o formato do relatório para exportação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Relatório</Label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setReportType("general")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  reportType === "general" ? "bg-primary/5 border-primary" : "hover:bg-muted"
                }`}
              >
                <div className={`p-2 rounded-md ${reportType === "general" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Consolidado Geral</p>
                  <p className="text-xs text-muted-foreground">KPIs e resumo de performance</p>
                </div>
              </button>

              <button
                onClick={() => setReportType("products")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  reportType === "products" ? "bg-primary/5 border-primary" : "hover:bg-muted"
                }`}
              >
                <div className={`p-2 rounded-md ${reportType === "products" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ranking de Produtos (EAN)</p>
                  <p className="text-xs text-muted-foreground">Volume de consultas por item</p>
                </div>
              </button>

              <button
                onClick={() => setReportType("devices")}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  reportType === "devices" ? "bg-primary/5 border-primary" : "hover:bg-muted"
                }`}
              >
                <div className={`p-2 rounded-md ${reportType === "devices" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Uso por Dispositivo</p>
                  <p className="text-xs text-muted-foreground">Ranking e taxas de erro por terminal</p>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formato de Saída</Label>
            <Select value={formatType} onValueChange={(v: any) => setFormatType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">Documento PDF (Visual)</SelectItem>
                <SelectItem value="csv">Planilha CSV (Dados Brutos)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg flex gap-3 items-start">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              O relatório será gerado aplicando os filtros atuais de período, loja e dispositivo.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : formatType === "pdf" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Gerar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
