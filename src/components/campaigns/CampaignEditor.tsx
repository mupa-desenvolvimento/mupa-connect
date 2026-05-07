import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import { CampaignForm, CampaignFormValues } from "./CampaignForm";
import { CampaignContentManager } from "./CampaignContentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { LayoutGrid, Settings2, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
          )
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
      }
    } catch (error: any) {
      toast.error("Erro ao carregar campanha: " + error.message);
      onClose();
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="p-6 border-b border-border/60 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              {campaignId ? "Editar Campanha" : "Nova Campanha"}
              {currentCampaignId && (
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                  ID: {currentCampaignId.substring(0, 8)}
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {campaignId ? "Atualize as configurações e conteúdos da sua campanha." : "Crie uma nova campanha e defina seus conteúdos."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={() => (document.querySelector('form button[type="submit"]') as HTMLButtonElement)?.click()}
            className="bg-gradient-primary text-primary-foreground gap-2"
            disabled={isLoading}
          >
            <Save className="h-4 w-4" /> Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-2 border-b border-border/60 bg-muted/10">
          <TabsList className="bg-muted/30 h-10 p-1">
            <TabsTrigger value="details" className="gap-2 text-xs px-4">
              <Settings2 className="h-3.5 w-3.5" /> Configurações Gerais
            </TabsTrigger>
            <TabsTrigger 
              value="content" 
              className="gap-2 text-xs px-4"
              disabled={!currentCampaignId}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Conteúdo da Campanha
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <TabsContent value="details" className="m-0 focus-visible:ring-0">
            <div className="max-w-4xl mx-auto">
              <CampaignForm 
                initialData={initialData} 
                onSubmit={onSubmit} 
                isLoading={isLoading} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="content" className="m-0 h-full focus-visible:ring-0">
            {currentCampaignId ? (
              <CampaignContentManager campaignId={currentCampaignId} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4 bg-muted/5 rounded-2xl border-2 border-dashed">
                <LayoutGrid className="h-16 w-16 text-muted-foreground/20" />
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">Conteúdo não disponível</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                    Salve as configurações básicas da campanha primeiro para habilitar o gerenciamento de conteúdo.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setActiveTab("details")}>Ir para Configurações</Button>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}