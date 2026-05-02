import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Store, Monitor, Plus, Settings2, Trash2 } from "lucide-react";
import { useStoreInternalGroups } from "@/hooks/use-store-internal-groups";
import { useDevices } from "@/hooks/use-devices";
import { PlaylistBadge } from "./PlaylistBadge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StoreCardProps {
  store: {
    id: string;
    name: string;
    code: string;
    playlist_id: string | null;
    playlist_name?: string;
    group_id?: string | null;
    group_name?: string | null;
  };
  playlists: any[];
  onRefresh: () => void;
}

export function StoreCard({ store, playlists, onRefresh }: StoreCardProps) {
  const { data: sectors, refetch: refetchSectors } = useStoreInternalGroups(store.id);
  const { data: allDevices, refetch: refetchDevices } = useDevices(null);
  const [isSectorDialogOpen, setIsSectorDialogOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [deleteSectorConfirm, setDeleteSectorConfirm] = useState<{ open: boolean, id: string, name: string }>({ open: false, id: "", name: "" });
  const normalize = (val: string | null | undefined) => {
    if (!val) return "";
    let normalized = val.replace(/FIL-/gi, "");
    normalized = normalized.replace(/\s+/g, "");
    normalized = normalized.replace(/^0+/, "");
    if (normalized === "" && val.trim() !== "") {
      const onlyDigits = val.replace(/[^0-9]/g, "");
      if (onlyDigits.match(/^0+$/)) return "0";
    }
    return normalized.toLowerCase();
  };

  // Filter devices belonging to this store using both UUID and normalized code fallback
  const storeDevices = allDevices?.filter(d => {
    // Priority 1: UUID link
    if (d.store_id === store.id) return true;
    
    // Priority 2: Normalized code match (Temporary fallback)
    const normalizedStoreCode = normalize(store.code);
    const normalizedDeviceFilial = normalize(d.num_filial);
    
    return normalizedStoreCode !== "" && normalizedStoreCode === normalizedDeviceFilial;
  }) || [];
  
  const devicesWithoutSector = storeDevices.filter(d => !d.internal_group_id);

  const handleStorePlaylistChange = async (playlistId: string) => {
    const value = playlistId === "none" ? null : playlistId;
    const { error } = await supabase
      .from("stores")
      .update({ playlist_id: value } as any)
      .eq("id", store.id);

    if (error) {
      toast.error("Erro ao atualizar playlist da loja");
    } else {
      toast.success("Playlist da loja atualizada");
      onRefresh();
    }
  };

  const handleCreateSector = async () => {
    if (!newSectorName.trim()) return;

    const { error } = await supabase
      .from("store_internal_groups")
      .insert({
        store_id: store.id,
        name: newSectorName
      } as any);

    if (error) {
      toast.error("Erro ao criar setor");
    } else {
      toast.success("Setor criado com sucesso!");
      setNewSectorName("");
      setIsSectorDialogOpen(false);
      refetchSectors();
    }
  };

  const handleDeleteSector = async (id: string) => {
    const { error } = await supabase
      .from("store_internal_groups")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir setor");
    } else {
      toast.success("Setor removido com sucesso");
      setDeleteSectorConfirm({ open: false, id: "", name: "" });
      refetchSectors();
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-white/5 hover:border-white/10 transition-all overflow-hidden group">
      <CardHeader className="p-4 pb-2 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{store.name}</CardTitle>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Código: {store.code}</p>
            </div>
          </div>
          <Badge variant="outline" className={devicesWithoutSector.length > 0 ? "text-yellow-500 border-yellow-500/20" : ""}>
            {storeDevices.length} PDVs
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Playlist da Loja</label>
          <Select defaultValue={store.playlist_id || "none"} onValueChange={handleStorePlaylistChange}>
            <SelectTrigger className="h-9 bg-white/5 border-white/10">
              <SelectValue placeholder="Selecione uma playlist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma (Sem reprodução)</SelectItem>
              {playlists.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Setores Internos</label>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCreateSector}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="space-y-1.5">
            {sectors?.map(sector => (
              <div key={sector.id} className="flex items-center justify-between p-2 rounded-md bg-white/5 border border-white/5 group/sector hover:bg-white/10 transition-colors">
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="text-sm font-medium truncate">{sector.name}</span>
                  <div className="flex items-center gap-2">
                    <PlaylistBadge 
                      playlistName={sector.playlist_name || store.playlist_name || null} 
                      isInherited={!sector.playlist_id}
                      inheritedFromName={!sector.playlist_id ? "Loja" : null}
                    />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> {sector.device_count}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/sector:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Settings2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteSector(sector.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {sectors?.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic text-center py-2">Nenhum setor definido</p>
            )}
          </div>
        </div>

        {devicesWithoutSector.length > 0 && (
          <div className="pt-2">
            <div className="p-2 rounded-md bg-yellow-500/5 border border-yellow-500/10 flex items-center justify-between">
              <span className="text-[11px] font-medium text-yellow-500/80">
                {devicesWithoutSector.length} PDVs sem setor
              </span>
              <Button variant="link" className="h-auto p-0 text-[11px] text-yellow-500 hover:text-yellow-400">
                Vincular
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
