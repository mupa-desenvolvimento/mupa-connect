import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CampaignForm, CampaignFormValues } from "./CampaignForm";
import { CampaignContentManager } from "./CampaignContentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { LayoutGrid, Settings2 } from "lucide-react";

interface CampaignDialogProps {
  campaignId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CampaignDialog({ campaignId, open, onOpenChange }: CampaignDialogProps) {
  const { tenantId, companyId } = useUserRole();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CampaignFormValues> | undefined>();
  const [activeTab, setActiveTab] = useState<string>("details");
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(campaignId || null);

  useEffect(() => {
    if (open) {
      setActiveTab("details");
      setCurrentCampaignId(campaignId || null);
      if (campaignId) {
        fetchCampaign(campaignId);
      } else {
        setInitialData(undefined);
      }
    }
  }, [open, campaignId]);

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
      onOpenChange(false);
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
        // Remover associações antigas
        await supabase
          .from("playlist_campaigns")
          .delete()
          .eq("campaign_id", id);

        // Adicionar novas associações
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
        // Se era uma nova campanha, agora temos ID, podemos ir para a aba de conteúdo
        setActiveTab("content");
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error("Erro ao salvar campanha: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border-none bg-[#0F0F12]">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {campaignId ? "Editar Campanha" : "Nova Campanha"}
            {currentCampaignId && (
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30 text-primary">
                ID: {currentCampaignId.substring(0, 8)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-white/40">
            Gerencie as configurações e o conteúdo desta campanha.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden mt-4">
          <div className="px-6 border-b border-white/5">
            <TabsList className="bg-white/5 h-10 p-1 mb-2">
              <TabsTrigger value="details" className="gap-2 text-xs px-4">
                <Settings2 className="h-3.5 w-3.5" /> Configurações
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

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <TabsContent value="details" className="m-0 focus-visible:ring-0">
              <CampaignForm 
                initialData={initialData} 
                onSubmit={onSubmit} 
                isLoading={isLoading} 
              />
            </TabsContent>
            
            <TabsContent value="content" className="m-0 h-full focus-visible:ring-0">
              {currentCampaignId ? (
                <CampaignContentManager campaignId={currentCampaignId} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <LayoutGrid className="h-12 w-12 text-white/10" />
                  <p className="text-sm text-white/40 max-w-xs">
                    Salve as configurações da campanha primeiro para poder adicionar conteúdo.
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
