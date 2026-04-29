import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { GroupTreeView, TreeNode } from "@/components/GroupTreeView";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-playlist-data";
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
import { Layers, Monitor, Edit2, History, Store, Check, Search, X } from "lucide-react";
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

export default function GroupsPage() {
  const { data: tenantId } = useTenant();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUpdatingPlaylist, setIsUpdatingPlaylist] = useState(false);
  const { data: playlists } = usePlaylists(tenantId || undefined);

  const fetchTreeData = async () => {
    if (!tenantId) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('get_groups_hierarchy', { 
        p_tenant_id: tenantId 
      });

      if (error) throw error;

      const nodes = (data as any[]) || [];

      // Transform recursive flat list into tree structure
      const buildTree = (allNodes: any[], parentId: string | null = null): TreeNode[] => {
        return allNodes
          .filter(node => node.parent_id === parentId)
          .map(node => ({
            id: node.id,
            name: node.name,
            type: node.type as TreeNode['type'],
            playlist_id: node.resolved_playlist_id,
            playlist_name: node.playlist_name,
            inherited_from: node.inherited_from_name,
            has_override: node.playlist_id !== null && node.inherited_from_name !== null,
            device_count: node.device_count,
            children: buildTree(allNodes, node.id)
          }));
      };

      const tree = buildTree(nodes);
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

  return (
    <div className="h-full flex flex-col space-y-6">
      <PageHeader
        title="Hierarquia de Grupos"
        description="Visualize e gerencie a distribuição de conteúdos através da árvore de herança."
      />

      <div className="flex-1 min-h-0">
        <GroupTreeView 
          data={treeData} 
          onNodeClick={handleNodeClick}
          onEditPlaylist={(node) => {
            setSelectedNode(node);
            setIsSidebarOpen(true);
          }}
        />
      </div>

      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] bg-[#09090b] border-white/5 text-white">
          <SheetHeader className="border-b border-white/5 pb-6 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-[#085CF0]/10 text-[#085CF0]">
                {selectedNode?.type === 'store' ? <Store className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
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
              <TabsTrigger value="devices">Dispositivos</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <h4 className="text-xs font-bold text-white/40 uppercase mb-3 flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Playlist Ativa
                  </h4>
                  {selectedNode?.playlist_id ? (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-white">{selectedNode.playlist_name}</p>
                        <p className="text-xs text-[#085CF0]">
                          {selectedNode.inherited_from ? `Herdado de ${selectedNode.inherited_from}` : 'Definido localmente (Override)'}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="text-white/40 hover:text-white">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-white/20 italic">Nenhuma playlist vinculada</p>
                      <Button variant="link" className="text-[#085CF0] text-xs">Vincular agora</Button>
                    </div>
                  )}
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
                <Button className="w-full bg-[#085CF0] hover:bg-[#0750d4] text-white gap-2">
                  <Edit2 className="w-4 h-4" /> Editar Configurações
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="devices" className="text-center py-12">
              <Monitor className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/40">Visualização de dispositivos em desenvolvimento...</p>
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
