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

      let currentCampaignId = campaignId;

      if (campaignId) {
        const { error } = await supabase
          .from("campaigns")
          .update(payload)
          .eq("id", campaignId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("campaigns")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        currentCampaignId = data.id;
      }

      // Sincronizar playlists
      if (currentCampaignId) {
        // Remover associações antigas
        await supabase
          .from("playlist_campaigns")
          .delete()
          .eq("campaign_id", currentCampaignId);

        // Adicionar novas associações
        if (values.playlist_ids && values.playlist_ids.length > 0) {
          const associations = values.playlist_ids.map(playlistId => ({
            campaign_id: currentCampaignId,
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
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar campanha: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaignId ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          <DialogDescription>
            Defina os detalhes, período e horários de exibição da campanha.
          </DialogDescription>
        </DialogHeader>
        
        <CampaignForm 
          initialData={initialData} 
          onSubmit={onSubmit} 
          isLoading={isLoading} 
        />
      </DialogContent>
    </Dialog>
  );
}
