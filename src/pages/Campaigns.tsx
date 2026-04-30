import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";

export default function CampaignsPage() {
  const { companyId, isSuperAdmin, isMarketing } = useUserRole();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", companyId],
    queryFn: async () => {
      let query = supabase.from("campaigns").select("*");
      
      if (!isSuperAdmin && companyId) {
        query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId || isSuperAdmin,
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Campanhas"
        description="Agendamento por data, horário e prioridade. Sobrescreve playlists base."
        actions={
          isMarketing && (
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-9" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova campanha
            </Button>
          )
        }
      />
      
      <div className="flex-1 overflow-hidden border border-border/60 rounded-xl bg-card shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[35%]">Nome da Campanha</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!campaigns || campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Plus className="h-10 w-10 opacity-20" />
                        <p>Nenhuma campanha agendada.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((c) => (
                    <TableRow key={c.id} className="group hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-foreground/90">
                        {c.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs font-mono text-muted-foreground">
                          <span>De: {c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "-"}</span>
                          <span>Até: {c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/5 text-primary border border-primary/10">
                          PRIORIDADE {c.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.is_active ? "online" : "offline"} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
