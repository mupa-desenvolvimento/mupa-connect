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
  Loader2,
  FileIcon,
  Video
} from "lucide-react";
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
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
  tenant_id: string;
}

export default function MediaPage() {
  const { tenantId, isLoading: isTenantLoading } = useTenant();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      if (tenantId) {
        setIsCheckingConsistency(true);
        // Consistência: Apenas logar se o usuário tem acesso, sem bloquear a UI se falhar
        const { data: hasAccess, error } = await supabase.rpc('is_member_of_tenant', {
          check_user_id: (await supabase.auth.getUser()).data.user?.id,
          check_tenant_id: tenantId
        });

        if (error || !hasAccess) {
          console.warn("User might not have explicit member record, but continuing as fallback:", error);
        }

        await Promise.all([fetchMedia(), fetchFolders()]);
        
        if (currentFolder) {
          updateFolderPath(currentFolder);
        } else {
          setFolderPath([]);
        }
        setIsCheckingConsistency(false);
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;

    setIsUploading(true);
    try {
      // Get company name for the folder structure
      const { data: empresaData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', tenantId)
        .single();

      const companyName = empresaData?.name || 'company';
      // Sanitize company name: lowercase and replace non-alphanumeric with underscore
      const sanitizedName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      // Pattern: Stok_Center_f822bf9d... (Nome_Empresa_UUID)
      const storagePath = `${companyName.replace(/ /g, '_')}_${tenantId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(storagePath);

      const type = file.type.startsWith('video') ? 'video' : 'image';

      const { error: dbError } = await supabase
        .from('media_items')
        .insert({
          name: file.name,
          type: type,
          file_url: publicUrl,
          file_size: file.size,
          folder_id: currentFolder,
          tenant_id: tenantId,
          status: 'ready'
        });

      if (dbError) throw dbError;

      toast.success("Arquivo enviado com sucesso!");
      fetchMedia();
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
      event.target.value = '';
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

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from('media_items').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Item excluído");
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

  return (
    <>
      <PageHeader
        title="Galeria de Mídias"
        description="Organize seus conteúdos por empresa. Armazenamento particionado com segurança."
        actions={
          <div className="flex gap-2">
            <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-1" /> Nova Pasta
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
                  />
                </div>
                <DialogFooter>
                  <Button onClick={createFolder}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="relative">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="bg-gradient-primary text-primary-foreground shadow-glow"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                {isUploading ? "Enviando..." : "Enviar mídia"}
              </Button>
            </div>
          </div>
        }
      />

      {isTenantLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg overflow-x-auto whitespace-nowrap">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setCurrentFolder(null)}
          className={!currentFolder ? "font-bold text-foreground" : ""}
        >
          <Folder className="h-4 w-4 mr-1" /> Galeria
        </Button>
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 mx-1 flex-shrink-0" />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentFolder(folder.id)}
              className={index === folderPath.length - 1 ? "font-bold text-foreground" : ""}
            >
              {folder.name}
            </Button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Folders */}
        {folders.map((folder) => (
          <Card 
            key={folder.id} 
            className="overflow-hidden group hover:shadow-elegant transition-shadow cursor-pointer"
            onClick={() => setCurrentFolder(folder.id)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Folder className="h-6 w-6 fill-current" />
                </div>
                <span className="font-medium truncate max-w-[120px]">{folder.name}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    className="text-destructive"
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

        {/* Media Items */}
        {items.map((m) => (
          <Card key={m.id} className="overflow-hidden group hover:shadow-elegant transition-shadow">
            <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
              {m.type === "image" ? (
                <img 
                  src={m.file_url} 
                  alt={m.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                  loading="lazy" 
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Video className="h-10 w-10" />
                  <span className="text-xs">Vídeo</span>
                </div>
              )}
              
              <div className="absolute top-2 right-2 flex gap-1">
                {m.type === "video" && (
                  <Badge variant="secondary" className="backdrop-blur bg-card/80 text-xs">
                    <Play className="h-3 w-3 mr-1" />
                    {m.duration || 0}s
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-7 w-7 backdrop-blur bg-card/80">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                        Visualizar
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => deleteItem(m.id)}
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <CardContent className="p-3">
              <div className="font-medium text-sm truncate" title={m.name}>{m.name}</div>
              <div className="text-xs text-muted-foreground flex items-center justify-between mt-1">
                <span>{formatSize(m.file_size)}</span>
                <span className="uppercase">{m.type}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {items.length === 0 && folders.length === 0 && !isLoading && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Nenhum arquivo ou pasta encontrado aqui.</p>
          </div>
        )}

        {isLoading && (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          </div>
        )}
      </div>
      </>
      )}
    </>
  );
}
