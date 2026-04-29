import { useEffect, useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GroupTreeView, TreeNode } from "@/components/GroupTreeView";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-playlist-data";
import { DeviceAvailablePanel } from "@/components/DeviceAvailablePanel";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Monitor, Edit2, History, Store, Check, Search, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { usePlaylists } from "@/hooks/use-playlist-data";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function GroupsPage() {
  const { data: tenantId } = useTenant();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUpdatingPlaylist, setIsUpdatingPlaylist] = useState(false);
  const { data: playlists } = usePlaylists();
  
  // Create Group Modal State
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const [selectedDevices, setSelectedDevices] = useState<Set<number>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDevice, setActiveDevice] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchTreeData = async () => {
    // console.log("Fetching tree data for tenant:", tenantId);
    if (!tenantId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_groups_hierarchy', { 
        p_tenant_id: tenantId 
      });

      if (error) throw error;

      const nodes = (data as any[]) || [];
      console.log("Raw hierarchy nodes from DB:", nodes);

      // Transform recursive flat list into tree structure
      const buildTree = (allNodes: any[], parentId: string | null = null): TreeNode[] => {
        return allNodes
          .filter(node => {
            // Se for store ou device_group, o parent_id é retornado como string pela query
            // Se for store_group (da tabela groups), o parent_id é UUID
            return node.parent_id === parentId || (parentId === null && !node.parent_id);
          })
          .map(node => ({
            id: node.id,
            name: node.name,
            type: node.type as TreeNode['type'],
            playlist_id: node.resolved_playlist_id,
            playlist_name: node.playlist_name,
            inherited_from: node.inherited_from_name,
            has_override: node.playlist_id !== null && node.inherited_from_name !== null,
            device_count: parseInt(node.device_count || "0"),
            children: buildTree(allNodes, node.id)
          }));
      };

      const tree = buildTree(nodes);
      console.log("Built tree structure:", tree);
      setTreeData(tree);
    } catch (error) {
      console.error("Error loading tree data:", error);
      toast.error("Erro ao carregar hierarquia de grupos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreeData();
    
    // Setup Realtime connection
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => fetchTreeData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => fetchTreeData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const handleNodeClick = (node: TreeNode) => {
    setSelectedNode(node);
    setIsSidebarOpen(true);
  };

  const handleMoveNode = async (nodeId: string, newParentId: string) => {
    if (!tenantId) return;
    
    try {
      // Identificar o tipo do nó e do destino para decidir como mover
      const allNodes = (treeData: TreeNode[]): TreeNode[] => {
        let nodes: TreeNode[] = [];
        treeData.forEach(n => {
          nodes.push(n);
          if (n.children) nodes.push(...allNodes(n.children));
        });
        return nodes;
      };
      
      const flatNodes = allNodes(treeData);
      const movingNode = flatNodes.find(n => n.id === nodeId);
      const targetNode = flatNodes.find(n => n.id === newParentId);
      
      if (!movingNode || !targetNode) return;
      
      // Regras de negócio para o Drag & Drop
      // 1. Loja (store) pode ir para dentro de Store Group (group)
      if (movingNode.type === 'store' && targetNode.type === 'store_group') {
        const { error } = await supabase
          .from("group_stores")
          .upsert({ group_id: targetNode.id, store_id: movingNode.id });
        if (error) throw error;
      } 
      // 2. Grupo de Dispositivos pode ir para outra Loja
      else if (movingNode.type === 'device_group' && targetNode.type === 'store') {
        const { error } = await supabase
          .from("device_groups")
          .update({ store_id: targetNode.id } as any)
          .eq("id", movingNode.id);
        if (error) throw error;
      }
      // 3. Store Group pode ir para dentro de outro Store Group
      else if (movingNode.type === 'store_group' && targetNode.type === 'store_group' && movingNode.id !== targetNode.id) {
        const { error } = await supabase
          .from("groups")
          .update({ parent_id: targetNode.id } as any)
          .eq("id", movingNode.id);
        if (error) throw error;
      } else {
        toast.info("Movimentação não permitida para estes tipos de grupos.");
        return;
      }

      toast.success("Hierarquia atualizada!");
      fetchTreeData();
    } catch (error: any) {
      console.error("Error moving node:", error);
      toast.error("Erro ao mover grupo: " + error.message);
    }
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveId(active.id);
    if (active.data.current?.type === 'device') {
      setActiveDevice(active.data.current.device);
    }
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDevice(null);

    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Se estiver movendo um grupo (comportamento original)
    if (activeType !== 'device') {
      if (active.id !== over.id) {
        handleMoveNode(active.id, over.id);
      }
      return;
    }

    // Se estiver soltando um dispositivo em um grupo
    if (activeType === 'device') {
      const targetNode = over.data.current?.node;
      const isDroppingInPanel = over.data.current?.type === 'available-panel';

      const getDeviceId = (id: string) => {
        if (typeof id === 'string' && id.startsWith('device-')) {
          return parseInt(id.replace('device-', ''));
        }
        return parseInt(id);
      };

      const activeDeviceId = active.data.current?.device?.id || getDeviceId(active.id as string);

      const devicesToMove = selectedDevices.has(activeDeviceId)
        ? Array.from(selectedDevices)
        : [activeDeviceId];

      try {
        let updateData: any = {};
        
        if (isDroppingInPanel) {
          // Remover do grupo/loja
          updateData = { num_filial: null, grupo_dispositivos: null };
        } else if (targetNode?.type === 'store') {
          const { data: store } = await supabase
            .from("stores")
            .select("code")
            .eq("id", targetNode.id)
            .single();
          
          if (store) {
            updateData = { num_filial: store.code, grupo_dispositivos: null };
          }
        } else if (targetNode?.type === 'device_group') {
          const { data: dg } = await supabase
            .from("device_groups")
            .select("id, store_id, stores(code)")
            .eq("id", targetNode.id)
            .single();
          
          if (dg) {
            updateData = { 
              grupo_dispositivos: dg.id, 
              num_filial: (dg.stores as any)?.code || null 
            };
          }
        } else {
          toast.info("Por favor, solte o dispositivo em uma Loja, Grupo de Dispositivos ou no painel lateral.");
          return;
        }

        const { error } = await supabase
          .from("dispositivos")
          .update(updateData)
          .in("id", devicesToMove);

        if (error) throw error;

        toast.success(`${devicesToMove.length} dispositivo(s) atualizado(s) com sucesso!`);
        setSelectedDevices(new Set());
        fetchTreeData();
      } catch (error: any) {
        console.error("Error moving devices:", error);
        toast.error("Erro ao atualizar dispositivos: " + error.message);
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !tenantId) return;
    
    setIsCreatingGroup(true);
    try {
      const { error } = await supabase
        .from("groups")
        .insert({
          name: newGroupName,
          tenant_id: tenantId,
          parent_id: null
        } as any);

      if (error) throw error;

      toast.success("Novo grupo pai criado!");
      setIsCreateDialogOpen(false);
      setNewGroupName("");
      fetchTreeData();
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error("Erro ao criar grupo: " + error.message);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleUpdatePlaylist = async (playlistId: string | null) => {
    if (!selectedNode || !tenantId) return;
    
    setIsUpdatingPlaylist(true);
    try {
      let query: any;
      if (selectedNode.type === "store_group") {
        query = supabase.from("groups").update({ playlist_id: playlistId } as any).eq("id", selectedNode.id);
      } else if (selectedNode.type === "store") {
        query = supabase.from("stores").update({ playlist_id: playlistId } as any).eq("id", selectedNode.id);
      } else if (selectedNode.type === "device_group") {
        query = supabase.from("device_groups").update({ channel_id: playlistId } as any).eq("id", selectedNode.id);
      }

      if (!query) throw new Error("Tipo de nó desconhecido");

      const { error } = await query;

      if (error) throw error;

      toast.success("Playlist atualizada com sucesso!");
      
      // Update local state for immediate feedback
      const playlistName = playlistId 
        ? playlists?.find(p => p.id === playlistId)?.name || "Nova Playlist" 
        : null;
        
      setSelectedNode({
        ...selectedNode,
        playlist_id: playlistId,
        playlist_name: playlistName,
        // When updating directly, it becomes a local override unless we clear it
        inherited_from: null, 
        has_override: playlistId !== null
      });

      // Refetch full tree to resolve cascading inheritance
      fetchTreeData();
    } catch (error: any) {
      console.error("Error updating playlist:", error);
      toast.error("Erro ao atualizar playlist: " + error.message);
    } finally {
      setIsUpdatingPlaylist(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader
        title="Hierarquia de Grupos"
        description="Visualize e gerencie a distribuição de conteúdos através da árvore de herança."
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
          {/* Main Tree View */}
          <div className="flex-[3] min-w-0 h-full">
            <GroupTreeView 
              data={treeData} 
              onNodeClick={handleNodeClick}
              onEditPlaylist={(node) => {
                setSelectedNode(node);
                setIsSidebarOpen(true);
              }}
              onCreateGroup={() => setIsCreateDialogOpen(true)}
              onMoveNode={handleMoveNode}
              onRemoveDevice={async (id) => {
                try {
                  const { error } = await supabase
                    .from("dispositivos")
                    .update({ num_filial: null, grupo_dispositivos: null })
                    .eq("id", parseInt(id));
                  if (error) throw error;
                  toast.success("Dispositivo removido do grupo.");
                  fetchTreeData();
                } catch (error: any) {
                  toast.error("Erro ao remover: " + error.message);
                }
              }}
              activeId={activeId}
            />
          </div>

          {/* Available Devices Side Panel */}
          <div className="flex-1 min-w-[320px] max-w-[400px] h-full">
            <DeviceAvailablePanel 
              selectedIds={selectedDevices}
              onToggleSelection={(ids: number[]) => {
                const next = new Set(selectedDevices);
                ids.forEach((id: number) => {
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                });
                setSelectedDevices(next);
              }}
              onSelectAll={(ids) => setSelectedDevices(new Set(ids))}
              onClearSelection={() => setSelectedDevices(new Set())}
            />
          </div>
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeDevice ? (
            <div className="bg-[#085CF0] text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 border border-white/10">
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-bold">
                {selectedDevices.has(activeDevice.id) && selectedDevices.size > 1 
                  ? `${selectedDevices.size} dispositivos` 
                  : activeDevice.apelido_interno}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-[#09090b] border-white/5 text-white">
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo Pai</DialogTitle>
            <DialogDescription className="text-white/40">
              Grupos pais servem para organizar lojas e aplicar playlists em massa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Grupo</Label>
              <Input 
                id="name" 
                value={newGroupName} 
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex: Região Sul, Lojas de Shopping..."
                className="bg-black/40 border-white/10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateGroup} 
              disabled={isCreatingGroup}
              className="bg-[#085CF0] hover:bg-[#0750d4]"
            >
              {isCreatingGroup ? "Criando..." : "Criar Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-[#09090b] border-white/5 text-white">
          <SheetHeader className="border-b border-white/5 pb-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-[#085CF0]/10 text-[#085CF0]">
                {selectedNode?.type === 'store' ? <Store className="w-5 h-5" /> : 
                 selectedNode?.type === 'device' ? <Monitor className="w-5 h-5" /> :
                 <Layers className="w-5 h-5" />}
              </div>
              <div>
                <SheetTitle className="text-white text-xl">{selectedNode?.name}</SheetTitle>
                <SheetDescription className="text-white/40 uppercase text-[10px] font-bold tracking-widest">
                  {selectedNode?.type.replace('_', ' ')}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-black/40 border border-white/5">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="devices">Estrutura</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <h4 className="text-xs font-bold text-white/40 uppercase mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Playlist Ativa
                  </h4>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      {selectedNode?.playlist_id ? (
                        <>
                          <p className="text-lg font-bold text-white truncate">{selectedNode.playlist_name}</p>
                          <p className="text-xs text-[#085CF0]">
                            {selectedNode.inherited_from ? `Herdado de ${selectedNode.inherited_from}` : 'Definido localmente (Override)'}
                          </p>
                        </>
                      ) : (
                        <p className="text-white/20 italic">Nenhuma playlist vinculada</p>
                      )}
                    </div>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-white/40 hover:text-white shrink-0 h-10 w-10 bg-white/5">
                          {isUpdatingPlaylist ? <Layers className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 bg-[#18181b] border-white/10" align="end">
                        <Command className="bg-transparent">
                          <CommandInput placeholder="Buscar playlist..." className="text-white" />
                          <CommandList>
                            <CommandEmpty className="p-4 text-xs text-white/40">Nenhuma playlist encontrada.</CommandEmpty>
                            <CommandGroup heading="Ações">
                              <CommandItem
                                onSelect={() => handleUpdatePlaylist(null)}
                                className="text-red-400 focus:text-red-400 cursor-pointer"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Remover Playlist (Usar Herança)
                              </CommandItem>
                            </CommandGroup>
                            <CommandGroup heading="Playlists Disponíveis">
                              {playlists?.map((playlist) => (
                                <CommandItem
                                  key={playlist.id}
                                  onSelect={() => handleUpdatePlaylist(playlist.id)}
                                  className="text-white cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedNode?.playlist_id === playlist.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {playlist.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <h4 className="text-[10px] font-bold text-white/40 uppercase mb-1">Dispositivos</h4>
                    <p className="text-2xl font-bold">{selectedNode?.device_count || 0}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <h4 className="text-[10px] font-bold text-white/40 uppercase mb-1">Status</h4>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/20">Online</Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <Button 
                  className="w-full bg-[#085CF0] hover:bg-[#0750d4] text-white gap-2"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  Concluir
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="devices" className="text-center py-12">
              <Monitor className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40">Visualização de sub-itens em desenvolvimento...</p>
            </TabsContent>

            <TabsContent value="history" className="text-center py-12">
              <History className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40">Log de auditoria em desenvolvimento...</p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
