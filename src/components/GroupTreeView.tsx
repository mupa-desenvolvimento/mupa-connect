import { useState, useMemo } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Store, 
  Layers, 
  Monitor, 
  Search,
  Info,
  Edit2,
  Plus,
  GripVertical,
  AlertCircle,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Virtuoso } from "react-virtuoso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type NodeType = 'store_group' | 'store' | 'device_group' | 'device';

export interface TreeNode {
  id: string;
  name: string;
  type: NodeType;
  playlist_id?: string | null;
  playlist_name?: string | null;
  inherited_from?: string | null;
  has_override?: boolean;
  has_conflict?: boolean;
  device_count?: number;
  parentId?: string | null;
  children?: TreeNode[];
}

interface FlattenedNode extends TreeNode {
  level: number;
  isOpen: boolean;
  isFiltered: boolean;
  path: string[];
}

interface GroupTreeViewProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  onEditPlaylist?: (node: TreeNode) => void;
  onCreateGroup?: () => void;
  onMoveNode?: (nodeId: string, newParentId: string | null) => void;
  onRemoveDevice?: (deviceId: string) => void;
  activeId?: string | null;
}

const SortableNode = ({ 
  node, 
  index, 
  expandedIds, 
  toggleExpand, 
  onNodeClick, 
  onEditPlaylist,
  getNodeColor,
  getNodeIcon,
  getStatusLabel
}: { 
  node: FlattenedNode, 
  index: number,
  expandedIds: Set<string>,
  toggleExpand: (id: string, e: React.MouseEvent) => void,
  onNodeClick?: (node: TreeNode) => void,
  onEditPlaylist?: (node: TreeNode) => void,
  getNodeColor: (node: TreeNode) => string,
  getNodeIcon: (type: NodeType) => JSX.Element,
  getStatusLabel: (node: TreeNode) => string
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver
  } = useSortable({ 
    id: node.id,
    disabled: false, // Todos os nós agora são arrastáveis, incluindo dispositivos
    data: {
      type: node.type,
      node
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={{ ...style, paddingLeft: `${(node.level * 24) + 16}px` }}
      className={cn(
        "group relative flex items-center px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer border-l-2",
        expandedIds.has(node.id) ? "bg-white/5" : "bg-transparent",
        isOver && "bg-[#085CF0]/10 ring-2 ring-[#085CF0]/50 ring-inset",
        node.has_conflict ? "border-red-500" : 
        (node.playlist_id && !node.inherited_from) ? "border-green-500" :
        node.has_override ? "border-yellow-500" :
        node.inherited_from ? "border-blue-500" : "border-transparent"
      )}
      onClick={() => onNodeClick?.(node)}
    >
      {/* Connection Lines */}
      {node.level > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5" 
             style={{ left: `${(node.level * 24)}px` }} />
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div 
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-white/10 hover:text-white/40"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div 
          onClick={(e) => node.children?.length ? toggleExpand(node.id, e) : null}
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors",
            !node.children?.length && "invisible"
          )}
        >
          {node.isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>

        <div className={cn("p-1.5 rounded-lg", getNodeColor(node))}>
          {getNodeIcon(node.type)}
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {node.name}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-tighter">
              {node.type.replace('_', ' ')}
            </span>
            {node.device_count !== undefined && node.type !== 'device' && (
              <span className="text-[10px] text-white/20">
                • {node.device_count} disp.
              </span>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {node.playlist_id ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={cn("gap-1.5 py-0.5 px-2 border-white/5", getNodeColor(node))}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", 
                      node.has_conflict ? "bg-red-500" : 
                      (node.playlist_id && !node.inherited_from) ? "bg-green-500" :
                      node.has_override ? "bg-yellow-500" : "bg-blue-500"
                    )} />
                    <span className="max-w-[80px] truncate">{node.playlist_name}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-[#18181b] border-white/10 text-white p-3 shadow-2xl">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
                      <Info className="w-3 h-3 text-[#085CF0]" />
                      <span className="text-xs font-bold uppercase tracking-widest">Herança</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-white/40">Status:</span>
                      <span className="font-bold">{getStatusLabel(node)}</span>
                      <span className="text-white/40">Origem:</span>
                      <span className="font-bold text-blue-400 truncate max-w-[120px]">
                        {node.inherited_from || "Local"}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Badge variant="outline" className="text-white/20 border-white/5">
              Vazio
            </Badge>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-white/40 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onEditPlaylist?.(node);
            }}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>

          {node.type === 'device' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveDevice?.(node.id);
                    }}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-red-900 border-red-500/20 text-white">
                  <p className="text-xs font-bold">Remover do Grupo</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
};

export function GroupTreeView({ data, onNodeClick, onEditPlaylist, onCreateGroup, onMoveNode, onRemoveDevice, activeId }: GroupTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Sensors and DndContext moved to parent (GroupsPage) to allow dragging from Available Devices panel

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const flattenedData = useMemo(() => {
    const result: FlattenedNode[] = [];
    const query = searchQuery.toLowerCase();

    function flatten(nodes: TreeNode[], level: number = 0, parentPath: string[] = []) {
      nodes.forEach(node => {
        const path = [...parentPath, node.id];
        const isMatch = node.name.toLowerCase().includes(query) || 
                        node.playlist_name?.toLowerCase().includes(query);
        
        const flattenedNode: FlattenedNode = {
          ...node,
          level,
          isOpen: expandedIds.has(node.id),
          isFiltered: query !== "" ? isMatch : true,
          path
        };

        // If searching, we want to show nodes that match or have children that match
        let shouldInclude = flattenedNode.isFiltered;
        
        if (query !== "" && node.children) {
          const hasMatchingChild = (children: TreeNode[]): boolean => {
            return children.some(c => 
              c.name.toLowerCase().includes(query) || 
              c.playlist_name?.toLowerCase().includes(query) ||
              (c.children && hasMatchingChild(c.children))
            );
          };
          if (hasMatchingChild(node.children)) {
            shouldInclude = true;
            // Auto-expand parents of matching children
            if (!expandedIds.has(node.id)) {
              setExpandedIds(prev => new Set(prev).add(node.id));
            }
          }
        }

        if (shouldInclude || query === "") {
          result.push(flattenedNode);
          if (flattenedNode.isOpen && node.children) {
            flatten(node.children, level + 1, path);
          }
        }
      });
    }

    flatten(data);
    return result;
  }, [data, expandedIds, searchQuery]);

  const getNodeColor = (node: TreeNode) => {
    if (node.has_conflict) return "border-red-500/50 bg-red-500/10 text-red-400";
    if (node.playlist_id && !node.inherited_from) return "border-green-500/50 bg-green-500/10 text-green-400";
    if (node.has_override) return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
    if (node.inherited_from) return "border-blue-500/50 bg-blue-500/10 text-blue-400";
    return "border-white/10 bg-white/5 text-white/40";
  };

  const getStatusLabel = (node: TreeNode) => {
    if (node.has_conflict) return "Conflito";
    if (node.playlist_id && !node.inherited_from) return "Override Direto";
    if (node.has_override) return "Herdado com Modificação";
    if (node.inherited_from) return "Herdado";
    return "Sem Playlist";
  };

  const getNodeIcon = (type: NodeType) => {
    switch (type) {
      case 'store_group': return <Layers className="w-4 h-4" />;
      case 'store': return <Store className="w-4 h-4" />;
      case 'device_group': return <Monitor className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input 
            placeholder="Buscar grupos, lojas ou dispositivos..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-black/40 border-white/10 focus:ring-[#085CF0]/50 h-10"
          />
        </div>
        <Button 
          onClick={onCreateGroup}
          className="bg-[#085CF0] hover:bg-[#0750d4] text-white gap-2 shrink-0 h-10 px-4"
        >
          <Plus className="w-4 h-4" /> Novo Grupo Pai
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <div className="h-full">
          <SortableContext
            items={flattenedData.map(n => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <Virtuoso
              data={flattenedData}
              totalCount={flattenedData.length}
              itemContent={(index, node) => (
                <SortableNode 
                  node={node}
                  index={index}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  onNodeClick={onNodeClick}
                  onEditPlaylist={onEditPlaylist}
                  getNodeColor={getNodeColor}
                  getNodeIcon={getNodeIcon}
                  getStatusLabel={getStatusLabel}
                  onRemoveDevice={onRemoveDevice}
                />
              )}
            />
          </SortableContext>
        </div>
      </div>

      {/* Legend / Footer */}
      <div className="px-4 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Override</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Herdado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Herdado c/ Mod.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Conflito</span>
          </div>
        </div>
        <div className="text-[10px] text-white/20">
          Total: {data.length} Grupos
        </div>
      </div>
    </div>
  );
}
