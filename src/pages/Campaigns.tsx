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
  ChevronRight,
  Image as ImageIcon
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
              <Button variant="premium" size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" /> Nova campanha
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col md:flex-row items-center gap-4 bg-[#1a1a1e]/40 p-4 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
        <div className="flex-1 flex items-center gap-4 w-full">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Pesquisar campanhas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-11 bg-black/40 border-white/5 focus:border-primary/50 transition-all rounded-xl text-white font-bold uppercase tracking-widest text-[10px]"
              />
          </div>
        </div>

        <Tabs value={view} onValueChange={(v: any) => setView(v)} className="w-full md:w-auto">
          <TabsList className="bg-black/40 h-11 p-1 border border-white/5 rounded-xl">
            <TabsTrigger value="grid" className="h-9 text-[10px] font-black uppercase tracking-widest px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-black"><LayoutGrid className="h-3.5 w-3.5" /> Grid</TabsTrigger>
            <TabsTrigger value="list" className="h-9 text-[10px] font-black uppercase tracking-widest px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-black"><List className="h-3.5 w-3.5" /> Lista</TabsTrigger>
            <TabsTrigger value="calendar" className="h-9 text-[10px] font-black uppercase tracking-widest px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-black"><CalendarIcon className="h-3.5 w-3.5" /> Calendário</TabsTrigger>
            <TabsTrigger value="timeline" className="h-9 text-[10px] font-black uppercase tracking-widest px-4 gap-2 data-[state=active]:bg-white data-[state=active]:text-black"><Clock className="h-3.5 w-3.5" /> Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total", val: stats.total, color: "text-white", icon: Layers, bg: "bg-white/5" },
          { label: "Ativas", val: stats.active, color: "text-green-500", icon: Sparkles, bg: "bg-green-500/10" },
          { label: "Agendadas", val: stats.scheduled, color: "text-blue-500", icon: CalendarIcon, bg: "bg-blue-500/10" },
          { label: "Expiradas", val: stats.expired, color: "text-red-500", icon: Clock, bg: "bg-red-500/10" },
        ].map(s => (
          <Card key={s.label} className="p-6 relative overflow-hidden bg-[#1a1a1e]/40 border-white/5 shadow-2xl group hover:bg-[#1a1a1e]/80 transition-all duration-300">
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">{s.label}</span>
                <p className={cn("text-3xl font-black tracking-tighter", s.color)}>{s.val}</p>
              </div>
              <div className={cn("p-3 rounded-2xl border border-white/5", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
            </div>
            {/* Background Glow */}
            <div className={cn("absolute -bottom-6 -right-6 w-24 h-24 blur-[60px] opacity-10 rounded-full", s.bg)} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto h-full pr-2 pb-10 custom-scrollbar">
                {filteredCampaigns.map((c, index) => {
                  const now = new Date();
                  const start = new Date(c.start_date);
                  const end = new Date(c.end_date);
                  
                  let status: "active" | "scheduled" | "ended" | "offline" = "offline";
                  if (!c.is_active) status = "offline";
                  else if (now < start) status = "scheduled";
                  else if (now > end) status = "ended";
                  else status = "active";

                  const campaignColor = c.color || '#9b87f5';

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className="group relative border-white/5 bg-[#1a1a1e]/40 hover:bg-[#1a1a1e]/80 transition-all duration-500 h-[300px] flex flex-col overflow-hidden shadow-2xl">
                        {/* Indicador de Cor Premium */}
                        <div className="absolute top-0 left-0 right-0 h-1 z-20" style={{ backgroundColor: campaignColor }} />
                        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
                        
                        <CardContent className="p-6 flex flex-col flex-1 gap-5 relative z-10">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: campaignColor, boxShadow: `0 0 10px ${campaignColor}60` }} />
                                <Badge variant="secondary" className="text-[9px] h-4 font-black bg-white/5 border-none text-white/40 tracking-widest px-1.5 uppercase">P{c.priority}</Badge>
                              </div>
                              <h3 className="font-black text-lg uppercase tracking-tighter text-white group-hover:text-primary transition-colors leading-tight truncate" title={c.name}>{c.name}</h3>
                              <StatusBadge status={status} />
                            </div>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-white/5 hover:bg-white/10 text-white/40">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1e] border-white/10 text-white shadow-2xl">
                                <DropdownMenuItem onClick={() => handleEdit(c.id)} className="cursor-pointer gap-3 font-bold text-xs uppercase tracking-widest py-3">
                                  <Edit2 className="h-4 w-4 text-primary" /> Editar Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-400 cursor-pointer gap-3 font-bold text-xs uppercase tracking-widest py-3" onClick={() => handleDelete(c.id)}>
                                  <Trash2 className="h-4 w-4" /> Excluir Campanha
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="space-y-3 flex-1">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                                <CalendarIcon className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                <span>{format(start, "dd MMM", { locale: ptBR })} — {format(end, "dd MMM", { locale: ptBR })}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                                <Clock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                                <span>{c.start_time.substring(0,5)} — {c.end_time.substring(0,5)}</span>
                              </div>
                            </div>
                            
                            {c.description && (
                              <p className="text-[10px] text-white/30 line-clamp-2 leading-relaxed font-medium italic overflow-hidden">
                                {c.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex -space-x-2">
                                {[1,2,3].map(i => (
                                  <div key={i} className="w-6 h-6 rounded-full border-2 border-[#1a1a1e] bg-white/5 flex items-center justify-center overflow-hidden">
                                    <ImageIcon className="w-3 h-3 text-white/20" />
                                  </div>
                                ))}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Media Pool</span>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-3 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-lg gap-1.5" 
                              onClick={() => handleEdit(c.id)}
                            >
                              Editor <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>

                        {/* Hover Overlay Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </Card>
                    </motion.div>
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
