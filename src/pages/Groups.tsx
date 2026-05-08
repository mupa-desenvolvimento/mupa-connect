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
import { 
  Globe, 
  Store, 
  Plus, 
  Search, 
  Loader2, 
  Package, 
  Filter, 
  Monitor, 
  Folder, 
  Edit, 
  Trash2, 
  Link2, 
  ChevronRight, 
  ChevronDown, 
  X, 
  MoreVertical, 
  CircleDot, 
  Network, 
  LayoutGrid, 
  List 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { StoreCard } from "@/components/groups/StoreCard";

// ===== Premium color palette for groups =====
const GROUP_COLOR_PALETTE = [
  {
    key: "mupa-blue",
    bar: "bg-[#085CF0]",
    softBg: "bg-[#085CF0]/5",
    iconBg: "bg-[#085CF0]/10 text-[#085CF0]",
    iconHover: "group-hover/node:bg-[#085CF0] group-hover/node:text-white",
    badge: "bg-[#085CF0]/10 text-[#085CF0]",
    line: "bg-[#085CF0]/20",
  },
  {
    key: "mupa-cyan",
    bar: "bg-[#00C2FF]",
    softBg: "bg-[#00C2FF]/5",
    iconBg: "bg-[#00C2FF]/10 text-[#00C2FF]",
    iconHover: "group-hover/node:bg-[#00C2FF] group-hover/node:text-white",
    badge: "bg-[#00C2FF]/10 text-[#00C2FF]",
    line: "bg-[#00C2FF]/20",
  },
  {
    key: "mupa-indigo",
    bar: "bg-[#6366F1]",
    softBg: "bg-[#6366F1]/5",
    iconBg: "bg-[#6366F1]/10 text-[#6366F1]",
    iconHover: "group-hover/node:bg-[#6366F1] group-hover/node:text-white",
    badge: "bg-[#6366F1]/10 text-[#6366F1]",
    line: "bg-[#6366F1]/20",
  },
  {
    key: "emerald",
    bar: "bg-[#10B981]",
    softBg: "bg-[#10B981]/5",
    iconBg: "bg-[#10B981]/10 text-[#10B981]",
    iconHover: "group-hover/node:bg-[#10B981] group-hover/node:text-white",
    badge: "bg-[#10B981]/10 text-[#10B981]",
    line: "bg-[#10B981]/20",
  },
];

// Resolve color: use stored key if valid, otherwise deterministic fallback by id
const getGroupColor = (id: string, storedKey?: string | null) => {
  if (storedKey) {
    const found = GROUP_COLOR_PALETTE.find(c => c.key === storedKey);
    if (found) return found;
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return GROUP_COLOR_PALETTE[hash % GROUP_COLOR_PALETTE.length];
};

// Draggable Store Component
const DraggableStore = ({ ls, devices = [] }: { ls: any; devices?: any[] }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `store-${ls.store_id}`,
    data: {
      type: 'store',
      store: ls.store
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    cursor: 'grab',
  };
  
  const storeDevices = devices.filter(d => {
    const normalize = (val: string | null | undefined) => {
      if (!val) return "";
      return val.replace(/FIL-/gi, "").replace(/\s+/g, "").replace(/^0+/, "").toLowerCase();
    };
    const normalizedStoreCode = normalize(ls.store?.code);
    const normalizedDeviceFilial = normalize(d.num_filial);
    return d.store_id === ls.store?.id || (normalizedStoreCode !== "" && normalizedStoreCode === normalizedDeviceFilial);
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex flex-col gap-2 rounded-xl border bg-card/40 backdrop-blur-sm p-3 transition-all hover:border-[#085CF0]/40 hover:shadow-premium group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[#085CF0]/10 text-[#085CF0]">
          <Store className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight truncate text-white">
            {ls.store?.name || "—"}
          </p>
          <p className="text-[10px] text-muted-foreground/60 leading-tight truncate font-bold uppercase tracking-widest">
            {ls.store?.code || ""}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] border-[#085CF0]/20 bg-[#085CF0]/5 text-[#085CF0]">
          {storeDevices.length} PDVs
        </Badge>
      </div>
      
      {storeDevices.length > 0 && (
        <div className="mt-2 pl-2 border-l-2 border-[#085CF0]/20 flex flex-col gap-1">
          {storeDevices.slice(0, 3).map(d => (
            <div key={d.id} className="flex items-center gap-1.5 text-[10px] text-white/50">
              <Monitor className="h-3 w-3 text-[#085CF0]/60" />
              <span className="truncate">{d.apelido_interno || d.nome || "Dispositivo"}</span>
            </div>
          ))}
          {storeDevices.length > 3 && (
            <p className="text-[9px] text-muted-foreground italic pl-4">
              + {storeDevices.length - 3} outros...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Draggable Device Component
const DraggableDevice = ({ gd }: { gd: any }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `device-${gd.device_id}`,
    data: {
      type: 'device',
      device: gd.device
    }
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
    cursor: 'grab',
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card/40 backdrop-blur-sm px-3 py-2 transition-all hover:border-[#085CF0]/40 hover:shadow-premium group"
      )}
    >
      <Monitor className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-[#085CF0] transition-colors" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold leading-tight truncate text-foreground/90">
          {gd.device?.apelido_interno || gd.device?.nome || "Dispositivo"}
        </p>
        <p className="text-[10px] text-muted-foreground/60 leading-tight truncate uppercase tracking-widest font-bold">
          {gd.device?.num_filial || "Sem Filial"}
        </p>
      </div>
      <CircleDot
        className={cn(
          "h-2.5 w-2.5 shrink-0 transition-all",
          gd.device?.status === "active" || gd.device?.status === "online" || gd.device?.online
            ? "text-emerald-500 shadow-glow shadow-emerald-500/40"
            : "text-muted-foreground/20"
        )}
      />
    </div>
  );
};

interface GroupItemProps {
  group: any;
  level: number;
  allGroups: any[];
  allStores: any[];
  allDevices: any[];
  onAction: (type: string, group: any) => void;
  viewMode: 'list' | 'map';
  isLast?: boolean;
}

const GroupItem = ({ 
  group, 
  level, 
  allGroups, 
  allStores,
  allDevices,
  onAction,
  viewMode,
  isLast = false
}: GroupItemProps) => {
  const [expanded, setExpanded] = useState(level === 0);
  const [isHovered, setIsHovered] = useState(false);
  const children = allGroups.filter(g => g.parent_id === group.id);
  const hasChildren = children.length > 0;

  // Make this group a droppable target
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      group: group
    }
  });

  const linkedStores = useMemo(() => {
    return (group.linked_store_ids || []).map((storeId: string) => {
      const store = allStores.find(s => s.id === storeId);
      return { id: `${group.id}-${storeId}`, store_id: storeId, store };
    });
  }, [group.linked_store_ids, allStores]);

  const linkedDevices = useMemo(() => {
    return (group.direct_device_ids || []).map((deviceId: string) => {
      const device = allDevices.find(d => d.device_uuid === deviceId);
      return { id: `${group.id}-${deviceId}`, device_id: deviceId, device };
    });
  }, [group.direct_device_ids, allDevices]);

  const getEffectivePlaylist = (g: any): { name: string; isInherited: boolean } => {
    if (g.playlist_name) return { name: g.playlist_name, isInherited: false };
    if (!g.parent_id) return { name: "Nenhuma", isInherited: false };
    const parent = allGroups.find(p => p.id === g.parent_id);
    if (!parent) return { name: "Nenhuma", isInherited: false };
    const parentPlaylist = getEffectivePlaylist(parent);
    return { name: parentPlaylist.name, isInherited: true };
  };

  const { name: effectivePlaylistName, isInherited } = getEffectivePlaylist(group);
  const totalDevices = linkedDevices.length;
  const hasContent = hasChildren || linkedDevices.length > 0 || linkedStores.length > 0;

  const isRoot = level === 0;
  const isMap = viewMode === 'map';
  const NodeIcon = isRoot ? Network : Folder;
  const rootForColor = isRoot ? group : (allGroups.find(g => g.id === group.parent_id) || group);
  const color = getGroupColor(rootForColor.id, (rootForColor as any).color);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "w-full group/node relative transition-all duration-200",
        isMap && level > 0 && "pl-6 sm:pl-10 mt-2",
        isHovered && "z-10",
        isOver && "ring-2 ring-[#085CF0] ring-offset-2 ring-offset-background rounded-xl"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* === VISUAL CONNECTORS (MAP MODE) === */}
      {isMap && level > 0 && (
        <>
          {/* Vertical line from parent node */}
          <div 
            className={cn(
              "absolute left-[10px] sm:left-[18px] top-[-12px] w-[1.5px] bg-border transition-colors duration-300",
              isLast ? "h-[32px]" : "h-[calc(100%+12px)]",
              isHovered && color.line
            )} 
          />
          {/* Horizontal line to this card */}
          <div 
            className={cn(
              "absolute left-[10px] sm:left-[18px] top-[20px] h-[1.5px] w-4 sm:w-8 bg-border transition-colors duration-300",
              isHovered && color.line
            )} 
          />
        </>
      )}

      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 relative",
          isMap ? (
            isRoot 
              ? "border border-border/50 bg-card shadow-sm" 
              : "border border-border/40 bg-card/50"
          ) : (
            isRoot ? "border border-border/50" : "border border-border/40"
          ),
          isHovered && "shadow-md border-border/80"
        )}
      >
        {/* === COLORED ACCENT BAR (left side) === */}
        <div
          aria-hidden
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 transition-all",
            color.bar,
            !isRoot && "opacity-50",
            isHovered && "w-1.5"
          )}
        />

        {/* === NODE HEADER === */}
        <div className="flex items-center gap-3 p-3 sm:p-4 pl-4 sm:pl-5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "h-7 w-7 shrink-0 bg-transparent hover:bg-foreground hover:text-background transition-all duration-200 shadow-sm hover:shadow-md",
              !hasContent && "invisible pointer-events-none"
            )}
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-300",
              color.iconBg,
              color.iconHover
            )}
          >
            <NodeIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold leading-tight tracking-tight truncate">
                {group.name}
              </h3>
              {isMap && totalDevices > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[10px] font-bold",
                  color.badge
                )}>
                  {totalDevices}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              <span>Playlist: <span className="font-medium text-foreground/80">{effectivePlaylistName}</span></span>
              {isInherited && (
                <Badge variant="secondary" className="px-1 py-0 text-[9px] font-normal leading-none h-3.5 bg-muted/50">
                  Herdado
                </Badge>
              )}
            </p>
          </div>

          <div className={cn(
            "flex shrink-0 items-center gap-1.5 transition-opacity duration-200",
            isMap && !isHovered && "opacity-60"
          )}>
            {!isMap && totalDevices > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Monitor className="h-3 w-3" />
                {totalDevices}
              </Badge>
            )}
            {linkedStores.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs border-primary/30 text-primary bg-primary/5">
                <Store className="h-3 w-3" />
                {linkedStores.length}
              </Badge>
            )}
            {hasChildren && !isMap && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Folder className="h-3 w-3" />
                {children.length}
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 transition-all",
                    isMap && !isHovered && "opacity-0 scale-90",
                    isHovered && "bg-accent"
                  )}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onAction('create', group)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar subgrupo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('stores', group)}>
                  <Package className="mr-2 h-4 w-4" /> Vincular lojas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAction('devices', group)}>
                  <Link2 className="mr-2 h-4 w-4" /> Vincular dispositivos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onAction('edit', group)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction('delete', group)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* === NODE CHILDREN (STORES/DEVICES) === */}
        {expanded && (linkedStores.length > 0 || linkedDevices.length > 0) && (
          <div className={cn(
            "border-t px-3 py-3 sm:px-4 space-y-4",
            isMap ? "bg-muted/10" : "bg-muted/20"
          )}>
            {/* Linked stores */}
            {linkedStores.length > 0 && (
              <div className="relative pl-6">
                <span className="absolute left-2 top-0 h-full w-px bg-border/60" aria-hidden />
                <span className="absolute left-2 top-4 h-px w-3 bg-border/60" aria-hidden />
                <div className="mb-2 flex items-center gap-2">
                  <Store className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Lojas vinculadas
                  </span>
                </div>
                <div className={cn(
                  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
                  isMap && "p-2 rounded-lg bg-card/40 border border-dashed border-border/50"
                )}>
                  {linkedStores.map(ls => (
                    <DraggableStore 
                      key={ls.id} 
                      ls={ls}
                      devices={allDevices}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Linked devices */}
            {linkedDevices.length > 0 && (
              <div className="relative pl-6">
                <span className="absolute left-2 top-0 h-full w-px bg-border/60" aria-hidden />
                <span className="absolute left-2 top-4 h-px w-3 bg-border/60" aria-hidden />
                <div className="mb-2 flex items-center gap-2">
                  <Monitor className={cn("h-3.5 w-3.5", isMap ? "text-primary/70" : "text-muted-foreground")} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Dispositivos
                  </span>
                </div>
                <div className={cn(
                  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3",
                  isMap && "p-2 rounded-lg bg-primary/5 border border-dashed border-primary/20"
                )}>
                  {linkedDevices.map(gd => (
                    <DraggableDevice 
                      key={gd.id}
                      gd={gd}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* === CHILD GROUPS (recursive) === */}
      {expanded && hasChildren && (
        <div className={cn(
          "relative space-y-2 mt-2",
          isMap ? "ml-0" : "ml-5 pl-4 border-l border-dashed border-border sm:ml-7 sm:pl-5"
        )}>
          {/* Continuous guide line in map mode */}
          {isMap && (
            <div className={cn(
              "absolute left-[10px] sm:left-[18px] top-0 bottom-0 w-[1.5px] bg-border/50",
              isHovered && "bg-primary/30"
            )} />
          )}
          
          {children.map((child, index) => (
            <GroupItem
              key={child.id}
              group={child}
              level={level + 1}
              allGroups={allGroups}
              allStores={allStores}
              allDevices={allDevices}
              onAction={onAction}
              viewMode={viewMode}
              isLast={index === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function GroupsPage() {
  const { tenantId, isSuperAdmin } = useTenant();
  const queryClient = useQueryClient();

  const { data: playlists } = usePlaylists(tenantId || undefined, isSuperAdmin);
  const { data: groups, isLoading: loadingGroups, refetch: refetchGroups } = useGroups(tenantId, isSuperAdmin);
  const { data: stores, isLoading: loadingStores, refetch: refetchStores } = useStores(tenantId);
  const { data: devices, refetch: refetchDevices } = useDevices(tenantId, isSuperAdmin);
  
  const [activeTab, setActiveTab] = useState("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');

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
      const deviceName = device.apelido_interno || device.nome || "Dispositivo";
      const group = overData.group;
      
      try {
        const targetTenantId = tenantId ?? group?.tenant_id ?? null;
        let query = supabase
          .from("dispositivos")
          .update({ grupo_dispositivos: group.id } as any)
          .eq("device_uuid", device.device_uuid);

        if (targetTenantId) query = query.eq("tenant_id", targetTenantId);

        const { error } = await query;
        
        if (error) throw error;
        toast.success(`${deviceName} vinculado ao grupo ${group.name}`);
        
        // Comprehensive refetch to sync all views
        await Promise.all([
          refetchGroups(),
          refetchDevices(),
          queryClient.invalidateQueries({ queryKey: ["all-devices-panel", tenantId] })
        ]);
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
        toast.success(`${device.nome} movido para ${store.name}`);
        
        await Promise.all([
          refetchDevices(),
          refetchStores(),
          queryClient.invalidateQueries({ queryKey: ["all-devices-panel", tenantId] })
        ]);
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
        
        await Promise.all([
          refetchGroups(),
          refetchStores(),
          queryClient.invalidateQueries({ queryKey: ["all-devices-panel", tenantId] })
        ]);
      } catch (e: any) {
        toast.error("Erro ao vincular loja: " + e.message);
      }
    }
  }, [tenantId, refetchGroups, refetchDevices, refetchStores, queryClient]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (!searchQuery) {
      // Find root groups (those whose parent_id is null OR whose parent_id doesn't exist in the set)
      const groupIds = new Set(groups.map(g => g.id));
      return groups.filter(g => !g.parent_id || !groupIds.has(g.parent_id));
    }
    return groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groups, searchQuery]);

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
      let query = supabase
        .from("dispositivos")
        .select("device_uuid")
        .eq("grupo_dispositivos", group.id);

      if (tenantId) query = query.eq("tenant_id", tenantId);

      const { data } = await query;
      setDeviceSearchQuery("");
      setLinkDevicesModal({ 
        open: true, 
        group, 
        selectedDeviceIds: (data || []).map((d: any) => d.device_uuid) 
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
      const targetTenantId = tenantId ?? linkDevicesModal.group?.tenant_id ?? null;
      let clearQuery = supabase
        .from("dispositivos")
        .update({ grupo_dispositivos: null } as any)
        .eq("grupo_dispositivos", groupId);
      if (targetTenantId) clearQuery = clearQuery.eq("tenant_id", targetTenantId);

      const { error: clearError } = await clearQuery;
      if (clearError) throw clearError;

      if (linkDevicesModal.selectedDeviceIds.length > 0) {
        let linkQuery = supabase
          .from("dispositivos")
          .update({ grupo_dispositivos: groupId } as any)
          .in("device_uuid", linkDevicesModal.selectedDeviceIds as any);
        if (targetTenantId) linkQuery = linkQuery.eq("tenant_id", targetTenantId);

        const { error: linkError } = await linkQuery;
        if (linkError) throw linkError;
      }

      toast.success("Vínculo de dispositivos atualizado!");
      setLinkDevicesModal({ ...linkDevicesModal, open: false });
      
      await Promise.all([
        refetchGroups(),
        refetchDevices(),
        queryClient.invalidateQueries({ queryKey: ["all-devices-panel", tenantId] })
      ]);
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
          {activeTab === "groups" && (
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('list')}
                className="h-7 px-2 gap-1.5 text-xs"
              >
                <List className="w-3.5 h-3.5" /> Lista
              </Button>
              <Button 
                variant={viewMode === 'map' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setViewMode('map')}
                className="h-7 px-2 gap-1.5 text-xs"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Mapa
              </Button>
            </div>
          )}
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <TabsList className="bg-background/50 border border-border/40 p-1 w-fit shrink-0">
              <TabsTrigger value="groups" className="gap-2 data-[state=active]:bg-primary">
                <Globe className="w-4 h-4" /> Grupos Globais
              </TabsTrigger>
              <TabsTrigger value="stores" className="gap-2 data-[state=active]:bg-primary">
                <Store className="w-4 h-4" /> Lojas & Setores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="groups" className="flex-1 min-h-0 mt-0 border-t border-border/40 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pt-4">
                {loadingGroups ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : groups && groups.length > 0 ? (
                  <div className="space-y-1 pb-2">
                    {filteredGroups.map(group => (
                      <GroupItem 
                        key={group.id} 
                        group={group} 
                        level={0} 
                        allGroups={groups} 
                        allStores={stores || []}
                        allDevices={devices || []}
                        onAction={handleGroupAction}
                        viewMode={viewMode}
                        isLast={filteredGroups.indexOf(group) === filteredGroups.length - 1}
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

            <TabsContent value="stores" className="flex-1 min-h-0 mt-0 border-t border-border/40 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 pt-4 shrink-0">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" /> Listagem de Unidades
                </h3>
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                {loadingStores ? (
                  <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredStores.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
                    {filteredStores.map(store => (
                      <StoreCard 
                        key={store.id} 
                        store={store} 
                        playlists={playlists || []}
                        onRefresh={() => {
                          refetchGroups();
                          refetchStores();
                        }}
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

        {/* Sidebar Panel - Keep exactly as is! */}
        <div className="w-[408px] flex flex-col overflow-hidden bg-card p-4 rounded-xl border border-border/60 shadow-sm">
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

      {/* Link Stores Dialog */}
      <Dialog open={linkStoresModal.open} onOpenChange={(o) => setLinkStoresModal({ ...linkStoresModal, open: o })}>
        <DialogContent className="bg-card border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> 
              Vincular Unidades ao Grupo: <span className="text-primary">{linkStoresModal.group?.name}</span>
            </DialogTitle>
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
      
      {/* Drag Overlay for Preview */}
      <DragOverlay>
        {activeDragItem && (
          <div className="bg-card p-3 rounded-lg border shadow-lg opacity-80">
            {activeDragItem.type === 'device' && (
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{activeDragItem.device.nome}</span>
              </div>
            )}
            {activeDragItem.type === 'store' && (
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{activeDragItem.store.name}</span>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
      
      </div>
    </DndContext>
  );
}
