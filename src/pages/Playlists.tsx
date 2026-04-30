import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Play, 
  Copy, 
  Trash2, 
  MoreHorizontal,
  Clock,
  Layers,
  Loader2,
  LayoutGrid,
  List,
  AlertTriangle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { usePlaylists, useTenant } from "@/hooks/use-playlist-data";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { handlePlaylistError } from "@/utils/error-handlers";
import { PlaylistErrorBanner } from "@/components/PlaylistErrorBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { data: tenantId, isSuperAdmin, isLoading: isTenantLoading } = useTenant();
  const { data: playlistsData, isLoading: isPlaylistsLoading, isError, refetch } = usePlaylists(tenantId || undefined, isSuperAdmin);
  
  if (isError) {
    console.error("Error detected in usePlaylists within component");
  }
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("playlists-view-mode") as "grid" | "list") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("playlists-view-mode", viewMode);
  }, [viewMode]);

  const playlists = playlistsData || [];
  
  const filteredPlaylists = useMemo(() => {
    return playlists.filter(playlist => {
      const playlistName = playlist.name || "";
      const matchesSearch = playlistName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = 
        filterStatus === "all" ? true :
        filterStatus === "active" ? playlist.is_active :
        !playlist.is_active;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [playlists, searchQuery, filterStatus]);

  const isLoading = isTenantLoading || (isPlaylistsLoading && (!!tenantId || isSuperAdmin));

  const handleDelete = async () => {
    if (!playlistToDelete) return;
    setIsDeleting(true);
    try {
      // 1. Delete items first due to FK
      await supabase.from("playlist_items").delete().eq("playlist_id", playlistToDelete);
      
      // 2. Delete playlist
      const { error } = await supabase.from("playlists").delete().eq("id", playlistToDelete);
      
      if (error) throw error;
      
      toast.success("Playlist excluída com sucesso");
      refetch();
    } catch (error: any) {
      handlePlaylistError(error, "Excluir playlist");
    } finally {
      setIsDeleting(false);
      setPlaylistToDelete(null);
    }
  };

  const handleDuplicate = async (playlist: any) => {
    try {
      toast.loading("Duplicando playlist...");
      
      // 1. Ensure we have a company_id
      let companyId = playlist.company_id;
      
      if (!companyId) {
        console.log("Playlist source missing company_id, fetching from tenant:", playlist.tenant_id);
        const { data: companyData } = await supabase
          .from("companies")
          .select("id")
          .eq("tenant_id", playlist.tenant_id)
          .limit(1)
          .maybeSingle();
        
        if (companyData) {
          companyId = companyData.id;
        } else {
          throw new Error("Não foi possível identificar a empresa para duplicar a playlist.");
        }
      }

      // 2. Create new playlist record
      const { data: newPlaylist, error: pError } = await supabase
        .from("playlists")
        .insert({
          name: `${playlist.name} (Cópia)`,
          tenant_id: playlist.tenant_id,
          company_id: companyId,
          is_active: playlist.is_active
        })
        .select()
        .single();
        
      if (pError) {
        if (pError.code === '23502' && pError.message.includes('company_id')) {
          throw new Error("Erro de integridade: A empresa (company_id) é obrigatória e não foi encontrada.");
        }
        throw pError;
      }

      // 2. Fetch original items
      const { data: items, error: iError } = await supabase
        .from("playlist_items")
        .select("*")
        .eq("playlist_id", playlist.id);
        
      if (iError) throw iError;

      // 3. Insert duplicated items
      if (items && items.length > 0) {
        const duplicatedItems = items.map(item => ({
          ...item,
          id: undefined, // Let DB generate new UUID
          playlist_id: newPlaylist.id,
          created_at: undefined
        }));
        
        const { error: insError } = await supabase.from("playlist_items").insert(duplicatedItems);
        if (insError) throw insError;
      }

      toast.dismiss();
      toast.success("Playlist duplicada com sucesso!");
      refetch();
    } catch (error: any) {
      toast.dismiss();
      handlePlaylistError(error, "Duplicar playlist");
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Playlists"
        description="Gerencie as sequências de conteúdo que serão exibidas em seus dispositivos."
        actions={
          <Button 
            className="bg-gradient-primary shadow-glow h-9"
            onClick={() => navigate("/playlists/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Playlist
          </Button>
        }
      />

      <PlaylistErrorBanner error={isError ? "Erro ao carregar playlists. Verifique sua conexão." : null} onRetry={refetch} className="mb-0" />

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-card p-4 rounded-xl border border-border/60 shadow-sm sticky top-0 z-10">
        <div className="relative flex-1 w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-background/50 border-border/40 focus:bg-background"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex border rounded-lg p-1 bg-muted/30">
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "list" ? "secondary" : "ghost"} 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-1 bg-muted/30 p-1 rounded-lg border border-border/40">
            <Button 
              variant={filterStatus === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className="text-xs h-7 px-2"
            >
              Todas
            </Button>
            <Button 
              variant={filterStatus === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("active")}
              className="text-xs h-7 px-2"
            >
              Ativas
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border border-border/60 rounded-xl bg-card shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 bg-muted/40 animate-pulse rounded-xl border border-border/40" />
              ))}
            </div>
          ) : filteredPlaylists.length > 0 ? (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-4" 
              : "flex flex-col gap-3 pb-4"
            }>
              {filteredPlaylists.map((playlist) => {
                const itemsCount = (playlist as any).playlist_items?.length || 0;
                const updatedAt = playlist.updated_at 
                  ? format(new Date(playlist.updated_at), "dd 'de' MMM, HH:mm", { locale: ptBR })
                  : "Recém criada";

                return (
                  <Card 
                    key={playlist.id} 
                    className="group relative overflow-hidden border-border/60 bg-background/50 hover:border-primary/40 hover:bg-background/80 transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                  >
                    <CardContent className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                          <Layers className="h-5 w-5 text-primary opacity-70" />
                        </div>
                        <Badge variant={playlist.is_active ? "default" : "secondary"} className="text-[10px]">
                          {playlist.is_active ? 'ATIVA' : 'RASCUNHO'}
                        </Badge>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground/90 group-hover:text-primary transition-colors truncate">
                          {playlist.name}
                        </h3>
                        {(playlist as any).companies?.name && (
                          <p className="text-[10px] text-primary/70 font-bold uppercase tracking-wider">
                            {(playlist as any).companies.name}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" /> {updatedAt}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                            <Layers className="h-3 w-3" /> {itemsCount} Itens
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => handleDuplicate(playlist)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setPlaylistToDelete(playlist.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Layers className="h-10 w-10 opacity-20" />
              <p>Nenhuma playlist encontrada.</p>
              <Button variant="link" onClick={() => { setSearchQuery(""); setFilterStatus("all"); }}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!playlistToDelete} onOpenChange={(open) => !open && setPlaylistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta playlist? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
