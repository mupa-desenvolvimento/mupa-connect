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
    <>
      <PageHeader
        title="Campanhas"
        description="Agendamento por data, horário e prioridade. Sobrescreve playlists base."
        actions={
          isMarketing && (
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Nova campanha
            </Button>
          )
        }
      />
      <Card>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Nenhuma campanha encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">P{c.priority}</span>
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
      </Card>
    </>
  );
}
