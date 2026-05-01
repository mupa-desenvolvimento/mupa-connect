import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-playlist-data";
import { 
  Search, 
  Monitor, 
  Check, 
  GripVertical,
  MousePointer2,
  ListFilter,
  Store,
  Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Device {
  id: number;
  device_uuid: string;
  apelido_interno: string;
  serial: string;
  online: boolean;
  num_filial: string | null;
  store_id: string | null;
  grupo_dispositivos: string | null;
  // Dynamic fields
  group_id?: string | null;
  group_name?: string | null;
  store_name?: string | null;
  status_label?: string;
  vinculation_type?: 'direct' | 'legacy' | 'transitive' | 'none';
}

interface StoreData {
  id: string;
  name: string;
  code: string;
  tenant_id: string;
  // Dynamic fields
  group_id?: string | null;
  group_name?: string | null;
  device_count?: number;
}

interface DeviceItemProps {
  device: Device;
  isSelected: boolean;
  onToggle: (uuid: string, isShiftKey: boolean) => void;
  onClick?: (groupId: string) => void;
}

export function DeviceItem({ device, isSelected, onToggle, onClick }: DeviceItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `device-${device.id}`,
    data: {
      type: 'device',
      device
    }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: 50
  } : undefined;

  const isLinked = !!device.group_name;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer",
        isSelected 
          ? "bg-[#085CF0]/10 border-[#085CF0]/30 shadow-[0_0_15px_rgba(8,92,240,0.1)]" 
          : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]",
        isDragging && "opacity-0"
      )}
      onClick={() => device.group_id && onClick?.(device.group_id)}
    >
      <div 
        className="flex items-center gap-3 flex-1 min-w-0"
        onClick={(e) => onToggle(device.device_uuid, e.shiftKey)}
      >
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={() => {}} // Controlled by div onClick for shiftKey support
          className="border-white/20 data-[state=checked]:bg-[#085CF0] data-[state=checked]:border-[#085CF0]"
        />
        
        <div 
          {...attributes} 
          {...listeners}
          className="p-1.5 rounded-lg bg-black/20 text-white/20 group-hover:text-white/60 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-bold truncate",
              isSelected ? "text-white" : "text-white/80"
            )}>
              {device.apelido_interno || "Sem nome"}
            </span>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              device.online ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
            )} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-white/30 font-mono">{device.serial}</span>
            {device.store_name && (
              <>
                <span className="text-[10px] text-white/10">•</span>
                <span className="text-[10px] text-white/40 truncate max-w-[80px]">{device.store_name}</span>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1.5 mt-2">
            {device.status_label === "Vinculado" ? (
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="bg-[#085CF0]/10 text-[#085CF0] border-[#085CF0]/20 text-[9px] h-4 uppercase tracking-tighter">
                  {device.group_name || "Vinculado"}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        {device.vinculation_type === 'direct' && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-blue-500/30 text-blue-400 bg-blue-500/5 uppercase">Dir</Badge>
                        )}
                        {device.vinculation_type === 'legacy' && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-purple-500/30 text-purple-400 bg-purple-500/5 uppercase">Leg</Badge>
                        )}
                        {device.vinculation_type === 'transitive' && (
                          <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-orange-500/30 text-orange-400 bg-orange-500/5 uppercase">Loja</Badge>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black border-white/10 text-[10px]">
                      {device.vinculation_type === 'direct' && "Vínculo direto via Tabela de Dispositivos"}
                      {device.vinculation_type === 'legacy' && "Vínculo legado via ID de Grupo no Dispositivo"}
                      {device.vinculation_type === 'transitive' && `Vínculo herdado da Loja: ${device.store_name}`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ) : device.status_label === "Em Loja" ? (
              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-yellow-500/20 text-yellow-500 bg-yellow-500/5 h-4">
                Em Loja
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-green-500/20 text-green-500 bg-green-500/5 h-4">
                Disponível
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeviceAvailablePanel({ 
  selectedIds, 
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onHighlightGroup
}: { 
  selectedIds: Set<string>,
  onToggleSelection: (uuids: string[]) => void,
  onSelectAll: (uuids: string[]) => void,
  onClearSelection: () => void,
  onHighlightGroup?: (groupId: string) => void
}) {
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"devices" | "stores">("devices");
  const [filterMode, setFilterMode] = useState<"all" | "linked" | "unlinked">("all");
  const { tenantId, companyId } = useTenant();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["all-devices-panel", tenantId],
    queryFn: async () => {
      // 1. Base query for devices
      let query = supabase
        .from("dispositivos")
        .select(`
          id, 
          apelido_interno, 
          serial, 
          online, 
          num_filial, 
          grupo_dispositivos,
          company_id
        `);
      
      // 2. Apply context filter
      if (companyId) {
        query = query.eq("company_id", companyId);
      } else if (tenantId) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id")
          .eq("tenant_id", tenantId);
        
        const cIds = companies?.map(c => c.id) || [];
        if (cIds.length > 0) {
          query = query.in("company_id", cIds);
        } else {
          return [];
        }
      }

      const { data: devicesData, error: devicesError } = await query;
      if (devicesError) throw devicesError;

      // Fetch all groups to get names for context
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name")
        .eq("tenant_id", tenantId);
      
      const groupMap = new Map(groups?.map(g => [g.id, g.name]) || []);

      // Fetch all stores to get names for context
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, code")
        .eq("tenant_id", tenantId);
      
      const storeMap = new Map(stores?.map(s => [s.code?.toString().trim(), s.name]) || []);
      const storeIdByCode = new Map(stores?.map(s => [s.code?.toString().trim(), s.id]) || []);

      // Fetch explicit group_devices links (New hierarchy system)
      const { data: groupLinks } = await supabase
        .from("group_devices")
        .select("device_id, group_id")
        .eq("tenant_id", tenantId);
      
      const linkMap = new Map(groupLinks?.map(l => [l.device_id.toString(), l.group_id]) || []);

      // Fetch group_stores links to resolve transitive vinculation (device -> store -> group)
      const { data: storeGroupLinks } = await supabase
        .from("group_stores")
        .select("store_id, group_id")
        .eq("tenant_id", tenantId);

      const storeToGroupMap = new Map(storeGroupLinks?.map(sl => [sl.store_id, sl.group_id]) || []);

      return (devicesData as any[]).map(d => {
          let statusLabel = "Disponível";
          let vinculationType: Device['vinculation_type'] = 'none';

          // Priority 1: Explicit group_devices table
          let groupId = linkMap.get(d.id.toString());
          if (groupId) vinculationType = 'direct';
          
          // Priority 2: Legacy grupo_dispositivos UUID
          if (!groupId && d.grupo_dispositivos && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.grupo_dispositivos)) {
            groupId = d.grupo_dispositivos;
            vinculationType = 'legacy';
          }

          // Priority 3: Transitive vinculation via store (num_filial -> store -> group)
          if (!groupId && d.num_filial) {
            const storeId = storeIdByCode.get(d.num_filial.toString().trim());
            if (storeId) {
              const transitiveGroupId = storeToGroupMap.get(storeId);
              if (transitiveGroupId) {
                groupId = transitiveGroupId;
                vinculationType = 'transitive';
              }
            }
          }

          if (groupId) {
            statusLabel = "Vinculado";
          } else if (d.num_filial) {
            statusLabel = "Em Loja";
          }

          return {
            ...d,
            group_id: groupId,
            group_name: groupId ? groupMap.get(groupId) : null,
            store_name: d.num_filial ? storeMap.get(d.num_filial) : null,
            status_label: statusLabel,
            vinculation_type: vinculationType
          };
      }) as Device[];
    },
    enabled: !!tenantId
  });

  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["all-stores-panel", tenantId],
    queryFn: async () => {
      // 1. Fetch all stores
      const { data: allStores, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .eq("tenant_id", tenantId);
      
      if (storesError) throw storesError;

      // 2. Fetch group links
      const { data: linkedStores } = await supabase
        .from("group_stores")
        .select(`
          store_id,
          group_id,
          groups(name)
        `)
        .eq("tenant_id", tenantId);
      
      const storeLinkMap = new Map(linkedStores?.map(ls => [ls.store_id, { 
        id: ls.group_id, 
        name: (ls.groups as any)?.name 
      }]) || []);

      // 3. Get device counts per store code
      const { data: deviceCounts } = await supabase
        .from("dispositivos")
        .select("num_filial");
      
      const countMap = new Map<string, number>();
      deviceCounts?.forEach(d => {
        if (d.num_filial) {
          countMap.set(d.num_filial, (countMap.get(d.num_filial) || 0) + 1);
        }
      });
      
      return allStores.map(s => {
        const link = storeLinkMap.get(s.id);
        return {
          ...s,
          group_id: link?.id,
          group_name: link?.name,
          device_count: countMap.get(s.code) || 0
        };
      }) as StoreData[];
    },
    enabled: !!tenantId && viewMode === "stores"
  });

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(d => {
      const matchesSearch = d.apelido_interno?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.serial?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterMode === "linked") return !!d.group_id;
      if (filterMode === "unlinked") return !d.group_id;
      return true;
    });
  }, [devices, searchQuery, filterMode]);

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    return stores.filter(s => {
      const matchesSearch = s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.code?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      if (filterMode === "linked") return !!s.group_name;
      if (filterMode === "unlinked") return !s.group_name;
      return true;
    });
  }, [stores, searchQuery, filterMode]);

  const handleSelectAll = () => {
    if (viewMode === "devices") {
      if (selectedIds.size === filteredDevices.length && filteredDevices.length > 0) {
        onClearSelection();
      } else {
        onSelectAll(filteredDevices.map(d => d.device_uuid));
      }
    }
  };

  const handleToggle = (uuid: string, isShiftKey: boolean) => {
    if (viewMode === "devices") {
      if (isShiftKey && lastSelectedId !== null) {
        const lastIndex = filteredDevices.findIndex(d => d.device_uuid === lastSelectedId);
        const currentIndex = filteredDevices.findIndex(d => d.device_uuid === uuid);
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const idsInRange = filteredDevices.slice(start, end + 1).map(d => d.device_uuid);
          
          onToggleSelection(idsInRange);
          setLastSelectedId(uuid);
          return;
        }
      }
      
      onToggleSelection([uuid]);
      setLastSelectedId(uuid);
    }
  };

  const { setNodeRef, isOver } = useDroppable({
    id: 'available-devices-panel',
    data: {
      type: 'available-panel'
    }
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full bg-[#0c0c0e] border transition-all duration-300 rounded-3xl overflow-hidden shadow-2xl relative",
        isOver ? "border-[#085CF0] ring-4 ring-[#085CF0]/10 bg-[#085CF0]/5" : "border-white/5"
      )}
    >
      <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-2xl bg-[#085CF0]/10 text-[#085CF0] shadow-inner">
              {viewMode === "devices" ? <Monitor className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                {viewMode === "devices" ? "Gestão de Dispositivos" : "Gestão de Lojas"}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-3.5 h-3.5 text-white/20 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-black border-white/10 text-[10px] max-w-[200px]">
                      {viewMode === "devices" 
                        ? "Arraste qualquer dispositivo para um grupo para vinculá-lo ou movê-lo."
                        : "Arraste lojas para grupos para organizar sua estrutura em massa."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                 <Badge variant="outline" className="text-[9px] h-4 bg-white/5 border-white/5 text-white/40">
                   {viewMode === "devices" ? `${devices?.length || 0} TOTAL` : `${stores?.length || 0} TOTAL`}
                 </Badge>
                 {viewMode === "devices" && devices && (
                   <>
                     <Badge variant="outline" className="text-[9px] h-4 border-blue-500/20 text-blue-400 bg-blue-500/5">
                       {devices.filter(d => !!d.group_id).length} VINC.
                     </Badge>
                     <Badge variant="outline" className="text-[9px] h-4 border-green-500/20 text-green-400 bg-green-500/5">
                       {devices.filter(d => !d.group_id).length} LIVRES
                     </Badge>
                   </>
                 )}
              </div>
            </div>
          </div>
          {viewMode === "devices" && selectedIds.size > 0 && (
            <Badge className="bg-[#085CF0] text-white border-none shadow-lg shadow-[#085CF0]/20 animate-in zoom-in-95 font-bold px-2 py-0.5">
              {selectedIds.size} SELECIONADOS
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 h-11">
            <button
              onClick={() => { setViewMode("devices"); setFilterMode("all"); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300",
                viewMode === "devices" ? "bg-[#085CF0] text-white shadow-xl" : "text-white/30 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <Monitor className="w-3.5 h-3.5" />
              Dispositivos
            </button>
            <button
              onClick={() => { setViewMode("stores"); setFilterMode("all"); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300",
                viewMode === "stores" ? "bg-[#085CF0] text-white shadow-xl" : "text-white/30 hover:text-white/60 hover:bg-white/5"
              )}
            >
              <Store className="w-3.5 h-3.5" />
              Lojas
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input 
                placeholder={viewMode === "devices" ? "Buscar nome ou serial..." : "Buscar nome ou código..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 bg-black/40 border-white/5 focus:border-[#085CF0]/50 h-10 rounded-xl text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-lg flex-1">
                {(["all", "linked", "unlinked"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all flex-1",
                      filterMode === mode 
                        ? "bg-white/10 text-white" 
                        : "text-white/20 hover:text-white/40 hover:bg-white/[0.04]"
                    )}
                  >
                    {mode === "all" ? "Todos" : mode === "linked" ? "Vinculados" : "Livres"}
                  </button>
                ))}
              </div>
              
              {viewMode === "devices" && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSelectAll}
                  className={cn(
                    "h-9 w-9 rounded-lg border border-white/5 bg-white/[0.02] transition-colors",
                    selectedIds.size > 0 ? "text-[#085CF0] border-[#085CF0]/30" : "text-white/20 hover:text-white/40"
                  )}
                  title="Selecionar/Desmarcar todos"
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3 pb-8">
          {viewMode === "devices" ? (
            isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse border border-white/5" />
              ))
            ) : filteredDevices.length > 0 ? (
              filteredDevices.map(device => (
                <DeviceItem 
                  key={device.id} 
                  device={device} 
                  isSelected={selectedIds.has(device.id)}
                  onToggle={handleToggle}
                  onClick={onHighlightGroup}
                />
              ))
            ) : (
              <EmptyState type="dispositivo" />
            )
          ) : (
            isLoadingStores ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse border border-white/5" />
              ))
            ) : filteredStores.length > 0 ? (
              filteredStores.map(store => (
                <StoreItem key={store.id} store={store} onClick={onHighlightGroup} />
              ))
            ) : (
              <EmptyState type="loja" />
            )
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-center gap-2.5 text-white/20">
        <MousePointer2 className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Arraste para organizar sua estrutura
        </span>
      </div>
    </div>
  );
}

function StoreItem({ store, onClick }: { store: StoreData, onClick?: (groupId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `store-${store.id}`,
    data: {
      type: 'store',
      store
    }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: 50
  } : undefined;

  const isLinked = !!store.group_id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 cursor-pointer",
        "bg-white/5 border-white/5 hover:border-[#085CF0]/30 hover:bg-[#085CF0]/5",
        isDragging && "opacity-0"
      )}
      onClick={() => store.group_id && onClick?.(store.group_id)}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="p-1.5 rounded-lg bg-black/20 text-white/20 group-hover:text-white/60 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between">
           <span className="text-sm font-bold text-white/80 truncate">
             {store.name || "Sem nome"}
           </span>
           <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-white/5 border-white/10 text-white/30">
             {store.device_count || 0} DISP.
           </Badge>
        </div>
        
        <div className="flex items-center gap-1.5 mt-2">
          {isLinked ? (
            <Badge variant="secondary" className="bg-[#085CF0]/10 text-[#085CF0] border-[#085CF0]/20 text-[9px] h-4 uppercase tracking-tighter">
              {store.group_name || "Vinculado"}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-green-500/20 text-green-500 bg-green-500/5 h-4">
              Livre
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
        <Search className="w-10 h-10 text-white/5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Nenhuma {type} encontrada</p>
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium">Ajuste os filtros ou mude a busca</p>
      </div>
    </div>
  );
}