import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-playlist-data";
import { 
  Search, 
  Monitor, 
  ChevronRight, 
  Check, 
  GripVertical,
  MousePointer2,
  ListFilter,
  Store
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Device {
  id: number;
  apelido_interno: string;
  serial: string;
  online: boolean;
  num_filial: string | null;
  grupo_dispositivos: string | null;
}

interface DeviceItemProps {
  device: Device;
  isSelected: boolean;
  onToggle: (id: number, isShiftKey: boolean) => void;
}

export function DeviceItem({ device, isSelected, onToggle }: DeviceItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
        isSelected 
          ? "bg-[#085CF0]/10 border-[#085CF0]/30 shadow-[0_0_15px_rgba(8,92,240,0.1)]" 
          : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]"
      )}
    >
      <div 
        className="flex items-center gap-3 flex-1 min-w-0"
        onClick={(e) => onToggle(device.id, e.shiftKey)}
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

        <div className="flex flex-col min-w-0">
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
          <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono">
            <span>SN: {device.serial || "---"}</span>
          </div>
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-white/5 bg-white/5">
          Disponível
        </Badge>
      </div>
    </div>
  );
}

export function DeviceAvailablePanel({ 
  selectedIds, 
  onToggleSelection,
  onSelectAll,
  onClearSelection
}: { 
  selectedIds: Set<number>,
  onToggleSelection: (ids: number[]) => void,
  onSelectAll: (ids: number[]) => void,
  onClearSelection: () => void
}) {
  const [lastSelectedId, setLastSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"devices" | "stores">("devices");
  const { data: tenantId } = useTenant();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["available-devices", tenantId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data: userData } = await supabase
        .from("users")
        .select("company")
        .eq("id", session.user.id)
        .maybeSingle();

      const companyId = userData?.company;
      if (!companyId) return [];
      
      const { data: devices, error: devicesError } = await supabase
        .from("dispositivos")
        .select("*")
        .eq("empresa", companyId);
      
      if (devicesError) throw devicesError;

      // Pegar todas as lojas do tenant para verificar vínculo por num_filial
      const { data: tenantStores } = await supabase
        .from("stores")
        .select("code")
        .eq("tenant_id", tenantId);
      
      const tenantStoreCodes = new Set(tenantStores?.map(s => s.code) || []);
      
      // Filtrar dispositivos que NÃO estão em nenhuma loja do tenant E NÃO têm grupo_dispositivos vinculado
      return (devices as Device[]).filter(d => {
        // Se tem grupo_dispositivos (UUID), já está organizado
        if (d.grupo_dispositivos && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.grupo_dispositivos)) {
          return false;
        }
        
        // Se num_filial aponta para uma loja que pertence a este tenant, já está organizado
        if (d.num_filial && tenantStoreCodes.has(d.num_filial)) {
          return false;
        }

        return true;
      });
    },
    enabled: !!tenantId
  });

  const { data: stores, isLoading: isLoadingStores } = useQuery({
    queryKey: ["available-stores", tenantId],
    queryFn: async () => {
      // 1. Buscar todas as lojas do tenant
      const { data: allStores, error: storesError } = await supabase
        .from("stores")
        .select("*")
        .eq("tenant_id", tenantId);
      
      if (storesError) throw storesError;

      // 2. Buscar IDs de lojas que já estão vinculadas a algum grupo do tenant
      const { data: linkedStores, error: linkedError } = await supabase
        .from("group_stores")
        .select(`
          store_id,
          groups!inner(tenant_id)
        `)
        .eq("groups.tenant_id", tenantId);
      
      if (linkedError) throw linkedError;

      const linkedStoreIds = new Set(linkedStores.map(ls => ls.store_id));
      
      // Retornar apenas as que não estão vinculadas
      return allStores.filter(s => !linkedStoreIds.has(s.id));
    },
    enabled: !!tenantId && viewMode === "stores"
  });

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(d => 
      d.apelido_interno?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.serial?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    return stores.filter(s => 
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stores, searchQuery]);

  const handleSelectAll = () => {
    if (viewMode === "devices") {
      if (selectedIds.size === filteredDevices.length) {
        onClearSelection();
      } else {
        onSelectAll(filteredDevices.map(d => d.id));
      }
    }
  };

  const handleToggle = (id: number, isShiftKey: boolean) => {
    if (viewMode === "devices") {
      if (isShiftKey && lastSelectedId !== null) {
        const lastIndex = filteredDevices.findIndex(d => d.id === lastSelectedId);
        const currentIndex = filteredDevices.findIndex(d => d.id === id);
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const idsInRange = filteredDevices.slice(start, end + 1).map(d => d.id);
          
          onToggleSelection(idsInRange);
          setLastSelectedId(id);
          return;
        }
      }
      
      onToggleSelection([id]);
      setLastSelectedId(id);
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
        "flex flex-col h-full bg-[#09090b] border transition-all duration-200 rounded-2xl overflow-hidden shadow-2xl",
        isOver ? "border-[#085CF0] ring-2 ring-[#085CF0]/20 shadow-[0_0_30px_rgba(8,92,240,0.15)] bg-white/5" : "border-white/5"
      )}
    >
      <div className="p-5 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#085CF0]/10 text-[#085CF0]">
              {viewMode === "devices" ? <Monitor className="w-5 h-5" /> : <Store className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                {viewMode === "devices" ? "Dispositivos" : "Lojas"}
              </h3>
              <p className="text-[10px] text-white/40 font-medium">Não vinculados a grupos</p>
            </div>
          </div>
          {viewMode === "devices" && selectedIds.size > 0 && (
            <Badge className="bg-[#085CF0] text-white border-none animate-in zoom-in-95">
              {selectedIds.size} selecionados
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex p-1 bg-black/20 rounded-lg">
            <button
              onClick={() => setViewMode("devices")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-tighter rounded-md transition-all",
                viewMode === "devices" ? "bg-[#085CF0] text-white shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <Monitor className="w-3 h-3" />
              Dispositivos
            </button>
            <button
              onClick={() => setViewMode("stores")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-bold uppercase tracking-tighter rounded-md transition-all",
                viewMode === "stores" ? "bg-[#085CF0] text-white shadow-lg" : "text-white/40 hover:text-white/60"
              )}
            >
              <Store className="w-3 h-3" />
              Lojas
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder={viewMode === "devices" ? "Buscar por nome ou serial..." : "Buscar por nome ou código..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/40 border-white/10 focus:ring-[#085CF0]/50 h-10 rounded-xl"
            />
          </div>
          
          <div className="flex items-center justify-between">
            {viewMode === "devices" && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSelectAll}
                className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white gap-2"
              >
                <Check className={cn("w-3 h-3", selectedIds.size === filteredDevices.length && "text-[#085CF0]")} />
                {selectedIds.size === filteredDevices.length ? "Desmarcar Todos" : "Selecionar Todos"}
              </Button>
            )}
            
            <div className="flex items-center gap-1 text-[10px] text-white/20 font-bold uppercase tracking-widest ml-auto">
              <ListFilter className="w-3 h-3" />
              {viewMode === "devices" ? filteredDevices.length : filteredStores.length} Total
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {viewMode === "devices" ? (
            isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse border border-white/5" />
              ))
            ) : filteredDevices.length > 0 ? (
              filteredDevices.map(device => (
                <DeviceItem 
                  key={device.id} 
                  device={device} 
                  isSelected={selectedIds.has(device.id)}
                  onToggle={handleToggle}
                />
              ))
            ) : (
              <EmptyState type="dispositivo" />
            )
          ) : (
            isLoadingStores ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse border border-white/5" />
              ))
            ) : filteredStores.length > 0 ? (
              filteredStores.map(store => (
                <StoreItem key={store.id} store={store} />
              ))
            ) : (
              <EmptyState type="loja" />
            )
          )}
        </div>
      </ScrollArea>

      <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-center gap-2">
        <MousePointer2 className="w-3 h-3 text-[#085CF0]" />
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
          Arraste para vincular a um grupo
        </span>
      </div>
    </div>
  );
}

function StoreItem({ store }: { store: any }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing",
        "bg-white/5 border-white/5 hover:border-[#085CF0]/30 hover:bg-[#085CF0]/5"
      )}
    >
      <div className="p-2 rounded-lg bg-black/20 text-[#085CF0]">
        <Store className="w-4 h-4" />
      </div>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-bold text-white/80 truncate">
          {store.name || "Sem nome"}
        </span>
        <span className="text-[10px] text-white/40 font-mono">
          Cód: {store.code || "---"}
        </span>
      </div>

      <div className="p-1 text-white/20 group-hover:text-white/60 transition-colors">
        <GripVertical className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
      <div className="p-4 rounded-full bg-white/5">
        <Search className="w-8 h-8 text-white/10" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white/60">Nenhuma {type} encontrada</p>
        <p className="text-xs text-white/20">Tente ajustar sua busca ou verifique se todos já estão organizados.</p>
      </div>
    </div>
  );
}
