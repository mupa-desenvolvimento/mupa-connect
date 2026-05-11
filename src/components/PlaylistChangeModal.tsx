import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Layers, Loader2 } from "lucide-react";
import { usePlaylists } from "@/hooks/use-playlist-data";
import { useUserRole } from "@/hooks/use-user-role";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlaylistChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceIds: (string | number)[];
  onSuccess: () => void;
}

export function PlaylistChangeModal({ open, onOpenChange, deviceIds, onSuccess }: PlaylistChangeModalProps) {
  const { tenantId, companyId, isSuperAdmin } = useUserRole();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: playlists, isLoading: isLoadingPlaylists } = usePlaylists((companyId || tenantId) || undefined, isSuperAdmin);

  const handleSubmit = async () => {
    if (!selectedPlaylistId) {
      toast.error("Selecione uma playlist");
      return;
    }

    setIsSubmitting(true);
    try {
      const playlistValue = selectedPlaylistId === "none" ? null : selectedPlaylistId;
      
      let query = supabase
        .from("dispositivos")
        .update({ playlist_id: playlistValue })
        .in("id", deviceIds.map(id => Number(id)));

      if (!isSuperAdmin) {
        if (companyId) query = query.eq("company_id", companyId);
        else if (tenantId) query = query.eq("tenant_id", tenantId);
      }

      const { error } = await query;

      if (error) throw error;

      // Log the batch change
      if (deviceIds.length > 1) {
        await supabase.from("platform_logs").insert({
          level: "info",
          category: "device_management",
          message: `Playlist alterada em massa para ${deviceIds.length} dispositivos`,
          metadata: { deviceIds, playlistId: playlistValue }
        });
      }

      toast.success(
        deviceIds.length === 1 
          ? "Playlist do dispositivo atualizada!" 
          : `Playlist atualizada para ${deviceIds.length} dispositivos!`
      );
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating playlists:", error);
      toast.error(error.message || "Erro ao atualizar playlist");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-5 w-5 text-primary" />
            <DialogTitle>Alterar Playlist</DialogTitle>
          </div>
          <DialogDescription>
            {deviceIds.length === 1 
              ? "Escolha a nova playlist para este dispositivo." 
              : `Deseja alterar a playlist de ${deviceIds.length} dispositivos?`}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Playlist</Label>
            <Select onValueChange={setSelectedPlaylistId} value={selectedPlaylistId || ""}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingPlaylists ? "Carregando playlists..." : "Selecione uma playlist"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem Playlist (Tela Preta)</SelectItem>
                {playlists?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !selectedPlaylistId}
            className="bg-gradient-primary"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
