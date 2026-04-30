import { useState, useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Play, 
  FolderPlus, 
  Folder, 
  MoreVertical, 
  Trash2, 
  ChevronRight,
  Recycle,
  Loader2,
  FileIcon,
  Video,
  Grid,
  List,
  Search,
  Filter,
  Copy,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/hooks/use-tenant";
import { MediaUpload } from "@/components/MediaUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

interface MediaItem {
  id: string;
  name: string;
  type: string;
  file_url: string;
  duration: number | null;
  file_size: number | null;
  folder_id: string | null;
  thumbnail_url: string | null;
  tenant_id: string;
  created_at: string;
  auto_delete: boolean;
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  tenant_id: string;
}

export default function MediaPage() {
  const { tenantId, isLoading: isTenantLoading } = useTenant();
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  // New States
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");

  useEffect(() => {
    const initPage = async () => {
      if (tenantId) {
        await Promise.all([fetchMedia(), fetchFolders()]);
        
        if (currentFolder) {
          updateFolderPath(currentFolder);
        } else {
          setFolderPath([]);
        }
      } else if (!isTenantLoading) {
        setIsLoading(false);
      }
    };

    initPage();
  }, [currentFolder, tenantId, isTenantLoading]);

  const updateFolderPath = async (folderId: string) => {
    const path: FolderItem[] = [];
    let currentId: string | null = folderId;
    
    while (currentId) {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', currentId)
        .single();
      
      if (data && !error) {
        path.unshift(data);
        currentId = data.parent_id;
      } else {
        currentId = null;
      }
    }
    setFolderPath(path);
  };

  const fetchMedia = async () => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    
    let query = supabase
      .from("media_items")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    if (currentFolder) {
      query = query.eq("folder_id", currentFolder);
    } else {
      query = query.is("folder_id", null);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar mídias: " + error.message);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const fetchFolders = async () => {
    if (!tenantId) return;
    
    let query = supabase
      .from("folders")
      .select("*")
      .order("name");

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    if (currentFolder) {
      query = query.eq("parent_id", currentFolder);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query;
    if (!error) {
      setFolders(data || []);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !tenantId) return;

    const { error } = await supabase
      .from('folders')
      .insert({
        name: newFolderName,
        parent_id: currentFolder,
        tenant_id: tenantId
      });

    if (error) {
      toast.error("Erro ao criar pasta: " + error.message);
    } else {
      toast.success("Pasta criada!");
      setNewFolderName("");
      setIsFolderDialogOpen(false);
      fetchFolders();
    }
  };

  const toggleAutoDelete = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('media_items')
      .update({ auto_delete: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error("Erro ao atualizar auto exclusão: " + error.message);
    } else {
      toast.success(currentStatus ? "Auto exclusão desativada" : "Auto exclusão ativada");
      fetchMedia();
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Deseja mover esta mídia para a lixeira? Ela poderá ser recuperada em até 30 dias.")) return;

    const { error } = await supabase
      .from('media_items')
      .update({ deleted_at: new Date().toISOString(), deleted_by: (await supabase.auth.getUser()).data.user?.id })
      .eq('id', id);

    if (error) {
      toast.error("Erro ao mover para lixeira: " + error.message);
    } else {
      await supabase.rpc('log_media_trash_action', { p_media_id: id, p_action: 'deleted' });
      toast.success("Mídia movida para a lixeira");
      fetchMedia();
    }
  };

  const deleteFolder = async (id: string) => {
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir pasta (verifique se está vazia): " + error.message);
    } else {
      toast.success("Pasta excluída");
      fetchFolders();
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || item.type === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return (b.file_size || 0) - (a.file_size || 0);
      return 0;
    });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada!");
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <PageHeader
        title="Galeria de Mídias"
        description="Organize e otimize seus conteúdos com foco em performance."
        actions={
          <div className="flex gap-2">
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <FolderPlus className="h-4 w-4 mr-2" /> Nova Pasta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Pasta</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="folderName">Nome da Pasta</Label>
                  <Input 
                    id="folderName" 
                    value={newFolderName} 
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Ex: Promoções de Maio"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={createFolder}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" className="h-9" onClick={() => navigate("/midias/lixeira")}>
              <Recycle className="h-4 w-4 mr-2" /> Lixeira
            </Button>

            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground shadow-glow h-9" size="sm">
                  <Upload className="h-4 w-4 mr-2" /> Enviar mídias
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload de Mídias</DialogTitle>
                </DialogHeader>
                <MediaUpload 
                  tenantId={tenantId} 
                  currentFolderId={currentFolder} 
                  onUploadComplete={fetchMedia}
                  onClose={() => setIsUploadDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-xl border border-border/40 backdrop-blur-md">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar mídias..." 
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="image">Imagens</SelectItem>
              <SelectItem value="video">Vídeos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recente</SelectItem>
              <SelectItem value="name">Nome (A-Z)</SelectItem>
              <SelectItem value="size">Tamanho</SelectItem>
            </SelectContent>
          </Select>

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
      </div>

      <div className="flex items-center text-xs font-medium text-muted-foreground bg-muted/20 p-2 rounded-xl border border-border/40 overflow-x-auto whitespace-nowrap sticky top-0 z-10 backdrop-blur-md">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setCurrentFolder(null)}
          className={cn("h-7 text-[11px]", !currentFolder ? "bg-background shadow-sm text-foreground" : "")}
        >
          <Folder className="h-3.5 w-3.5 mr-1.5 opacity-70" /> Galeria
        </Button>
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 mx-1 opacity-40 flex-shrink-0" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentFolder(folder.id)}
              className={cn("h-7 text-[11px]", index === folderPath.length - 1 ? "bg-background shadow-sm text-foreground" : "")}
            >
              {folder.name}
            </Button>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pb-4">
            {folders.map((folder) => (
              <Card 
                key={folder.id} 
                className="overflow-hidden group hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer border-border/60 shadow-sm"
                onClick={() => setCurrentFolder(folder.id)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary border border-primary/10">
                      <Folder className="h-5 w-5 fill-current opacity-70" />
                    </div>
                    <span className="font-semibold text-sm truncate text-foreground/80">{folder.name}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        className="text-destructive cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}

            {filteredItems.map((m) => (
              <Card key={m.id} className="overflow-hidden group hover:border-primary/40 hover:shadow-md transition-all border-border/60 bg-background/50 flex flex-col">
                <div className="aspect-video bg-muted/30 relative overflow-hidden flex items-center justify-center border-b border-border/40">
                  {m.type === "image" ? (
                    <img 
                      src={m.file_url} 
                      alt={m.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      loading="lazy" 
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground opacity-40">
                      <Video className="h-8 w-8" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Vídeo</span>
                    </div>
                  )}
                  
                  <div className="absolute top-2 right-2 flex gap-1 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-7 w-7 backdrop-blur bg-background/80 border-border/40 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4 mr-2" /> Visualizar
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => copyUrl(m.file_url)}>
                          <Copy className="h-4 w-4 mr-2" /> Copiar URL
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => toggleAutoDelete(m.id, m.auto_delete)}>
                          <Trash2 className={cn("h-4 w-4 mr-2", m.auto_delete ? "text-primary fill-primary/10" : "text-muted-foreground")} />
                          {m.auto_delete ? "Desativar Auto Exclusão" : "Ativar Auto Exclusão"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive cursor-pointer"
                          onClick={() => deleteItem(m.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Mover para lixeira
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {m.type === "video" && (
                    <div className="absolute bottom-2 left-2 z-20">
                      <Badge variant="secondary" className="backdrop-blur bg-background/80 text-[9px] font-mono border-border/40 py-0 h-5">
                        {m.duration || 0}s
                      </Badge>
                    </div>
                  )}

                  {m.auto_delete && (
                    <div className="absolute bottom-2 right-2 z-20">
                      <Badge variant="destructive" className="text-[8px] px-1 h-4 uppercase tracking-tighter">
                        Auto Excluir
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="font-semibold text-xs truncate text-foreground/80" title={m.name}>{m.name}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-1 font-mono uppercase tracking-tighter">
                    <span>{formatSize(m.file_size)}</span>
                    <span className="bg-muted px-1 rounded">{m.type}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-background border border-border/60 rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/60">
                  <TableHead className="w-[400px]">Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folders.map((folder) => (
                  <TableRow 
                    key={folder.id} 
                    className="group cursor-pointer border-border/40 hover:bg-muted/30"
                    onClick={() => setCurrentFolder(folder.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Folder className="h-4 w-4 text-primary fill-primary/10" />
                        <span>{folder.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">Pasta</TableCell>
                    <TableCell>--</TableCell>
                    <TableCell className="text-muted-foreground">--</TableCell>
                    <TableCell className="text-muted-foreground">--</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.map((m) => (
                  <TableRow key={m.id} className="group border-border/40 hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-12 rounded bg-muted/30 border border-border/40 overflow-hidden flex items-center justify-center">
                          {m.type === 'image' ? (
                            <img src={m.file_url} className="h-full w-full object-cover" alt="" />
                          ) : (
                            <Video className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium truncate max-w-[300px]" title={m.name}>{m.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px]">{m.type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">{formatSize(m.file_size)}</TableCell>
                    <TableCell>
                      {m.auto_delete ? (
                        <Badge variant="destructive" className="text-[9px]">Auto Exclusão</Badge>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyUrl(m.file_url)} title="Copiar URL">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn("h-8 w-8", m.auto_delete ? "text-primary" : "")}
                          onClick={() => toggleAutoDelete(m.id, m.auto_delete)}
                          title="Alternar auto exclusão"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Visualizar">
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                            <Play className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteItem(m.id)}
                          title="Mover para lixeira"
                        >
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

        {filteredItems.length === 0 && folders.length === 0 && !isLoading && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
              <FileIcon className="h-8 w-8 opacity-20" />
            </div>
            <p className="text-sm">Nenhum conteúdo encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
