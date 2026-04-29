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
  ListFilter
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
  pin: string;
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
            <span>•</span>
            <span>PIN: {device.pin || "---"}</span>
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
  onToggleSelection: (id: number, isShiftKey: boolean) => void,
  onSelectAll: (ids: number[]) => void,
  onClearSelection: () => void
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: tenantId } = useTenant();

  const { data: devices, isLoading } = useQuery({
    queryKey: ["available-devices", tenantId],
    queryFn: async () => {
      const stockCenterId = "1728965891007x215886838679286700";
      const { data, error } = await supabase
        .from("dispositivos")
        .select("*")
        .eq("empresa", stockCenterId)
        .is("num_filial", null)
        .is("grupo_dispositivos", null)
        .order("apelido_interno");
      
      if (error) throw error;
      return data as Device[];
    },
    enabled: !!tenantId
  });

  const filteredDevices = useMemo(() => {
    if (!devices) return [];
    return devices.filter(d => 
      d.apelido_interno?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.serial?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [devices, searchQuery]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredDevices.length) {
      onClearSelection();
    } else {
      onSelectAll(filteredDevices.map(d => d.id));
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
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-white/5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#085CF0]/10 text-[#085CF0]">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dispositivos</h3>
              <p className="text-[10px] text-white/40 font-medium">Não vinculados a grupos</p>
            </div>
          </div>
          {selectedIds.size > 0 && (
            <Badge className="bg-[#085CF0] text-white border-none animate-in zoom-in-95">
              {selectedIds.size} selecionados
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input 
              placeholder="Buscar por nome ou serial..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-black/40 border-white/10 focus:ring-[#085CF0]/50 h-10 rounded-xl"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSelectAll}
              className="text-[10px] uppercase font-bold tracking-widest text-white/40 hover:text-white gap-2"
            >
              <Check className={cn("w-3 h-3", selectedIds.size === filteredDevices.length && "text-[#085CF0]")} />
              {selectedIds.size === filteredDevices.length ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
            
            <div className="flex items-center gap-1 text-[10px] text-white/20 font-bold uppercase tracking-widest">
              <ListFilter className="w-3 h-3" />
              {filteredDevices.length} Total
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse border border-white/5" />
            ))
          ) : filteredDevices.length > 0 ? (
            filteredDevices.map(device => (
              <DeviceItem 
                key={device.id} 
                device={device} 
                isSelected={selectedIds.has(device.id)}
                onToggle={onToggleSelection}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-white/5">
                <Search className="w-8 h-8 text-white/10" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white/60">Nenhum dispositivo</p>
                <p className="text-xs text-white/20">Tente ajustar sua busca ou verifique se todos já estão em grupos.</p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer / Hint */}
      <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-center gap-2">
        <MousePointer2 className="w-3 h-3 text-[#085CF0]" />
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
          Arraste para vincular a um grupo
        </span>
      </div>
    </div>
  );
}
