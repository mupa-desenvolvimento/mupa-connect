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
  Loader2
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

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { data: tenantId, isLoading: isTenantLoading } = useTenant();
  const { data: playlistsData, isLoading: isPlaylistsLoading } = usePlaylists(tenantId || undefined);
  
  // Transform data to ensure playlist_items is always an array if it was expected
  const playlists = playlistsData?.map(p => ({
    ...p,
    playlist_items: (p as any).playlist_items || []
  }));

  const isLoading = isTenantLoading || isPlaylistsLoading;

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#085CF0]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        description="Gerencie as sequências de conteúdo que serão exibidas em seus dispositivos."
        actions={
          <Button 
            className="bg-gradient-to-r from-[#085CF0] to-[#0a4fd1] hover:from-[#0750d4] hover:to-[#0a4fd1] text-white shadow-lg shadow-[#085CF0]/20"
            onClick={() => navigate("/playlists/new")}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Playlist
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar playlists..." 
            className="pl-9 bg-background/50 border-border/50 focus:border-[#085CF0]/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background/50">Todas</Badge>
          <Badge variant="outline" className="text-muted-foreground hover:bg-background/80 cursor-pointer">Ativas</Badge>
          <Badge variant="outline" className="text-muted-foreground hover:bg-background/80 cursor-pointer">Inativas</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {playlists?.filter(p => p.name).map((playlist) => {
          const itemsCount = playlist.playlist_items?.length || 0;
          const updatedAt = playlist.updated_at 
            ? format(new Date(playlist.updated_at), "dd 'de' MMMM", { locale: ptBR })
            : "Data desconhecida";

          return (
            <Card 
              key={playlist.id} 
              className="group overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm hover:border-[#085CF0]/40 hover:shadow-2xl hover:shadow-[#085CF0]/5 transition-all duration-300"
            >
              <div className="aspect-video relative overflow-hidden bg-muted">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Layers className="h-12 w-12 text-white/10 group-hover:text-[#085CF0]/20 transition-colors" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <div className="flex gap-2">
                    <Badge className="bg-[#085CF0]/90 text-white border-none backdrop-blur-md">
                      {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                    </Badge>
                    <Badge variant="secondary" className="bg-black/40 text-white border-white/10 backdrop-blur-md flex gap-1">
                      <Clock className="h-3 w-3" />
                      Status: {playlist.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  <Button 
                    size="icon" 
                    className="rounded-full bg-white/10 hover:bg-[#085CF0] text-white border border-white/20 backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    asChild
                  >
                    <Link to={`/playlists/${playlist.id}`}>
                      <Play className="h-4 w-4 fill-current" />
                    </Link>
                  </Button>
                </div>
              </div>
              
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold group-hover:text-[#3b82f6] transition-colors">
                      {playlist.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atualizada em {updatedAt}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => navigate(`/playlists/${playlist.id}`)}>
                        <Layers className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="h-4 w-4 mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mt-4">
                   <div className={`h-2 w-2 rounded-full ${playlist.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                   <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    {playlist.is_active ? 'Disponível para telas' : 'Rascunho'}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {playlists?.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-border/40 rounded-3xl">
             <Layers className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
             <h3 className="text-lg font-medium">Nenhuma playlist encontrada</h3>
             <p className="text-muted-foreground text-sm mb-6">Comece criando sua primeira sequência de conteúdos.</p>
             <Button 
                onClick={() => navigate("/playlists/new")}
                className="bg-[#085CF0] hover:bg-[#0750d4]"
              >
                Nova Playlist
              </Button>
          </div>
        )}
      </div>
    </div>
  );
}
