import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Layers,
  MoreVertical,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  Settings2,
  ArrowLeft,
  Megaphone,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CampaignCalendar } from "@/components/campaigns/CampaignCalendar";
import { CampaignTimeline } from "@/components/campaigns/CampaignTimeline";
import { CampaignEditor } from "@/components/campaigns/CampaignEditor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function CampaignsPage() {
  const { tenantId, companyId, isSuperAdmin, isMarketing } = useUserRole();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"grid" | "list" | "calendar" | "timeline" | "editor">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const { data: campaigns, isLoading, refetch } = useQuery({
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

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [campaigns, searchQuery]);

  const stats = useMemo(() => {
    if (!campaigns) return { total: 0, active: 0, scheduled: 0, expired: 0 };
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.is_active && new Date() >= new Date(c.start_date) && new Date() <= new Date(c.end_date)).length,
      scheduled: campaigns.filter(c => new Date() < new Date(c.start_date)).length,
      expired: campaigns.filter(c => new Date() > new Date(c.end_date)).length,
    };
  }, [campaigns]);

  const handleEdit = (id: string) => {
    setSelectedCampaignId(id);
    setView("editor");
  };

  const handleCreate = () => {
    setSelectedCampaignId(null);
    setView("editor");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success("Campanha excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  if (view === "editor") {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
        <PageHeader
          title={selectedCampaignId ? "Editar Campanha" : "Nova Campanha"}
          description="Gerencie os detalhes e o conteúdo da sua campanha em uma visão expandida."
          actions={
            <Button variant="ghost" size="sm" onClick={() => setView("grid")} className="h-9">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Lista
            </Button>
          }
        />
        <div className="flex-1 overflow-hidden">
          <CampaignEditor 
            campaignId={selectedCampaignId} 
            onClose={() => {
              setView("grid");
              setSelectedCampaignId(null);
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Campanhas"
        description="Gerencie campanhas temporárias, ofertas e conteúdos sazonais com precisão."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-9">
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} /> Atualizar
            </Button>
            {isMarketing && (
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-9" size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" /> Nova campanha
              </Button>
            )}
          </div>
        }
      />

      <div className="flex items-center gap-2 bg-card p-3 rounded-xl border border-border/60 shadow-sm">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar campanhas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background/50"
            />
          </div>
        </div>

        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-auto">
          <TabsList className="bg-muted/30 h-9 p-1">
            <TabsTrigger value="grid" className="h-7 text-xs px-3 gap-2"><LayoutGrid className="h-3.5 w-3.5" /> Cards</TabsTrigger>
            <TabsTrigger value="list" className="h-7 text-xs px-3 gap-2"><List className="h-3.5 w-3.5" /> Lista</TabsTrigger>
            <TabsTrigger value="calendar" className="h-7 text-xs px-3 gap-2"><CalendarIcon className="h-3.5 w-3.5" /> Calendário</TabsTrigger>
            <TabsTrigger value="timeline" className="h-7 text-xs px-3 gap-2"><Clock className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", val: stats.total, color: "text-foreground" },
          { label: "Ativas", val: stats.active, color: "text-green-500" },
          { label: "Agendadas", val: stats.scheduled, color: "text-blue-500" },
          { label: "Expiradas", val: stats.expired, color: "text-red-500" },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center justify-between border-border/60">
            <span className="text-sm text-muted-foreground font-medium">{s.label}</span>
            <span className={cn("text-2xl font-bold", s.color)}>{s.val}</span>
          </Card>
        ))}
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Layers className="h-12 w-12 opacity-10" />
            <p>Nenhuma campanha encontrada</p>
          </div>
        ) : (
          <>
            {view === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-y-auto h-full pr-2">
                {filteredCampaigns.map((c) => {
                  const now = new Date();
                  const start = new Date(c.start_date);
                  const end = new Date(c.end_date);
                  
                  let status: "active" | "scheduled" | "ended" | "offline" = "offline";
                  if (!c.is_active) status = "offline";
                  else if (now < start) status = "scheduled";
                  else if (now > end) status = "ended";
                  else status = "active";

                  return (
                    <Card key={c.id} className="group border-border/60 shadow-sm hover:shadow-md transition-all h-[280px] flex flex-col overflow-hidden">
                      <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: c.color || '#9b87f5' }} />
                      <CardContent className="p-4 flex flex-col flex-1 gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base truncate group-hover:text-primary transition-colors" title={c.name}>{c.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium bg-muted/50 border-none">P{c.priority}</Badge>
                              <StatusBadge status={status} />
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleEdit(c.id)} className="cursor-pointer"><Edit2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-col gap-2 mt-1 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40">
                            <CalendarIcon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            <span className="truncate">{format(start, "dd MMM")} até {format(end, "dd MMM")}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40">
                            <Clock className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            <span>{c.start_time.substring(0,5)} — {c.end_time.substring(0,5)}</span>
                          </div>
                          {c.description && (
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed italic opacity-80 mt-1">
                              "{c.description}"
                            </p>
                          )}
                        </div>

                        <div className="pt-3 mt-auto border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/60 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3 w-3" />
                            <span>Playlist Principal</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-primary hover:bg-primary/5 font-semibold" onClick={() => handleEdit(c.id)}>
                            Ver Detalhes
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
            
            {view === "list" && (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden h-full overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3 text-left">Campanha</th>
                      <th className="px-4 py-3 text-left">Período</th>
                      <th className="px-4 py-3 text-left">Horário</th>
                      <th className="px-4 py-3 text-left">Prioridade</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCampaigns.map(c => (
                      <tr key={c.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-bold flex items-center gap-2 text-foreground">
                          <div className="h-8 w-1.5 rounded-full shrink-0" style={{ backgroundColor: c.color || '#9b87f5' }} />
                          <span className="truncate">{c.name}</span>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {format(new Date(c.start_date), "dd/MM")} - {format(new Date(c.end_date), "dd/MM")}
                        </td>
                        <td className="px-4 py-3 font-mono">{c.start_time.substring(0,5)} - {c.end_time.substring(0,5)}</td>
                        <td className="px-4 py-3"><Badge variant="outline">P{c.priority}</Badge></td>
                        <td className="px-4 py-3"><StatusBadge status={c.is_active ? "online" : "offline"} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(c.id)}><Edit2 className="h-4 w-4" /></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === "calendar" && <CampaignCalendar campaigns={filteredCampaigns as any} onSelectCampaign={handleEdit} />}
            {view === "timeline" && <CampaignTimeline campaigns={filteredCampaigns as any} onSelectCampaign={handleEdit} />}
          </>
        )}
      </div>
    </div>
  );
}
