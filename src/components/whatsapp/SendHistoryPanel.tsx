import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, AlertTriangle, History } from "lucide-react";

export function SendHistoryPanel() {
  const { data: history } = useQuery({
    queryKey: ["whatsapp-send-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_send_history")
        .select("*, whatsapp_templates(name), whatsapp_contact_groups(name, color), whatsapp_instances(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const statusConfig: Record<string, { label: string; icon: any; cls: string }> = {
    sent: { label: "Enviado", icon: CheckCircle2, cls: "bg-green-500/10 text-green-600 border-green-200" },
    partial: { label: "Parcial", icon: AlertTriangle, cls: "bg-amber-500/10 text-amber-600 border-amber-200" },
    failed: { label: "Falhou", icon: XCircle, cls: "bg-red-500/10 text-red-600 border-red-200" },
    pending: { label: "Pendente", icon: AlertTriangle, cls: "bg-blue-500/10 text-blue-600 border-blue-200" },
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Data/Hora</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Grupo / Destino</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="text-center">Sucesso</TableHead>
              <TableHead className="text-center">Falhas</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history?.map((h: any) => {
              const cfg = statusConfig[h.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <TableRow key={h.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(h.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {h.whatsapp_templates?.name || <span className="italic text-muted-foreground">Mensagem livre</span>}
                  </TableCell>
                  <TableCell>
                    {h.whatsapp_contact_groups ? (
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: h.whatsapp_contact_groups.color, color: h.whatsapp_contact_groups.color }}>
                        {h.whatsapp_contact_groups.name}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{h.total_recipients} contatos</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs italic text-muted-foreground">"{h.message}"</TableCell>
                  <TableCell className="text-center text-xs font-medium text-green-600">{h.success_count}</TableCell>
                  <TableCell className="text-center text-xs font-medium text-red-600">{h.failure_count}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] gap-1", cfg.cls)}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {(!history || history.length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm italic">Nenhum envio registrado ainda.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
