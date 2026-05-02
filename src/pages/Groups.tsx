import { useState, useMemo, useCallback } from "react";
import { PageHeader } from "@/components/PageHeader";
import { DeviceAvailablePanel } from "@/components/DeviceAvailablePanel";
import { useTenant, usePlaylists } from "@/hooks/use-playlist-data";
import { useGroups } from "@/hooks/use-groups";
import { useStores } from "@/hooks/use-stores";
import { useDevices } from "@/hooks/use-devices";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Store, Plus, Search, Loader2, Package, Filter, Monitor } from "lucide-react";
import { GroupTreeNode } from "@/components/groups/GlobalGroupTree";
import { StoreCard } from "@/components/groups/StoreCard";
import { Input } from "@/components/ui/input";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";









export default function GroupsPage() {
  const { tenantId } = useTenant();

  const { data: playlists } = usePlaylists(tenantId || undefined);
  const { data: groups, isLoading: loadingGroups, refetch: refetchGroups } = useGroups(tenantId);
  const { data: stores, isLoading: loadingStores, refetch: refetchStores } = useStores(tenantId);
  const { data: devices, refetch: refetchDevices } = useDevices(tenantId);
  
  const [activeTab, setActiveTab] = useState("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  // Create/Edit Group Modal
  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    group?: any;
    parentId?: string | null;
  }>({ open: false, mode: 'create' });

  const [groupFormData, setGroupFormData] = useState({
    name: "",
    playlistMode: "inherit" as "inherit" | "custom",
    playlistId: ""
  });

  // Bulk Create Sector Modal
  const [bulkSectorModal, setBulkSectorModal] = useState({
    open: false,
    name: "",
    selectedStoreIds: [] as string[]
  });

  // Link Stores (Segmentation) Modal
  const [linkStoresModal, setLinkStoresModal] = useState({
    open: false,
    group: null as any,
    selectedStoreIds: [] as string[]
  });

  // Link Devices Modal
  const [linkDevicesModal, setLinkDevicesModal] = useState({
    open: false,
    group: null as any,
    selectedDeviceIds: [] as string[]
  });

  // Delete Confirmation State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    groupId: string;
    groupName: string;
    hasChildren: boolean;
    hasStores: boolean;
  }>({ open: false, groupId: "", groupName: "", hasChildren: false, hasStores: false });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // Cases:
    // 1. Device -> Group
    if (activeData.type === 'device' && overData.type === 'group') {
      const device = activeData.device;
      const group = overData.group;
      
      try {
        // Link device directly to group
        await supabase.from('group_devices').delete().eq('device_id', device.device_uuid);
        const { error } = await supabase.from('group_devices').insert({
          group_id: group.id,
          device_id: device.device_uuid,
          tenant_id: tenantId
        });
        
        if (error) throw error;
        toast.success(`${device.apelido_interno} vinculado ao grupo ${group.name}`);
        refetchGroups();
        refetchDevices();
      } catch (e: any) {
        toast.error("Erro ao vincular dispositivo: " + e.message);
      }
    }
    
    // 2. Device -> Store
    else if (activeData.type === 'device' && overData.type === 'store') {
      const device = activeData.device;
      const store = overData.store;
      
      try {
        // Update store_id of the device
        const { error } = await supabase
          .from('dispositivos')
          .update({ store_id: store.id } as any)
          .eq('device_uuid', device.device_uuid);
        
        if (error) throw error;
        toast.success(`${device.apelido_interno} movido para ${store.name}`);
        refetchDevices();
        refetchStores();
      } catch (e: any) {
        toast.error("Erro ao mover dispositivo: " + e.message);
      }
    }
    
    // 3. Store -> Group
    else if (activeData.type === 'store' && overData.type === 'group') {
      const store = activeData.store;
      const group = overData.group;
      
      try {
        // Link store to group
        await supabase.from('group_stores').delete().eq('store_id', store.id);
        const { error } = await supabase.from('group_stores').insert({
          group_id: group.id,
          store_id: store.id,
          tenant_id: tenantId
        });
        
        if (error) throw error;
        toast.success(`${store.name} vinculado ao grupo ${group.name}`);
        refetchGroups();
        refetchStores();
      } catch (e: any) {
        toast.error("Erro ao vincular loja: " + e.message);
      }
    }
  }, [tenantId, refetchGroups, refetchDevices, refetchStores]);

  const enrichedGroups = useMemo(() => {
    if (!groups) return [];
    const safeDevices = devices || [];
    const safeStores = stores || [];
    
    // Memoize descendant data for efficiency
    const memo = new Map<string, { storeIds: Set<string>, directDeviceIds: Set<string> }>();

    const getGroupDataRecursive = (groupId: string): { storeIds: Set<string>, directDeviceIds: Set<string> } => {
      if (memo.has(groupId)) return memo.get(groupId)!;

      const group = groups.find(g => g.id === groupId);
      if (!group) return { storeIds: new Set(), directDeviceIds: new Set() };

      const storeIds = new Set(group.linked_store_ids || []);
      const directDeviceIds = new Set(group.direct_device_ids || []);

      // Get children
      const children = groups.filter(g => g.parent_id === groupId);
      children.forEach(child => {
        const childData = getGroupDataRecursive(child.id);
        childData.storeIds.forEach(id => storeIds.add(id));
        childData.directDeviceIds.forEach(id => directDeviceIds.add(id));
      });

      const result = { storeIds, directDeviceIds };
      memo.set(groupId, result);
      return result;
    };

    const result = groups.map(group => {
      const { storeIds, directDeviceIds } = getGroupDataRecursive(group.id);

      // Recursive devices for total count
      const allGroupDevices = (devices || []).filter(d => {
        const isDirect = directDeviceIds.has(d.device_uuid);
        const isFromStoreId = !!(d.store_id && storeIds.has(d.store_id));
        
        return isDirect || isFromStoreId;
      });
      
      const uniqueRecursiveCount = new Set(allGroupDevices.map(d => d.id)).size;

      // Local devices for badges
      const localStoreIds = new Set(group.linked_store_ids || []);
      const localDirectDeviceIds = new Set(group.direct_device_ids || []);

      const localDevices = (devices || []).map(d => {
        const isDirect = localDirectDeviceIds.has(d.device_uuid);
        const isFromStoreId = !!(d.store_id && localStoreIds.has(d.store_id));
        
        if (isDirect || isFromStoreId) {
          return {
            ...d,
            origin: (isDirect ? 'direto' : 'loja') as 'direto' | 'loja'
          };
        }
        return null;
      }).filter((d): d is any => d !== null);


      // Deduplicate local devices
      const uniqueLocalDevicesMap = new Map();
      localDevices.forEach(d => {
        if (!uniqueLocalDevicesMap.has(d.id)) {
          uniqueLocalDevicesMap.set(d.id, d);
        } else {
          const existing = uniqueLocalDevicesMap.get(d.id);
          if (d.origin === 'direto' && existing.origin === 'loja') {
            uniqueLocalDevicesMap.set(d.id, d);
          }
        }
      });

      // Fallback: if group has NO devices and NO stores, 
      // check if it should show "free" devices (as a fallback behavior requested)
      let finalLocalDevices = Array.from(uniqueLocalDevicesMap.values());
      let finalRecursiveCount = uniqueRecursiveCount;

      if (finalRecursiveCount === 0 && !group.parent_id) {
        const freeDevices = (devices || []).filter(d => !d.grupo_dispositivos && !d.store_id);
        // Only apply fallback to groups that look like "General" or "Default" or if it's the only group
        if (freeDevices.length > 0 && (group.name.toLowerCase().includes("padrão") || groups.length === 1)) {
          finalLocalDevices = freeDevices.map(d => ({ ...d, origin: 'direto' }));
          finalRecursiveCount = freeDevices.length;
        }
      }

      return {
        ...group,
        devices: finalLocalDevices,
        device_count: finalRecursiveCount,
        store_count: storeIds.size
      };
    });
    return result;
  }, [groups, devices, stores]);

  const filteredGroups = useMemo(() => {
    if (!enrichedGroups) return [];
    if (!searchQuery) {
      const roots = enrichedGroups.filter(g => !g.parent_id || !enrichedGroups.some(pg => pg.id === g.parent_id));
      return roots;
    }
    const filtered = enrichedGroups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return filtered;
  }, [enrichedGroups, searchQuery]);

  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    if (!searchQuery) return stores;
    return stores.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stores, searchQuery]);

  const handleGroupAction = async (type: string, group: any) => {
    if (type === 'create') {
      setGroupFormData({ name: "", playlistMode: "inherit", playlistId: "" });
      setGroupModal({ open: true, mode: 'create', parentId: group.id });
    } else if (type === 'edit') {
      setGroupFormData({ 
        name: group.name, 
        playlistMode: group.playlist_id ? "custom" : "inherit", 
        playlistId: group.playlist_id || "" 
      });
      setGroupModal({ open: true, mode: 'edit', group });
    } else if (type === 'delete') {
      const children = groups?.filter(g => g.parent_id === group.id) || [];
      const storesLinked = group.linked_store_ids?.length > 0;
      setDeleteConfirm({
        open: true,
        groupId: group.id,
        groupName: group.name,
        hasChildren: children.length > 0,
        hasStores: storesLinked
      });
    } else if (type === 'stores') {
      // Fetch currently linked stores
      const { data } = await supabase.from("group_stores").select("store_id").eq("group_id", group.id);
      setLinkStoresModal({ 
        open: true, 
        group, 
        selectedStoreIds: (data || []).map(d => d.store_id) 
      });
    } else if (type === 'devices') {
      const { data } = await supabase.from("group_devices").select("device_id").eq("group_id", group.id);
      setDeviceSearchQuery("");
      setLinkDevicesModal({ 
        open: true, 
        group, 
        selectedDeviceIds: (data || []).map(d => d.device_id) 
      });
    }
  };

  const filteredLinkDevices = useMemo(() => {
    if (!devices) return [];
    if (!deviceSearchQuery) return devices;
    return devices.filter(d => 
      d.nome?.toLowerCase().includes(deviceSearchQuery.toLowerCase()) ||
      d.num_filial?.toLowerCase().includes(deviceSearchQuery.toLowerCase())
    );
  }, [devices, deviceSearchQuery]);

  const handleSaveStoreLinks = async () => {
    const groupId = linkStoresModal.group.id;
    try {
      // Simplistic sync: delete then insert
      await supabase.from("group_stores").delete().eq("group_id", groupId);
      if (linkStoresModal.selectedStoreIds.length > 0) {
        const inserts = linkStoresModal.selectedStoreIds.map(storeId => ({
          group_id: groupId,
          store_id: storeId,
          tenant_id: tenantId
        }));
        const { error } = await supabase.from("group_stores").insert(inserts as any);
        if (error) throw error;
      }
      toast.success("Vínculo de lojas atualizado!");
      setLinkStoresModal({ ...linkStoresModal, open: false });
      refetchGroups();
    } catch (e: any) {
      toast.error("Erro ao vincular lojas: " + e.message);
    }
  };

  const handleSaveDeviceLinks = async () => {
    const groupId = linkDevicesModal.group.id;
    try {
      await supabase.from("group_devices").delete().eq("group_id", groupId);
      if (linkDevicesModal.selectedDeviceIds.length > 0) {
        const inserts = linkDevicesModal.selectedDeviceIds.map(deviceId => ({
          group_id: groupId,
          device_id: deviceId,
          tenant_id: tenantId
        }));
        const { error } = await supabase.from("group_devices").insert(inserts as any);
        if (error) throw error;
      }
      toast.success("Vínculo de dispositivos atualizado!");
      setLinkDevicesModal({ ...linkDevicesModal, open: false });
      refetchGroups();
      refetchDevices();
    } catch (e: any) {
      toast.error("Erro ao vincular dispositivos: " + e.message);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupFormData.name.trim()) {
      toast.error("O nome do grupo é obrigatório");
      return;
    }

    const playlistId = groupFormData.playlistMode === 'custom' ? groupFormData.playlistId : null;
    
    try {
      if (groupModal.mode === 'create') {
        const { error } = await supabase.from("groups").insert({
          name: groupFormData.name,
          parent_id: groupModal.parentId,
          playlist_id: playlistId,
          tenant_id: tenantId
        } as any);
        if (error) throw error;
        toast.success("Grupo criado com sucesso!");
      } else {
        const { error } = await supabase.from("groups").update({
          name: groupFormData.name,
          playlist_id: playlistId
        } as any).eq("id", groupModal.group.id);
        if (error) throw error;
        toast.success("Grupo atualizado!");
      }
      setGroupModal({ ...groupModal, open: false });
      refetchGroups();
    } catch (e: any) {
      toast.error("Erro ao salvar grupo: " + e.message);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) throw error;
      toast.success("Grupo excluído com sucesso");
      refetchGroups();
    } catch (e: any) {
      toast.error("Erro ao excluir grupo: " + e.message);
    }
  };

  const handleBulkCreateSector = async () => {
    if (!bulkSectorModal.name.trim() || bulkSectorModal.selectedStoreIds.length === 0) {
      toast.error("Preencha o nome e selecione pelo menos uma loja");
      return;
    }

    try {
      const inserts = bulkSectorModal.selectedStoreIds.map(storeId => ({
        store_id: storeId,
        name: bulkSectorModal.name
      }));

      const { error } = await supabase.from("store_internal_groups").insert(inserts as any);
      if (error) throw error;

      toast.success(`Setor "${bulkSectorModal.name}" criado em ${inserts.length} lojas!`);
      setBulkSectorModal({ open: false, name: "", selectedStoreIds: [] });
      refetchStores();
    } catch (e: any) {
      toast.error("Erro na criação em massa: " + e.message);
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-xl border border-border/60 shadow-sm shrink-0">
        <PageHeader
          title="Gestão de Grupos"
          description="Administre a hierarquia global de lojas, setores e playlists de forma intuitiva."
        />
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-background/50 border-border/40 focus:bg-background"
            />
          </div>
          <Button 
            className="bg-gradient-primary shadow-glow h-10"
            onClick={() => {
              setGroupFormData({ name: "", playlistMode: "inherit", playlistId: "" });
              setGroupModal({ open: true, mode: 'create', parentId: null });
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      </div>

        <div className="flex-1 min-h-0 flex gap-6 overflow-hidden">
          <div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-hidden bg-card p-4 rounded-xl border border-border/60 shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="bg-background/50 border border-border/40 p-1 w-fit shrink-0">
                <TabsTrigger value="groups" className="gap-2 data-[state=active]:bg-primary">
                  <Globe className="w-4 h-4" /> Grupos Globais
                </TabsTrigger>
                <TabsTrigger value="stores" className="gap-2 data-[state=active]:bg-primary">
                  <Store className="w-4 h-4" /> Lojas & Setores
                </TabsTrigger>
              </TabsList>

              <TabsContent value="groups" className="flex-1 mt-4 border-t border-border/40 pt-4 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {loadingGroups ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : groups && groups.length > 0 ? (
                  <div className="space-y-1 pb-20">
                  {filteredGroups.map(group => (
                    <GroupTreeNode 
                      key={group.id} 
                      node={group} 
                      allGroups={enrichedGroups} 
                      allStores={stores || []}
                      allDevices={devices || []}
                      onAction={handleGroupAction}
                    />

                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                  <Package className="w-12 h-12 text-white/10 mb-4" />
                  <p className="text-white/40">Nenhum grupo global configurado</p>
                </div>
              )}
                </div>
              </TabsContent>

            <TabsContent value="stores" className="flex-1 mt-4 border-t border-border/40 pt-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" /> Listagem de Unidades
                </h3>
                <Button variant="outline" size="sm" className="h-8 border-white/10 hover:bg-white/5" onClick={() => setBulkSectorModal({ ...bulkSectorModal, open: true })}>
                  Criação em Massa (Setores)
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loadingStores ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredStores.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                    {filteredStores.map(store => (
                      <StoreCard 
                        key={store.id} 
                        store={store} 
                        playlists={playlists || []} 
                        onRefresh={refetchStores} 
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
                    <Store className="w-12 h-12 text-white/10 mb-4" />
                    <p className="text-white/40">Nenhuma loja encontrada</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Panel */}
        <div className="w-[340px] flex flex-col overflow-hidden bg-card p-4 rounded-xl border border-border/60 shadow-sm">
          <DeviceAvailablePanel 
            selectedIds={selectedDevices}
            onToggleSelection={(ids: string[]) => {
              const next = new Set(selectedDevices);
              ids.forEach((id: string) => {
                if (next.has(id)) next.delete(id);
                else next.add(id);
              });
              setSelectedDevices(next);
            }}
            onSelectAll={(ids) => setSelectedDevices(new Set(ids))}
            onClearSelection={() => setSelectedDevices(new Set())}
            onHighlightGroup={() => {}}
          />
        </div>
      </div>

      {/* Group Create/Edit Dialog */}
      <Dialog open={groupModal.open} onOpenChange={(o) => setGroupModal({ ...groupModal, open: o })}>
        <DialogContent className="bg-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{groupModal.mode === 'create' ? 'Criar Novo Grupo' : 'Editar Grupo'}</DialogTitle>
            <DialogDescription className="text-white/40">
              {groupModal.parentId ? 'Este grupo será criado como um subgrupo.' : 'Este será um grupo de nível superior.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Grupo</Label>
              <Input 
                id="name" 
                value={groupFormData.name} 
                onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-3">
              <Label>Configuração de Playlist</Label>
              <RadioGroup 
                value={groupFormData.playlistMode} 
                onValueChange={(v: any) => setGroupFormData({ ...groupFormData, playlistMode: v })}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer">
                  <RadioGroupItem value="inherit" id="inherit" />
                  <Label htmlFor="inherit" className="cursor-pointer">Herdar do Pai</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">Customizada</Label>
                </div>
              </RadioGroup>
            </div>

            {groupFormData.playlistMode === 'custom' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label>Selecionar Playlist</Label>
                <Select value={groupFormData.playlistId} onValueChange={(v) => setGroupFormData({ ...groupFormData, playlistId: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {playlists?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGroupModal({ ...groupModal, open: false })}>Cancelar</Button>
            <Button onClick={handleSaveGroup} className="bg-primary hover:bg-primary/90">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Sector Dialog */}
      <Dialog open={bulkSectorModal.open} onOpenChange={(o) => setBulkSectorModal({ ...bulkSectorModal, open: o })}>
        <DialogContent className="bg-card border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criação de Setores em Massa</DialogTitle>
            <DialogDescription>Crie um setor com o mesmo nome em múltiplas lojas simultaneamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Nome do Setor (ex: Padaria, Açougue)</Label>
              <Input 
                value={bulkSectorModal.name} 
                onChange={(e) => setBulkSectorModal({ ...bulkSectorModal, name: e.target.value })}
                placeholder="Digite o nome do setor..."
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Selecione as Lojas ({bulkSectorModal.selectedStoreIds.length} selecionadas)</Label>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0" 
                  onClick={() => {
                    if (bulkSectorModal.selectedStoreIds.length === stores?.length) {
                      setBulkSectorModal({ ...bulkSectorModal, selectedStoreIds: [] });
                    } else {
                      setBulkSectorModal({ ...bulkSectorModal, selectedStoreIds: stores?.map(s => s.id) || [] });
                    }
                  }}
                >
                  {bulkSectorModal.selectedStoreIds.length === stores?.length ? "Desmarcar Todas" : "Selecionar Todas"}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border border-white/10 rounded-md bg-white/5 custom-scrollbar">
                {stores?.map(store => (
                  <div key={store.id} className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded transition-colors">
                    <Checkbox 
                      id={`store-${store.id}`} 
                      checked={bulkSectorModal.selectedStoreIds.includes(store.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setBulkSectorModal({ ...bulkSectorModal, selectedStoreIds: [...bulkSectorModal.selectedStoreIds, store.id] });
                        } else {
                          setBulkSectorModal({ ...bulkSectorModal, selectedStoreIds: bulkSectorModal.selectedStoreIds.filter(id => id !== store.id) });
                        }
                      }}
                    />
                    <label htmlFor={`store-${store.id}`} className="text-sm font-medium leading-none cursor-pointer truncate">
                      {store.name} ({store.code})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkSectorModal({ ...bulkSectorModal, open: false })}>Cancelar</Button>
            <Button onClick={handleBulkCreateSector} className="bg-primary hover:bg-primary/90" disabled={!bulkSectorModal.name || bulkSectorModal.selectedStoreIds.length === 0}>
              Criar em {bulkSectorModal.selectedStoreIds.length} Lojas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Stores Dialog */}
      <Dialog open={linkStoresModal.open} onOpenChange={(o) => setLinkStoresModal({ ...linkStoresModal, open: o })}>
        <DialogContent className="bg-card border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> 
              Vincular Unidades ao Grupo: <span className="text-primary">{linkStoresModal.group?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-white/60">
              As unidades selecionadas herdarão dinamicamente as configurações e a playlist deste grupo. 
              Dispositivos vinculados a estas lojas responderão automaticamente a esta hierarquia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar lojas..." className="pl-9 bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto p-2 border border-white/10 rounded-md bg-white/5 custom-scrollbar">
              {stores?.map(store => (
                <div key={store.id} className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded transition-colors">
                  <Checkbox 
                    id={`link-store-${store.id}`} 
                    checked={linkStoresModal.selectedStoreIds.includes(store.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLinkStoresModal({ ...linkStoresModal, selectedStoreIds: [...linkStoresModal.selectedStoreIds, store.id] });
                      } else {
                        setLinkStoresModal({ ...linkStoresModal, selectedStoreIds: linkStoresModal.selectedStoreIds.filter(id => id !== store.id) });
                      }
                    }}
                  />
                  <label htmlFor={`link-store-${store.id}`} className="text-sm font-medium leading-none cursor-pointer truncate flex-1">
                    {store.name}
                    {store.group_name && store.group_name !== linkStoresModal.group?.name && (
                      <span className="ml-2 text-[10px] text-yellow-500 font-normal">({store.group_name})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkStoresModal({ ...linkStoresModal, open: false })}>Cancelar</Button>
            <Button onClick={handleSaveStoreLinks} className="bg-primary hover:bg-primary/90">Salvar Vínculos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Devices Dialog */}
      <Dialog open={linkDevicesModal.open} onOpenChange={(o) => setLinkDevicesModal({ ...linkDevicesModal, open: o })}>
        <DialogContent className="bg-card border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              Gestão de Dispositivos Diretos: <span className="text-primary">{linkDevicesModal.group?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Vincule dispositivos específicos diretamente a este grupo. 
              Estes dispositivos priorizarão a playlist deste grupo sobre as configurações da loja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou loja..." className="pl-9 bg-white/5 border-white/10" value={deviceSearchQuery} onChange={(e) => setDeviceSearchQuery(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto p-2 border border-white/10 rounded-md bg-white/5 custom-scrollbar">
              {filteredLinkDevices?.map(device => (
                <div key={device.device_uuid} className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded transition-colors">
                  <Checkbox 
                    id={`link-dev-${device.device_uuid}`} 
                    checked={linkDevicesModal.selectedDeviceIds.includes(device.device_uuid)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setLinkDevicesModal({ ...linkDevicesModal, selectedDeviceIds: [...linkDevicesModal.selectedDeviceIds, device.device_uuid] });
                      } else {
                        setLinkDevicesModal({ ...linkDevicesModal, selectedDeviceIds: linkDevicesModal.selectedDeviceIds.filter(id => id !== device.device_uuid) });
                      }
                    }}
                  />
                  <label htmlFor={`link-dev-${device.device_uuid}`} className="text-sm font-medium leading-none cursor-pointer flex-1 flex items-center justify-between">
                    <span>{device.nome}</span>
                    <div className="flex items-center gap-2">
                      {device.num_filial && <Badge variant="outline" className="text-[10px] h-4">Loja: {device.num_filial}</Badge>}
                      {device.group_name && device.group_name !== linkDevicesModal.group?.name && (
                        <Badge variant="outline" className="text-[10px] h-4 text-yellow-500 border-yellow-500/20">Grupo: {device.group_name}</Badge>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkDevicesModal({ ...linkDevicesModal, open: false })}>Cancelar</Button>
            <Button onClick={handleSaveDeviceLinks} className="bg-primary hover:bg-primary/90">Salvar Vínculos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Group Alert Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => setDeleteConfirm({ ...deleteConfirm, open: o })}>
        <AlertDialogContent className="bg-card border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Excluir grupo?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60 space-y-3">
              <p>
                Essa ação removerá o grupo <span className="text-white font-semibold">"{deleteConfirm.groupName}"</span> e desvinculará lojas e dispositivos vinculados. 
                <span className="text-destructive block mt-2 font-medium italic">Esta ação não pode ser desfeita.</span>
              </p>
              {(deleteConfirm.hasChildren || deleteConfirm.hasStores) && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive-foreground">
                  <p className="font-bold mb-1 uppercase tracking-wider">Atenção:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {deleteConfirm.hasChildren && <li>Este grupo possui subgrupos que também serão afetados.</li>}
                    {deleteConfirm.hasStores && <li>Existem lojas vinculadas que perderão a herança de playlist.</li>}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDeleteGroup(deleteConfirm.groupId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DndContext>
  );
}
