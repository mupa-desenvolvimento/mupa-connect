import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { CampaignForm, CampaignFormValues } from "./CampaignForm";
import { CampaignContentManager } from "./CampaignContentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LayoutGrid, 
  Settings2, 
  ArrowLeft, 
  Save, 
  Calendar, 
  Clock, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Megaphone,
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface CampaignEditorProps {
  campaignId?: string | null;
  onClose: () => void;
}

export function CampaignEditor({ campaignId, onClose }: CampaignEditorProps) {
  const { tenantId, companyId } = useUserRole();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CampaignFormValues> | undefined>();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(campaignId || null);
  const [campaignStats, setCampaignStats] = useState({ contentCount: 0 });

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId);
    } else {
      setInitialData(undefined);
    }
  }, [campaignId]);

  const fetchCampaign = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          playlist_campaigns (
            playlist_id
          ),
          campaign_contents (count)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setInitialData({
          name: data.name,
          description: data.description || "",
          start_date: data.start_date ? new Date(data.start_date) : undefined,
          end_date: data.end_date ? new Date(data.end_date) : undefined,
          start_time: data.start_time || "00:00",
          end_time: data.end_time || "23:59",
          priority: data.priority || 0,
          color: data.color || "#9b87f5",
          is_active: data.is_active ?? true,
          playlist_ids: (data.playlist_campaigns as any[])?.map((pc: any) => pc.playlist_id) || [],
        });
        
        // Em vez de campaign_contents (count) direto, vamos contar manualmente se necessário ou ajustar a query
        const contentCount = (data as any).campaign_contents?.[0]?.count || 0;
        setCampaignStats({ contentCount });
      }
    } catch (error: any) {
      toast.error("Erro ao carregar campanha: " + error.message);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  // Re-fetch stats when content might have changed
  const refreshStats = async () => {
    if (!currentCampaignId) return;
    const { count } = await supabase
      .from("campaign_contents")
      .select("*", { count: 'exact', head: true })
      .eq("campaign_id", currentCampaignId);
    setCampaignStats({ contentCount: count || 0 });
  };

  const onSubmit = async (values: CampaignFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        name: values.name,
        description: values.description,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        start_time: values.start_time,
        end_time: values.end_time,
        priority: values.priority,
        color: values.color,
        is_active: values.is_active,
        tenant_id: tenantId,
        company_id: companyId,
      };

      let id = currentCampaignId;

      if (id) {
        const { error } = await supabase
          .from("campaigns")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("campaigns")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        id = data.id;
        setCurrentCampaignId(id);
      }

      // Sincronizar playlists
      if (id) {
        await supabase
          .from("playlist_campaigns")
          .delete()
          .eq("campaign_id", id);

        if (values.playlist_ids && values.playlist_ids.length > 0) {
          const associations = values.playlist_ids.map(playlistId => ({
            campaign_id: id,
            playlist_id: playlistId,
            tenant_id: tenantId,
            is_active: values.is_active,
            priority: values.priority
          }));

          const { error: assocError } = await supabase
            .from("playlist_campaigns")
            .insert(associations);
          
          if (assocError) throw assocError;
        }
      }

      toast.success(campaignId ? "Campanha atualizada" : "Campanha criada");
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      
      if (!campaignId) {
        setActiveTab("content");
      }
    } catch (error: any) {
      toast.error("Erro ao salvar campanha: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const campaignColor = initialData?.color || "#9b87f5";

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative">
      {/* HEADER FIXO PREMIUM */}
      <header className="sticky top-0 z-50 bg-[#0c0c0e]/80 backdrop-blur-2xl border-b border-white/5 p-6 md:px-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]" 
                style={{ 
                  backgroundColor: campaignColor,
                  boxShadow: `0 0 20px ${campaignColor}`
                }} 
              />
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter truncate max-w-[200px] md:max-w-md italic">
                {initialData?.name || (campaignId ? "Carregando..." : "Nova Campanha")}
              </h2>
              {initialData?.is_active ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0">ATIVA</Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0">INATIVA</Badge>
              )}
            </div>
            
            {initialData && (
              <div className="flex items-center gap-4 mt-1 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  <Calendar className="h-3 w-3 text-primary/60" />
                  {format(initialData.start_date!, "dd/MM")} → {format(initialData.end_date!, "dd/MM")}
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  <Clock className="h-3 w-3 text-primary/60" />
                  {initialData.start_time} → {initialData.end_time}
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  <Layers className="h-3 w-3 text-primary/60" />
                  {campaignStats.contentCount} {campaignStats.contentCount === 1 ? 'Conteúdo' : 'Conteúdos'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5"
          >
            Cancelar
          </Button>
          <Button 
            onClick={() => (document.querySelector('form button[type="submit"]') as HTMLButtonElement)?.click()}
            className="bg-white text-black hover:bg-white/90 font-black text-xs uppercase tracking-widest h-10 px-6 shadow-[0_0_20px_rgba(255,255,255,0.1)] gap-2 rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Alterações
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-2 bg-[#0c0c0e]/40 border-b border-white/5">
          <TabsList className="bg-transparent h-12 p-0 gap-8">
            <TabsTrigger 
              value="details" 
              className="data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 border-b-2 border-transparent data-[state=active]:border-white rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest gap-2 transition-all"
            >
              <Settings2 className="h-4 w-4" /> Configurações Gerais
            </TabsTrigger>
            <TabsTrigger 
              value="content" 
              className="data-[state=active]:bg-transparent data-[state=active]:text-white text-white/40 border-b-2 border-transparent data-[state=active]:border-white rounded-none h-full px-0 text-xs font-bold uppercase tracking-widest gap-2 transition-all"
              disabled={!currentCampaignId}
            >
              <Megaphone className="h-4 w-4" /> Conteúdo da Campanha
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="details" className="m-0 h-full focus-visible:ring-0 overflow-y-auto custom-scrollbar">
            <div className="w-full py-6 px-6">
              <CampaignForm 
                initialData={initialData} 
                onSubmit={onSubmit} 
                isLoading={isLoading} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="m-0 h-full focus-visible:ring-0 overflow-hidden">
            {currentCampaignId ? (
              <CampaignContentManager campaignId={currentCampaignId} onContentChange={refreshStats} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-6 animate-in fade-in duration-700">
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Megaphone className="h-10 w-10 text-white/10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-tighter">Conteúdo bloqueado</h3>
                  <p className="text-sm text-white/40 max-w-xs mx-auto">
                    Salve as configurações básicas para habilitar o editor visual de conteúdos.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("details")}
                  className="border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-widest"
                >
                  Configurar Campanha
                </Button>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}