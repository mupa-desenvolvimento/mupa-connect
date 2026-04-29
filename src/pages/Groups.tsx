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
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Monitor, Edit2, History } from "lucide-react";
import { toast } from "sonner";

export default function GroupsPage() {
  const { data: tenantId } = useTenant();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchTreeData = async () => {
    if (!tenantId) return;
    setLoading(true);
    
    try {
      // 1. Fetch Store Groups (assuming groups table for now based on exploration)
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select(`
          id, 
          name, 
          parent_id, 
          playlist_id,
          playlists:playlist_id (name)
        `)
        .eq("tenant_id", tenantId);

      if (groupsError) throw groupsError;

      // 2. Fetch Stores
      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select(`
          id, 
          name, 
          playlist_id,
          playlists:playlist_id (name),
          tenant_id
        `)
        .eq("tenant_id", tenantId);

      if (storesError) throw storesError;

      // 3. Fetch Device Groups
      const { data: deviceGroups, error: dgError } = await supabase
        .from("device_groups")
        .select(`
          id, 
          name, 
          store_id,
          tenant_id
        `)
        .eq("tenant_id", tenantId);

      if (dgError) throw dgError;

      // 4. Fetch Devices to count
      const { data: devices, error: devError } = await supabase
        .from("devices")
        .select("id, group_id, store_id");

      if (devError) throw devError;

      // Map to Tree Structure
      // Note: This is a simplified resolution for the V1 component.
      // In a production environment, this resolution would happen recursively or in the backend.
      
      const resolveNode = (node: any, type: any, parent: any = null): TreeNode => {
        const playlist = node.playlists || (parent?.playlist_id ? { name: parent.playlist_name, id: parent.playlist_id } : null);
        const inherited = !node.playlist_id && parent?.playlist_id;
        
        return {
          id: node.id,
          name: node.name,
          type,
          playlist_id: node.playlist_id || parent?.playlist_id,
          playlist_name: (node.playlists as any)?.name || (inherited ? parent.playlist_name : null),
          inherited_from: inherited ? parent.name : null,
          has_override: !!node.playlist_id && !!parent?.playlist_id,
          device_count: devices.filter(d => (type === 'store' ? d.store_id === node.id : d.group_id === node.id)).length,
          children: []
        };
      };

      // Transform raw data into the tree (Mocking hierarchy for visual impact if tables are flat)
      // Real implementation would use the parent_id / store_id relationships
      const rootGroups = groups.filter(g => !g.parent_id).map(g => {
        const node = resolveNode(g, 'store_group');
        // Add stores that belong to this group (if there's a mapping table, otherwise mock)
        node.children = stores.slice(0, 2).map(s => resolveNode(s, 'store', node));
        return node;
      });

      setTreeData(rootGroups.length > 0 ? rootGroups : [
        // Fallback for demo if DB is empty
        {
          id: 'root-1',
          name: 'Nacional - Lojas Próprias',
          type: 'store_group',
          playlist_id: 'p1',
          playlist_name: 'Campanha de Verão 2026',
          device_count: 145,
          children: [
            {
              id: 's-1',
              name: 'Loja Conceito - São Paulo',
              type: 'store',
              playlist_id: 'p1',
              playlist_name: 'Campanha de Verão 2026',
              inherited_from: 'Nacional - Lojas Próprias',
              device_count: 12,
              children: [
                {
                  id: 'dg-1',
                  name: 'Vitrine Principal',
                  type: 'device_group',
                  playlist_id: 'p2',
                  playlist_name: 'Ofertas Relâmpago SP',
                  has_override: true,
                  device_count: 4
                }
              ]
            },
            {
              id: 's-2',
              name: 'Loja Litoral - Santos',
              type: 'store',
              playlist_id: 'p3',
              playlist_name: 'Promoção Praia & Sol',
              has_override: true,
              device_count: 8
            }
          ]
        }
      ]);

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
