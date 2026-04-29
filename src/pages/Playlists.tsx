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
  Layers
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { playlists, getMediaById } from "@/lib/mock-data";

export default function PlaylistsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Playlists"
        description="Gerencie as sequências de conteúdo que serão exibidas em seus dispositivos."
        actions={
          <Button 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20"
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
            className="pl-9 bg-background/50 border-border/50 focus:border-purple-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-background/50">Todas</Badge>
          <Badge variant="outline" className="text-muted-foreground hover:bg-background/80 cursor-pointer">Ativas</Badge>
          <Badge variant="outline" className="text-muted-foreground hover:bg-background/80 cursor-pointer">Inativas</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {playlists.map((playlist) => (
          <Card 
            key={playlist.id} 
            className="group overflow-hidden border-border/40 bg-card/40 backdrop-blur-sm hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/5 transition-all duration-300"
          >
            <div className="aspect-video relative overflow-hidden bg-muted">
              <div className="absolute inset-0 grid grid-cols-2 gap-1 p-1">
                {playlist.items.slice(0, 4).map((item, idx) => {
                  const media = getMediaById(item.mediaId);
                  return (
                    <div key={idx} className="relative rounded-sm overflow-hidden bg-black/20">
                      {media?.url ? (
                        <img 
                          src={media.url} 
                          alt="" 
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layers className="h-4 w-4 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                <div className="flex gap-2">
                  <Badge className="bg-purple-600/90 text-white border-none backdrop-blur-md">
                    {playlist.items.length} itens
                  </Badge>
                  <Badge variant="secondary" className="bg-black/40 text-white border-white/10 backdrop-blur-md flex gap-1">
                    <Clock className="h-3 w-3" />
                    {playlist.items.reduce((acc, curr) => acc + curr.duration, 0)}s
                  </Badge>
                </div>
                <Button 
                  size="icon" 
                  className="rounded-full bg-white/10 hover:bg-purple-600 text-white border border-white/20 backdrop-blur-md transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
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
                  <h3 className="font-display text-lg font-semibold group-hover:text-purple-400 transition-colors">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Atualizada em {playlist.updatedAt}
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
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-6 w-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${playlist.id}${i}`} alt="" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Vinculada a 3 dispositivos
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
