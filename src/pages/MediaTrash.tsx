import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  Loader2,
  FileIcon,
  Video,
  Clock,
  User,
  MoreVertical,
  Play,
  Grid,
  List,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/hooks/use-tenant";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MediaItem {
  id: string;
  name: string;
  type: string;
  file_url: string;
  file_size: number | null;
  deleted_at: string;
  deleted_by: string;
  created_at: string;
}

export default function MediaTrashPage() {
  const { tenantId, isLoading: isTenantLoading } = useTenant();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const navigate = useNavigate();

  const fetchTrashItems = async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("media_items")
      .select("*")
      .eq("tenant_id", tenantId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar lixeira: " + error.message);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (tenantId) fetchTrashItems();
  }, [tenantId]);

  const restoreItem = async (id: string) => {
    const { error } = await supabase
      .from("media_items")
      .update({ deleted_at: null, deleted_by: null })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao restaurar: " + error.message);
    } else {
      await supabase.rpc('log_media_trash_action', { p_media_id: id, p_action: 'restored' });
      toast.success("Mídia restaurada com sucesso!");
      fetchTrashItems();
    }
  };

  const permanentDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente? Esta ação não pode ser desfeita.")) return;

    // A lógica de remoção do storage deve ser tratada aqui ou via edge function
    const { error } = await supabase.from("media_items").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir permanentemente: " + error.message);
    } else {
      await supabase.rpc('log_media_trash_action', { p_media_id: id, p_action: 'permanent_deleted' });
      toast.success("Mídia removida permanentemente.");
      fetchTrashItems();
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Lixeira"
        description="Mídias deletadas são mantidas por até 30 dias antes da remoção definitiva."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate("/midias")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Galeria
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/40 backdrop-blur-md">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar na lixeira..." 
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex border rounded-lg p-0.5 bg-background">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
              <Trash2 className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-sm">Sua lixeira está vazia.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pb-4">
            {filteredItems.map((m) => (
              <Card key={m.id} className="overflow-hidden group hover:border-primary/40 transition-all border-border/60 bg-background/50 flex flex-col opacity-80">
                <div className="aspect-video bg-muted/30 relative overflow-hidden flex items-center justify-center border-b border-border/40">
                  {m.type === "image" ? (
                    <img src={m.file_url} alt={m.name} className="w-full h-full object-cover grayscale opacity-50" />
                  ) : (
                    <Video className="h-8 w-8 text-muted-foreground opacity-40" />
                  )}
                  
                  <div className="absolute top-2 right-2 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-7 w-7 backdrop-blur bg-background/80 border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => restoreItem(m.id)}>
                          <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => permanentDelete(m.id)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir permanentemente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="absolute inset-0 bg-background/20 backdrop-grayscale flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" onClick={() => restoreItem(m.id)}>
                      Restaurar
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="font-semibold text-xs truncate text-foreground/80">{m.name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(m.deleted_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Excluído em</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {m.type === 'image' ? <FileIcon className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                        {m.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(m.deleted_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs">{formatSize(m.file_size)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => restoreItem(m.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => permanentDelete(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
