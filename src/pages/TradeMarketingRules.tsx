import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Megaphone, 
  Settings2, 
  Clock, 
  BarChart3, 
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";

export default function TradeMarketingRules() {
  const queryClient = useQueryClient();
  const { tenantId, companyId } = useUserRole();
  const [isModalOpen, setIsDialogOpen] = useState(false);
  
  // Rules fetch
  const { data: campaigns, isLoading } = useQuery({
    query_Key: ["trade-marketing-rules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_marketing")
        .select("*")
        .eq("empresa", tenantId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const { data: medias } = useQuery({
    queryKey: ["medias", tenantId],
    queryFn: async () => {
      // Primeiro buscamos os IDs das mídias que estão em playlists ativas
      const { data: activePlaylistItems, error: itemsError } = await supabase
        .from("playlist_items")
        .select(`
          media_id,
          playlists!inner(is_active, tenant_id)
        `)
        .eq("playlists.is_active", true)
        .eq("playlists.tenant_id", tenantId);

      if (itemsError) {
        console.error("Erro ao buscar itens de playlist:", itemsError);
        return [];
      }

      const activeMediaIds = Array.from(new Set(activePlaylistItems.map(item => item.media_id).filter(Boolean)));

      if (activeMediaIds.length === 0) return [];

      const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .in("id", activeMediaIds)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });

  const [formData, setFormData] = useState({
    name: "",
    media_id: "",
    eans: "",
    display_time: "10",
    priority: "1",
    cooldown_seconds: "60",
    max_dispatches_per_minute: "3"
  });

  const createRule = useMutation({
    mutationFn: async (payload: any) => {
      // 1. Create Campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("trade_marketing_campaigns" as any)
        .insert({
          name: payload.name,
          tenant_id: tenantId,
          company_id: companyId,
          media_id: payload.media_id,
          display_time: parseInt(payload.display_time),
          priority: parseInt(payload.priority),
          cooldown_seconds: parseInt(payload.cooldown_seconds),
          max_dispatches_per_minute: parseInt(payload.max_dispatches_per_minute)
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Create Rules (EANs)
      const eans = payload.eans.split("\n").map((e: string) => e.trim()).filter(Boolean);
      if (eans.length > 0) {
        const rulesToInsert = eans.map((ean: string) => ({
          trade_campaign_id: (campaign as any).id,
          ean: ean
        }));

        const { error: rulesError } = await supabase
          .from("trade_marketing_rules" as any)
          .insert(rulesToInsert);

        if (rulesError) throw rulesError;
      }

      return campaign;
    },
    onSuccess: () => {
      toast.success("Regra de Trade criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["trade-marketing-campaigns"] });
      setIsDialogOpen(false);
      setFormData({
        name: "",
        media_id: "",
        eans: "",
        display_time: "10",
        priority: "1",
        cooldown_seconds: "60",
        max_dispatches_per_minute: "3"
      });
    },
    onError: (err: any) => {
      toast.error(`Erro ao criar regra: ${err.message}`);
    }
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trade_marketing_campaigns" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha excluída!");
      queryClient.invalidateQueries({ queryKey: ["trade-marketing-campaigns"] });
    }
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade Marketing Inteligente</h1>
          <p className="text-muted-foreground">Configure disparos automáticos de mídia baseados em consultas EAN.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova Regra de Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] bg-[#1a1a1e] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Configurar Regra de Disparo</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input 
                  id="name" 
                  placeholder="Ex: Coca-Cola Maio" 
                  className="bg-black/40 border-white/10"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid gap-2">
                <Label>Vincular Mídia Promocional</Label>
                <Select onValueChange={val => setFormData({...formData, media_id: val})}>
                  <SelectTrigger className="bg-black/40 border-white/10">
                    <SelectValue placeholder="Selecione uma mídia..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1e] border-white/10 text-white">
                    {Array.isArray(medias) && medias.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="eans">EANs Relacionados (um por linha)</Label>
                <Textarea 
                  id="eans" 
                  placeholder="Cole aqui a lista de códigos de barra..." 
                  className="bg-black/40 border-white/10 h-32"
                  value={formData.eans}
                  onChange={e => setFormData({...formData, eans: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="display">Tempo em Tela (s)</Label>
                  <Input 
                    id="display" 
                    type="number" 
                    className="bg-black/40 border-white/10"
                    value={formData.display_time}
                    onChange={e => setFormData({...formData, display_time: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Prioridade (1-10)</Label>
                  <Input 
                    id="priority" 
                    type="number" 
                    className="bg-black/40 border-white/10"
                    value={formData.priority}
                    onChange={e => setFormData({...formData, priority: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="border-white/10"
              >
                Cancelar
              </Button>
              <Button 
                onClick={() => createRule.mutate(formData)}
                disabled={createRule.isPending}
              >
                {createRule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Regra
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns?.map((c: any) => (
            <Card key={c.id} className="bg-card/40 border-white/5 overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">{c.name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/20 hover:text-red-500"
                    onClick={() => deleteCampaign.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-white/40 uppercase font-black">
                  <Megaphone className="h-3 w-3 text-primary" />
                  {c.trade_marketing_rules?.length || 0} EANs Vinculados
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/40 rounded-lg p-2 flex flex-col gap-1">
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Display</span>
                    <span className="text-sm font-mono font-bold text-primary">{c.display_time}s</span>
                  </div>
                  <div className="bg-black/40 rounded-lg p-2 flex flex-col gap-1">
                    <span className="text-[10px] text-white/20 font-bold uppercase tracking-wider">Prioridade</span>
                    <span className="text-sm font-mono font-bold text-amber-500">P{c.priority}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${c.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-white/20'}`} />
                    <span className="text-xs font-bold uppercase text-white/40">{c.is_active ? 'Ativa' : 'Inativa'}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-black gap-1.5 hover:bg-white/5">
                    <Settings2 className="h-3 w-3" /> Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {campaigns?.length === 0 && (
            <div className="col-span-full bg-black/20 border-2 border-dashed border-white/5 rounded-3xl p-12 text-center flex flex-col items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Nenhuma regra de trade</h3>
                <p className="text-sm text-white/40 max-w-[300px]">Crie mídias que disparam automaticamente ao consultar produtos específicos.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
