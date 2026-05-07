import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  LayoutGrid, 
  List, 
  Calendar as CalendarIcon, 
  Clock, 
  Search,
  AlertTriangle,
  Layers,
  MoreVertical,
  Play,
  Trash2,
  Edit2,
  Filter,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { CampaignCalendar } from "@/components/campaigns/CampaignCalendar";
import { CampaignTimeline } from "@/components/campaigns/CampaignTimeline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CampaignsPage() {
  const { tenantId, companyId, isSuperAdmin, isMarketing } = useUserRole();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list" | "calendar" | "timeline">("grid");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", tenantId || companyId],
    queryFn: async () => {
      let query = supabase.from("campaigns").select("*");
      
      if (!isSuperAdmin) {
        if (tenantId) query = query.eq("tenant_id", tenantId);
        else if (companyId) query = query.eq("company_id", companyId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId || !!companyId || isSuperAdmin,
  });

  const filteredCampaigns = campaigns?.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleEdit = (id: string) => {
    toast.info("Em breve: Edição de campanha");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    
    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success("Campanha excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (error: any) {
      toast.error("Erro ao excluir campanha: " + error.message);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Agendamento Inteligente"
        description="Gerencie campanhas temporárias, ofertas e conteúdos sazonais com precisão visual."
        actions={
          isMarketing && (
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-9" size="sm">
              <Plus className="h-4 w-4 mr-2" /> Nova campanha
            </Button>
          )
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-3 rounded-xl border border-border/40 backdrop-blur-sm">
        <div className="relative flex-1 w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar campanhas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background/50 border-border/40"
          />
        </div>

        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-auto">
          <TabsList className="bg-muted/30 border border-border/20 h-9 p-1">
            <TabsTrigger value="grid" className="h-7 text-xs px-3 gap-2">
              <LayoutGrid className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Cards</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="h-7 text-xs px-3 gap-2">
              <List className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="h-7 text-xs px-3 gap-2">
              <CalendarIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Calendário</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="h-7 text-xs px-3 gap-2">
              <Clock className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <Layers className="h-12 w-12 opacity-10" />
            <div className="text-center">
              <p className="font-medium text-foreground/70">Nenhuma campanha encontrada</p>
              <p className="text-sm">Tente ajustar seus filtros ou crie uma nova campanha.</p>
            </div>
          </div>
        ) : (
          <>
            {view === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto h-full pr-2">
                {filteredCampaigns.map((c) => (
                  <Card 
                    key={c.id} 
                    className="group border-border/60 overflow-hidden hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <div className="h-1.5 w-full" style={{ backgroundColor: c.color || '#9b87f5' }} />
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors">
                            {c.name}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.description || "Sem descrição"}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEdit(c.id)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Período</span>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <CalendarIcon className="h-3 w-3 text-primary/70" />
                            {c.start_date ? format(new Date(c.start_date), "dd/MM") : '-'} a {c.end_date ? format(new Date(c.end_date), "dd/MM") : '-'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Horário</span>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            <Clock className="h-3 w-3 text-primary/70" />
                            {c.start_time?.substring(0, 5) || '00:00'} - {c.end_time?.substring(0, 5) || '23:59'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/20">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 border-primary/20 bg-primary/5 text-primary">
                            PRIO {c.priority}
                          </Badge>
                          <StatusBadge status={c.is_active ? "online" : "offline"} />
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/10 px-2">
                          Ver Conteúdos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {view === "list" && (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-muted-foreground font-medium border-b border-border/40">
                    <tr>
                      <th className="px-4 py-3">Campanha</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Horário</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredCampaigns.map((c) => (
                      <tr key={c.id} className="group hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: c.color || '#9b87f5' }} />
                            <div>
                              <div className="font-bold">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{c.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {c.start_date ? format(new Date(c.start_date), "dd MMM yyyy", { locale: ptBR }) : '-'} — {c.end_date ? format(new Date(c.end_date), "dd MMM yyyy", { locale: ptBR }) : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {c.start_time?.substring(0, 5)} - {c.end_time?.substring(0, 5)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5">
                            P{c.priority}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.is_active ? "online" : "offline"} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleEdit(c.id)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === "calendar" && (
              <CampaignCalendar 
                campaigns={filteredCampaigns as any} 
                onSelectCampaign={handleEdit} 
              />
            )}

            {view === "timeline" && (
              <CampaignTimeline 
                campaigns={filteredCampaigns as any} 
                onSelectCampaign={handleEdit} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
