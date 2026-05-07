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
import { format } from "date-fns";

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

  useEffect(() => {
    if (open && campaignId) {
      fetchCampaign(campaignId);
    } else if (open && !campaignId) {
      setInitialData(undefined);
    }
  }, [open, campaignId]);

  const fetchCampaign = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
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

      if (campaignId) {
        const { error } = await supabase
          .from("campaigns")
          .update(payload)
          .eq("id", campaignId);
        if (error) throw error;
        toast.success("Campanha atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("campaigns")
          .insert([payload]);
        if (error) throw error;
        toast.success("Campanha criada com sucesso");
      }

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
