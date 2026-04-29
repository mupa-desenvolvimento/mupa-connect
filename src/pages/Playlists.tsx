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
  List
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { usePlaylists, useTenant } from "@/hooks/use-playlist-data";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { data: tenantId, isLoading: isTenantLoading } = useTenant();
  const { data: playlistsData, isLoading: isPlaylistsLoading } = usePlaylists(tenantId || undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    return (localStorage.getItem("playlists-view-mode") as "grid" | "list") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("playlists-view-mode", viewMode);
  }, [viewMode]);

  const playlists = playlistsData?.map(p => ({
    ...p,
    playlist_items: (p as any).playlist_items || []
  })) || [];
  
  console.log("Playlists processing:", { raw: playlistsData, processed: playlists });

  const filteredPlaylists = playlists.filter(playlist => {
    const matchesSearch = playlist.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      filterStatus === "all" ? true :
      filterStatus === "active" ? playlist.is_active :
      !playlist.is_active;
    return matchesSearch && matchesStatus;
  });

  const isLoading = isTenantLoading || isPlaylistsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-card/40 border border-border/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="Playlists"
        description="Gerencie as sequências de conteúdo que serão exibidas em seus dispositivos."
        actions={
          <Button 
            className="bg-[#085CF0] hover:bg-[#0750d4] text-white shadow-lg shadow-[#085CF0]/20 transition-all hover:scale-105"
            onClick={() => navigate("/playlists/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Playlist
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/30 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input 
            placeholder="Buscar por nome..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-black/20 border-white/10 focus:border-[#085CF0]/50 transition-all text-white placeholder:text-white/20"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setViewMode("grid")}
              className={`h-8 w-8 ${viewMode === "grid" ? 'bg-[#085CF0] text-white' : 'text-white/40'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 ${viewMode === "list" ? 'bg-[#085CF0] text-white' : 'text-white/40'}`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
            <Button 
              variant={filterStatus === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className={`text-xs h-8 ${filterStatus === "all" ? 'bg-[#085CF0] text-white' : 'text-white/60'}`}
            >
              Todas
            </Button>
            <Button 
              variant={filterStatus === "active" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("active")}
              className={`text-xs h-8 ${filterStatus === "active" ? 'bg-[#085CF0] text-white' : 'text-white/60'}`}
            >
              Ativas
            </Button>
            <Button 
              variant={filterStatus === "inactive" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilterStatus("inactive")}
              className={`text-xs h-8 ${filterStatus === "inactive" ? 'bg-[#085CF0] text-white' : 'text-white/60'}`}
            >
              Inativas
            </Button>
          </div>
        </div>
      </div>

      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
        : "flex flex-col gap-3"
      }>
        {filteredPlaylists.map((playlist) => {
          const itemsCount = playlist.playlist_items?.length || 0;
          const updatedAt = playlist.updated_at 
            ? format(new Date(playlist.updated_at), "dd 'de' MMM, HH:mm", { locale: ptBR })
            : "Recém criada";

          if (viewMode === "list") {
            return (
              <Card 
                key={playlist.id} 
                className="group relative overflow-hidden border-white/5 bg-card/20 backdrop-blur-xl hover:border-[#085CF0]/40 hover:bg-card/30 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/playlists/${playlist.id}`)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[#085CF0]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#085CF0]/20 transition-colors">
                    <Layers className="h-6 w-6 text-[#085CF0]" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-white group-hover:text-[#085CF0] transition-colors truncate">
                      {playlist.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {updatedAt}
                      </span>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <Layers className="h-3 w-3" /> {itemsCount} Mídias
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={`${playlist.is_active ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'} backdrop-blur-md px-2 py-0.5 text-[10px]`}>
                      {playlist.is_active ? 'ATIVA' : 'RASCUNHO'}
                    </Badge>
                    
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-[#18181b] border-white/5 text-white">
                          <DropdownMenuItem onClick={() => navigate(`/playlists/${playlist.id}`)}>
                            <Layers className="h-4 w-4 mr-2" /> Editar Conteúdo
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 focus:text-red-400">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card 
              key={playlist.id} 
              className="group relative overflow-hidden border-white/5 bg-card/20 backdrop-blur-xl hover:border-[#085CF0]/40 hover:bg-card/30 transition-all duration-500 cursor-pointer"
              onClick={() => navigate(`/playlists/${playlist.id}`)}
            >
              <div className="aspect-video relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                  <Layers className="h-10 w-10 text-white/5 group-hover:text-[#085CF0]/30 transition-all transform group-hover:scale-110" />
                </div>
                
                <div className="absolute top-3 left-3 z-20">
                  <Badge className={`${playlist.is_active ? 'bg-green-500/20 text-green-400 border-green-500/20' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20'} backdrop-blur-md px-2 py-0.5 text-[10px]`}>
                    {playlist.is_active ? 'ATIVA' : 'RASCUNHO'}
                  </Badge>
                </div>

                <div className="absolute bottom-3 left-3 z-20 flex gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/80 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md border border-white/5">
                    <Layers className="h-3 w-3" /> {itemsCount} Mídias
                  </span>
                </div>
              </div>
              
              <CardContent className="p-5 relative z-20">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold text-white group-hover:text-[#085CF0] transition-colors truncate">
                      {playlist.name}
                    </h3>
                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase tracking-wider font-semibold">
                      <Clock className="h-3 w-3" />
                      {updatedAt}
                    </div>
                  </div>
                  
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-[#18181b] border-white/5 text-white">
                        <DropdownMenuItem onClick={() => navigate(`/playlists/${playlist.id}`)}>
                          <Layers className="h-4 w-4 mr-2" /> Editar Conteúdo
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="h-4 w-4 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-400 focus:text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>

              {/* Hover Effect Light */}
              <div className="absolute -inset-x-20 -top-20 h-40 w-40 bg-[#085CF0]/10 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </Card>
          );
        })}
        
        {filteredPlaylists.length === 0 && (
          <div className="col-span-full py-24 text-center border-2 border-dashed border-white/5 rounded-3xl bg-card/10">
             <div className="bg-[#085CF0]/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6">
               <Search className="h-8 w-8 text-[#085CF0]" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">
               {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma playlist criada'}
             </h3>
             <p className="text-white/40 text-sm mb-8 max-w-xs mx-auto">
               {searchQuery 
                ? `Não encontramos nada para "${searchQuery}". Tente outro termo.` 
                : 'Você ainda não possui sequências de conteúdo. Crie sua primeira agora!'}
             </p>
             {!searchQuery && (
               <Button 
                  onClick={() => navigate("/playlists/new")}
                  className="bg-[#085CF0] hover:bg-[#0750d4] text-white px-8"
                >
                  Criar Playlist
                </Button>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
