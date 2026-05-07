import { useState, useMemo } from "react";
import { useGroups, GroupWithDetails } from "@/hooks/useGroups";
import { useGroupDevices } from "@/hooks/useGroupDevices";
import { useDevices } from "@/hooks/useDevices";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useStores } from "@/hooks/useStores";
import { useStoreInternalGroups } from "@/hooks/useStoreInternalGroups";
import { useGroupStores } from "@/hooks/useGroupStores";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Folder, Edit, Trash2, Link2, ChevronRight, ChevronDown, Loader2, Monitor, X, Search, Store, Globe, Package, MoreVertical, CircleDot, Network, LayoutGrid, List } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

// ===== Soft color palette per group (low saturation, accessible in light/dark) =====
// Uses Tailwind's predefined color utilities to avoid touching the design tokens.
// Each entry provides paired classes for the side bar accent, soft surface, badge
// and icon background — keeping a coherent look across the card.
const GROUP_COLOR_PALETTE = [
  {
    key: "blue",
    bar: "bg-blue-400/70 dark:bg-blue-400/60",
    softBg: "bg-blue-50/60 dark:bg-blue-950/20",
    iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    iconHover: "group-hover/node:bg-blue-500 group-hover/node:text-white",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    line: "bg-blue-300/60 dark:bg-blue-400/30",
  },
  {
    key: "green",
    bar: "bg-emerald-400/70 dark:bg-emerald-400/60",
    softBg: "bg-emerald-50/60 dark:bg-emerald-950/20",
    iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    iconHover: "group-hover/node:bg-emerald-500 group-hover/node:text-white",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    line: "bg-emerald-300/60 dark:bg-emerald-400/30",
  },
  {
    key: "orange",
    bar: "bg-orange-400/70 dark:bg-orange-400/60",
    softBg: "bg-orange-50/60 dark:bg-orange-950/20",
    iconBg: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    iconHover: "group-hover/node:bg-orange-500 group-hover/node:text-white",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    line: "bg-orange-300/60 dark:bg-orange-400/30",
  },
  {
    key: "violet",
    bar: "bg-violet-400/70 dark:bg-violet-400/60",
    softBg: "bg-violet-50/60 dark:bg-violet-950/20",
    iconBg: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    iconHover: "group-hover/node:bg-violet-500 group-hover/node:text-white",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    line: "bg-violet-300/60 dark:bg-violet-400/30",
  },
  {
    key: "amber",
    bar: "bg-amber-400/70 dark:bg-amber-400/60",
    softBg: "bg-amber-50/60 dark:bg-amber-950/20",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    iconHover: "group-hover/node:bg-amber-500 group-hover/node:text-white",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    line: "bg-amber-300/60 dark:bg-amber-400/30",
  },
  {
    key: "rose",
    bar: "bg-rose-400/70 dark:bg-rose-400/60",
    softBg: "bg-rose-50/60 dark:bg-rose-950/20",
    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    iconHover: "group-hover/node:bg-rose-500 group-hover/node:text-white",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    line: "bg-rose-300/60 dark:bg-rose-400/30",
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

// Color labels for the picker UI
const COLOR_LABELS: Record<string, string> = {
  blue: "Azul",
  green: "Verde",
  orange: "Laranja",
  violet: "Lilás",
  amber: "Amarelo",
  rose: "Rosa",
};

// Solid swatch colors for the picker (visual preview only)
const COLOR_SWATCHES: Record<string, string> = {
  blue: "bg-blue-400",
  green: "bg-emerald-400",
  orange: "bg-orange-400",
  violet: "bg-violet-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

// ===== Global Group Tree Item =====
interface GroupItemProps {
  group: GroupWithDetails;
  level: number;
  allGroups: GroupWithDetails[];
  onEdit: (group: GroupWithDetails) => void;
  onDelete: (id: string) => void;
  onCreateSubgroup: (parentId: string) => void;
  onLinkDevice: (groupId: string) => void;
  onLinkInternalGroups: (groupId: string) => void;
  getDevicesForGroup: (groupId: string) => { id: string; device_id: string; device?: { id: string; name: string; device_code: string; status: string } | null }[];
  onUnlinkDevice: (groupId: string, deviceId: string) => void;
  getStoresForGroup: (groupId: string) => { id: string; store_id: string; store?: { id: string; name: string; code: string } | null }[];
  onUnlinkStore: (groupId: string, storeId: string) => void;
  viewMode: 'list' | 'map';
  isLast?: boolean;
}

const GroupItem = ({ 
  group, 
  level, 
  allGroups, 
  onEdit, 
  onDelete, 
  onCreateSubgroup, 
  onLinkDevice, 
  onLinkInternalGroups, 
  getDevicesForGroup, 
  onUnlinkDevice, 
  getStoresForGroup, 
  onUnlinkStore,
  viewMode,
  isLast = false
}: GroupItemProps) => {
  const [expanded, setExpanded] = useState(level === 0);
  const [isHovered, setIsHovered] = useState(false);
  const children = allGroups.filter(g => g.parent_id === group.id);
  const hasChildren = children.length > 0;
  const linkedDevices = getDevicesForGroup(group.id);
  const linkedStores = getStoresForGroup(group.id);

  const getEffectivePlaylist = (g: GroupWithDetails): { name: string; isInherited: boolean } => {
    if (g.playlist) return { name: g.playlist.name, isInherited: false };
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
  const NodeIcon = isRoot ? Network : level === 1 ? Folder : Globe;
  // Per-group color identity: prefer stored color, then inherit from parent root, else deterministic
  const rootForColor = isRoot ? group : (allGroups.find(g => g.id === group.parent_id) || group);
  const color = getGroupColor(rootForColor.id, (rootForColor as GroupWithDetails & { color?: string | null }).color);

  return (
    <div 
      className={cn(
        "w-full group/node relative transition-all duration-200",
        isMap && level > 0 && "pl-6 sm:pl-10 mt-2",
        isHovered && "z-10"
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
              <TruncatedText
                text={group.name}
                as="h3"
                className={cn(
                  "font-semibold leading-tight tracking-tight", 
                  isRoot ? "text-base" : "text-sm"
                )}
              />
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
                <DropdownMenuItem onClick={() => onCreateSubgroup(group.id)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar subgrupo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLinkInternalGroups(group.id)}>
                  <Package className="mr-2 h-4 w-4" /> Vincular lojas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLinkDevice(group.id)}>
                  <Link2 className="mr-2 h-4 w-4" /> Vincular dispositivos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(group)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(group.id)}
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
                    <div
                      key={ls.id}
                      className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 transition-all hover:border-primary/40 hover:shadow-sm"
                    >
                      <Store className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <div className="min-w-0 flex-1">
                        <TruncatedText
                          text={ls.store?.name || "—"}
                          className="text-xs font-medium leading-tight"
                        />
                        <TruncatedText
                          text={ls.store?.code || ""}
                          className="text-[10px] text-muted-foreground leading-tight"
                        />
                      </div>
                      <button
                        onClick={() => onUnlinkStore(group.id, ls.store_id)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Desvincular loja"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
                    <div
                      key={gd.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 transition-all hover:border-primary/40 hover:shadow-sm",
                        isMap && "hover:bg-primary/[0.02]"
                      )}
                    >
                      <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <TruncatedText
                          text={gd.device?.name || "Dispositivo"}
                          className="text-xs font-medium leading-tight"
                        />
                        <TruncatedText
                          text={gd.device?.device_code || ""}
                          className="text-[10px] text-muted-foreground leading-tight"
                        />
                      </div>
                      <CircleDot
                        className={cn(
                          "h-3 w-3 shrink-0",
                          gd.device?.status === "active" || gd.device?.status === "online"
                            ? "text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                            : "text-muted-foreground/40"
                        )}
                      />
                      <button
                        onClick={() => onUnlinkDevice(group.id, gd.device_id)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Desvincular dispositivo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSubgroup={onCreateSubgroup}
              onLinkDevice={onLinkDevice}
              onLinkInternalGroups={onLinkInternalGroups}
              getDevicesForGroup={getDevicesForGroup}
              onUnlinkDevice={onUnlinkDevice}
              getStoresForGroup={getStoresForGroup}
              onUnlinkStore={onUnlinkStore}
              viewMode={viewMode}
              isLast={index === children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ===== Main Page =====
const GroupsPage = () => {
  const { groups, isLoading, createGroup, updateGroup, deleteGroup } = useGroups();
  const { devices } = useDevices();
  const { groupDevices, linkDevice, unlinkDevice, getDevicesForGroup } = useGroupDevices();
  const { groupStores, linkStore, unlinkStore, getStoresForGroup } = useGroupStores();
  const { playlists } = usePlaylists();
  const { stores, updateStore } = useStores();
  const {
    internalGroups, createInternalGroup, updateInternalGroup, createBulkInternalGroups, deleteInternalGroup,
    linkDeviceToInternalGroup, unlinkDeviceFromInternalGroup, getDevicesForInternalGroup,
    getTargetsForGlobalGroup, getInternalGroupsForStore, addGlobalGroupTarget, removeGlobalGroupTarget,
  } = useStoreInternalGroups();

  const [activeTab, setActiveTab] = useState("global");
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<GroupWithDetails | null>(null);
  const [linkGroupId, setLinkGroupId] = useState<string | null>(null);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [segmentGroupId, setSegmentGroupId] = useState<string | null>(null);
  const [segmentSearch, setSegmentSearch] = useState("");
  const [segmentTab, setSegmentTab] = useState("stores");

  // Internal group bulk creation
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkName, setBulkName] = useState("");
  const [bulkSelectedStores, setBulkSelectedStores] = useState<string[]>([]);

  // Internal group device linking
  const [internalLinkGroupId, setInternalLinkGroupId] = useState<string | null>(null);
  const [internalDeviceSearch, setInternalDeviceSearch] = useState("");

  const [formData, setFormData] = useState({ name: "", parent_id: "none", playlist_id: "none", inherit_playlist: true, color: "auto" });

  const rootGroups = useMemo(() => groups.filter(g => !g.parent_id), [groups]);

  const availableDevices = useMemo(() => {
    if (!linkGroupId && !segmentGroupId) return [];
    const targetGroupId = linkGroupId || segmentGroupId;
    const linkedIds = new Set(getDevicesForGroup(targetGroupId!).map(gd => gd.device_id));
    return devices.filter(d => !linkedIds.has(d.id) && d.name.toLowerCase().includes(segmentTab === "devices" ? segmentSearch.toLowerCase() : deviceSearch.toLowerCase()));
  }, [linkGroupId, segmentGroupId, devices, groupDevices, deviceSearch, segmentSearch, segmentTab]);

  const filteredStores = useMemo(() => {
    return stores.filter(s => s.name.toLowerCase().includes(segmentSearch.toLowerCase()) || s.code.toLowerCase().includes(segmentSearch.toLowerCase()));
  }, [stores, segmentSearch]);

  // Devices available for internal group linking (only from same store)
  const internalAvailableDevices = useMemo(() => {
    if (!internalLinkGroupId) return [];
    const ig = internalGroups.find(g => g.id === internalLinkGroupId);
    if (!ig) return [];
    const linkedIds = new Set(getDevicesForInternalGroup(internalLinkGroupId).map(d => d.device_id));
    return devices.filter(d => d.store_id === ig.store_id && !linkedIds.has(d.id) && d.name.toLowerCase().includes(internalDeviceSearch.toLowerCase()));
  }, [internalLinkGroupId, internalGroups, devices, internalDeviceSearch]);

  const handleOpenCreate = (parentId?: string) => {
    setEditingGroup(null);
    setFormData({ name: "", parent_id: parentId || "none", playlist_id: "none", inherit_playlist: true, color: "auto" });
    setIsDialogOpen(true);
  };

  const handleEdit = (group: GroupWithDetails) => {
    setEditingGroup(group);
    setFormData({ 
      name: group.name, 
      parent_id: group.parent_id || "none", 
      playlist_id: group.playlist_id || "none", 
      inherit_playlist: !group.playlist_id,
      color: (group as GroupWithDetails & { color?: string | null }).color || "auto",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = { 
      name: formData.name, 
      parent_id: formData.parent_id === "none" ? null : formData.parent_id, 
      playlist_id: formData.inherit_playlist ? null : (formData.playlist_id === "none" ? null : formData.playlist_id),
      color: formData.color === "auto" ? null : formData.color,
    };
    if (editingGroup) {
      updateGroup.mutate({ id: editingGroup.id, ...data }, { onSuccess: () => setIsDialogOpen(false) });
    } else {
      createGroup.mutate(data, { onSuccess: () => setIsDialogOpen(false) });
    }
  };

  const handleLinkDevice = (deviceId: string) => {
    const targetGroupId = linkGroupId || segmentGroupId;
    if (!targetGroupId) return;
    linkDevice.mutate({ groupId: targetGroupId, deviceId });
  };

  const handleUnlinkDevice = (groupId: string, deviceId: string) => {
    unlinkDevice.mutate({ groupId, deviceId });
  };

  // Segmentation dialog: selected stores for the global group
  const [segmentStoreSelections, setSegmentStoreSelections] = useState<Set<string>>(new Set());

  const handleOpenSegment = (groupId: string) => {
    setSegmentGroupId(groupId);
    setSegmentSearch("");
    setSegmentTab("stores");
    const existingStores = getStoresForGroup(groupId).map(gs => gs.store_id);
    setSegmentStoreSelections(new Set(existingStores));
  };

  const handleToggleStoreSegment = (storeId: string) => {
    setSegmentStoreSelections(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  const handleSaveSegments = async () => {
    if (!segmentGroupId) return;
    const existing = getStoresForGroup(segmentGroupId);
    const existingIds = new Set(existing.map(gs => gs.store_id));

    // Add new stores
    for (const id of segmentStoreSelections) {
      if (!existingIds.has(id)) {
        await linkStore.mutateAsync({ groupId: segmentGroupId, storeId: id });
      }
    }
    // Remove old stores
    for (const gs of existing) {
      if (!segmentStoreSelections.has(gs.store_id)) {
        await unlinkStore.mutateAsync({ groupId: segmentGroupId, storeId: gs.store_id });
      }
    }
    setSegmentGroupId(null);
  };

  // Stores grouped for segmentation dialog
  const storesWithInternalGroups = useMemo(() => {
    return stores.map(s => ({
      ...s,
      internalGroups: getInternalGroupsForStore(s.id),
    })).filter(s => s.internalGroups.length > 0);
  }, [stores, internalGroups]);

  if (isLoading) {
    return (
      <PageShell fixedLayout={false} className="animate-fade-in">
        <div className="px-4 pt-4 pb-6 sm:px-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </PageShell>
    );
  }

  const linkGroupName = linkGroupId ? groups.find(g => g.id === linkGroupId)?.name : "";
  const segmentGroupName = segmentGroupId ? groups.find(g => g.id === segmentGroupId)?.name : "";

  return (
    <PageShell fixedLayout={false} className="animate-fade-in">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 pt-4 pb-6 sm:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="global" className="gap-2"><Globe className="w-4 h-4" />Grupos</TabsTrigger>
              <TabsTrigger value="internal" className="gap-2"><Store className="w-4 h-4" />Lojas</TabsTrigger>
            </TabsList>
            
            {activeTab === "global" && (
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
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "global" && (
              <Button onClick={() => handleOpenCreate()} className="gap-2"><Plus className="w-4 h-4" />Criar Grupo</Button>
            )}
            {activeTab === "internal" && (
              <Button onClick={() => { setBulkDialogOpen(true); setBulkName(""); setBulkSelectedStores([]); }} className="gap-2"><Plus className="w-4 h-4" />Criar Setor</Button>
            )}
          </div>
        </div>

        {/* === GLOBAL GROUPS TAB === */}
        <TabsContent value="global" className="space-y-4">
          {rootGroups.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Nenhum grupo encontrado</h3>
                <p className="text-muted-foreground mb-4">Crie grupos para agrupar segmentos de lojas.</p>
                <Button onClick={() => handleOpenCreate()}>Criar Primeiro Grupo</Button>
              </CardContent>
            </Card>
          ) : (
            rootGroups.map((group, index) => (
              <GroupItem 
                key={group.id} 
                group={group} 
                level={0} 
                allGroups={groups} 
                onEdit={handleEdit} 
                onDelete={setDeleteId} 
                onCreateSubgroup={handleOpenCreate} 
                onLinkDevice={id => { setLinkGroupId(id); setDeviceSearch(""); }} 
                onLinkInternalGroups={handleOpenSegment} 
                getDevicesForGroup={getDevicesForGroup} 
                onUnlinkDevice={handleUnlinkDevice} 
                getStoresForGroup={getStoresForGroup} 
                onUnlinkStore={(groupId, storeId) => unlinkStore.mutate({ groupId, storeId })} 
                viewMode={viewMode}
                isLast={index === rootGroups.length - 1}
              />
            ))
          )}
        </TabsContent>

        {/* === INTERNAL GROUPS TAB === */}
        <TabsContent value="internal" className="space-y-4">
          {stores.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Store className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Nenhuma loja cadastrada</h3>
                <p className="text-muted-foreground">Cadastre lojas primeiro para criar setores.</p>
              </CardContent>
            </Card>
          ) : (
            stores.map(store => {
              const storeGroups = getInternalGroupsForStore(store.id);
              const storeDevices = devices.filter(d => d.store_id === store.id);
              
              // Get IDs of devices already in a sector
              const devicesInSectorsIds = new Set(
                storeGroups.flatMap(ig => getDevicesForInternalGroup(ig.id).map(igd => igd.device_id))
              );
              
              const ungroupedDevices = storeDevices.filter(d => !devicesInSectorsIds.has(d.id));

              return (
                <Card key={store.id} className="overflow-hidden">
                  <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-primary" />
                      <div>
                        <span className="font-bold text-base">{store.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({store.code})</span>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Select 
                        value={store.playlist_id || "none"} 
                        onValueChange={(v) => updateStore(store.id, { playlist_id: v === "none" ? null : v })}
                      >
                        <SelectTrigger className="h-8 w-[180px] text-xs">
                          <SelectValue placeholder="Playlist da Loja" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem playlist (Herança)</SelectItem>
                          {playlists.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge variant="secondary">{storeDevices.length} disp.</Badge>
                      <Badge variant="outline">{storeGroups.length} setor(es)</Badge>
                    </div>
                  </div>
                  <CardContent className="p-4 space-y-4">
                    {/* Sectors */}
                    {storeGroups.map(ig => {
                      const igDevices = getDevicesForInternalGroup(ig.id);
                      return (
                        <div key={ig.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-background">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary" />
                              <span className="font-semibold">{ig.name}</span>
                              <Select 
                                value={ig.playlist_id || "none"} 
                                onValueChange={(v) => updateInternalGroup.mutate({ id: ig.id, playlist_id: v === "none" ? null : v })}
                              >
                                <SelectTrigger className="h-7 w-[160px] text-[10px] ml-2">
                                  <SelectValue placeholder="Playlist do Setor" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Herdar da Loja</SelectItem>
                                  {playlists.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {igDevices.length > 0 && (
                                <Badge variant="outline" className="text-xs gap-1"><Monitor className="w-3 h-3" />{igDevices.length}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => { setInternalLinkGroupId(ig.id); setInternalDeviceSearch(""); }}>
                                <Link2 className="w-3.5 h-3.5" />Vincular
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteInternalGroup.mutate(ig.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                          {igDevices.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 ml-6">
                              {igDevices.map(igd => (
                                <div key={igd.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border text-xs">
                                  <Monitor className="w-3 h-3 text-muted-foreground" />
                                  <span>{igd.device?.name}</span>
                                  <button onClick={() => unlinkDeviceFromInternalGroup.mutate({ internalGroupId: ig.id, deviceId: igd.device_id })} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Ungrouped Devices */}
                    {ungroupedDevices.length > 0 && (
                      <div className="flex flex-col gap-2 p-3 rounded-lg border border-dashed bg-muted/5">
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">Dispositivos sem setor</span>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">{ungroupedDevices.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5 ml-6">
                          {ungroupedDevices.map(device => (
                            <div key={device.id} className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border text-xs">
                              <Monitor className="w-3 h-3 text-muted-foreground" />
                              <span>{device.name}</span>
                              <span className="text-[10px] text-muted-foreground">({device.device_code})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {storeGroups.length === 0 && ungroupedDevices.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum setor ou dispositivo nesta loja</p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Global Group Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGroup ? "Editar Grupo" : "Criar Grupo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Grupo *</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Heineken, Litoral..." />
            </div>
            <div className="space-y-2">
              <Label>Grupo Pai</Label>
              <Select value={formData.parent_id} onValueChange={v => setFormData({ ...formData, parent_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem pai (Raiz)</SelectItem>
                  {groups.filter(g => g.id !== editingGroup?.id).map(g => (<SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor do Grupo</Label>
              <p className="text-xs text-muted-foreground">Define a identidade visual nos cards e conectores</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, color: "auto" })}
                  className={cn(
                    "h-9 px-3 rounded-md border text-xs font-medium transition-all flex items-center gap-2",
                    formData.color === "auto"
                      ? "border-foreground/40 bg-muted shadow-sm"
                      : "border-border bg-background hover:border-foreground/20"
                  )}
                  aria-label="Cor automática"
                >
                  <span className="h-4 w-4 rounded-full border border-border bg-gradient-to-br from-blue-300 via-violet-300 to-rose-300" />
                  Auto
                </button>
                {GROUP_COLOR_PALETTE.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c.key })}
                    className={cn(
                      "h-9 w-9 rounded-md border transition-all flex items-center justify-center",
                      formData.color === c.key
                        ? "border-foreground/60 ring-2 ring-foreground/20 shadow-sm scale-105"
                        : "border-border hover:border-foreground/30"
                    )}
                    aria-label={COLOR_LABELS[c.key]}
                    title={COLOR_LABELS[c.key]}
                  >
                    <span className={cn("h-4 w-4 rounded-full", COLOR_SWATCHES[c.key])} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
              <Label className="text-sm font-semibold">Playlist</Label>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input type="radio" id="inherit" checked={formData.inherit_playlist} onChange={() => setFormData({ ...formData, inherit_playlist: true })} />
                  <Label htmlFor="inherit" className="font-normal cursor-pointer">Herdar do grupo pai</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" id="custom" checked={!formData.inherit_playlist} onChange={() => setFormData({ ...formData, inherit_playlist: false })} />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">Selecionar outra</Label>
                </div>
              </div>
              {!formData.inherit_playlist && (
                <Select value={formData.playlist_id} onValueChange={v => setFormData({ ...formData, playlist_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {playlists.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>{editingGroup ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Device to Global Group Dialog */}
      <Dialog open={!!linkGroupId} onOpenChange={() => setLinkGroupId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Vincular Dispositivo — "{linkGroupName}"</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar dispositivo..." value={deviceSearch} onChange={e => setDeviceSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-1 border rounded-lg p-2">
              {availableDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{deviceSearch ? "Nenhum encontrado" : "Todos já vinculados"}</p>
              ) : (
                availableDevices.map(device => (
                  <button key={device.id} onClick={() => handleLinkDevice(device.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left">
                    <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{device.name}</span>
                      <span className="text-xs text-muted-foreground">{device.device_code}</span>
                    </div>
                    <Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 shrink-0">{device.status}</Badge>
                    <Plus className="w-4 h-4 text-primary shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Segmentation Dialog: link stores or devices to global group */}
      <Dialog open={!!segmentGroupId} onOpenChange={() => setSegmentGroupId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Segmentar Grupo — "{segmentGroupName}"</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={segmentTab === "stores" ? "Buscar loja..." : "Buscar dispositivo..."} 
                value={segmentSearch} 
                onChange={e => setSegmentSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>

            <Tabs value={segmentTab} onValueChange={v => setSegmentTab(v as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stores">Lojas</TabsTrigger> 
                {/* <TabsTrigger value="devices">Dispositivos</TabsTrigger> */}
              </TabsList>
              
              <TabsContent value="stores" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg p-2">
                  {filteredStores.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma loja encontrada.</p>
                  ) : (
                    filteredStores.map(store => (
                      <label key={store.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                        <Checkbox 
                          checked={segmentStoreSelections.has(store.id)} 
                          onCheckedChange={() => handleToggleStoreSegment(store.id)} 
                        />
                        <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">{store.name}</span>
                          <span className="text-xs text-muted-foreground">{store.code}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="devices" className="mt-4">
                <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-lg p-2">
                  {availableDevices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {segmentSearch ? "Nenhum dispositivo encontrado." : "Todos os dispositivos já vinculados."}
                    </p>
                  ) : (
                    availableDevices.map(device => (
                      <button 
                        key={device.id} 
                        onClick={() => handleLinkDevice(device.id)} 
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">{device.name}</span>
                          <span className="text-xs text-muted-foreground">{device.device_code}</span>
                        </div>
                        <Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="text-[10px] py-0 px-1.5 shrink-0">{device.status}</Badge>
                        <Plus className="w-4 h-4 text-primary shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSegmentGroupId(null)}>Cancelar</Button>
            {segmentTab === "stores" && (
              <Button onClick={handleSaveSegments} disabled={linkStore.isPending}>Salvar Lojas</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Internal Group Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Criar Setor em Lojas</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Setor *</Label>
              <Input value={bulkName} onChange={e => setBulkName(e.target.value)} placeholder="Ex: Bebidas, Açougue, Hortifruti..." />
            </div>
            <div className="space-y-2">
              <Label>Selecione as lojas</Label>
              <div className="max-h-[250px] overflow-y-auto space-y-1 border rounded-lg p-2">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer border-b mb-1 pb-2">
                  <Checkbox checked={bulkSelectedStores.length === stores.length && stores.length > 0} onCheckedChange={(checked) => {
                    setBulkSelectedStores(checked ? stores.map(s => s.id) : []);
                  }} />
                  <span className="text-sm font-semibold">Selecionar todas</span>
                </label>
                {stores.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer transition-colors">
                    <Checkbox checked={bulkSelectedStores.includes(s.id)} onCheckedChange={(checked) => {
                      setBulkSelectedStores(prev => checked ? [...prev, s.id] : prev.filter(id => id !== s.id));
                    }} />
                    <Store className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{s.name}</span>
                    <span className="text-xs text-muted-foreground">({s.code})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!bulkName || bulkSelectedStores.length === 0) return;
              createBulkInternalGroups.mutate({ name: bulkName, storeIds: bulkSelectedStores }, { onSuccess: () => setBulkDialogOpen(false) });
            }} disabled={!bulkName || bulkSelectedStores.length === 0 || createBulkInternalGroups.isPending}>
              Criar em {bulkSelectedStores.length} loja(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Device to Internal Group Dialog */}
      <Dialog open={!!internalLinkGroupId} onOpenChange={() => setInternalLinkGroupId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular Dispositivo ao Setor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar dispositivo da loja..." value={internalDeviceSearch} onChange={e => setInternalDeviceSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-[320px] overflow-y-auto space-y-1 border rounded-lg p-2">
              {internalAvailableDevices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum dispositivo disponível nesta loja</p>
              ) : (
                internalAvailableDevices.map(device => (
                  <button key={device.id} onClick={() => linkDeviceToInternalGroup.mutate({ internalGroupId: internalLinkGroupId!, deviceId: device.id })} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left">
                    <Monitor className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{device.name}</span>
                      <span className="text-xs text-muted-foreground">{device.device_code}</span>
                    </div>
                    <Plus className="w-4 h-4 text-primary shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os subgrupos e vínculos também serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteGroup.mutate(deleteId, { onSuccess: () => setDeleteId(null) })} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageShell>
  );
};

export default GroupsPage;
