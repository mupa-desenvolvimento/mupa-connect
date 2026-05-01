import React, { useState } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Store, 
  Layers, 
  Monitor, 
  Edit2, 
  Plus, 
  X, 
  MoreHorizontal,
  LayoutGrid,
  Settings,
  Trash2,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TreeNode, NodeType } from "./GroupTreeView";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDroppable } from "@dnd-kit/core";

interface GroupCardProps {
  node: TreeNode;
  level?: number;
  onNodeClick?: (node: TreeNode) => void;
  onEditPlaylist?: (node: TreeNode) => void;
  onRemoveDevice?: (deviceId: string) => void;
  onCreateSubgroup?: (parentId: string) => void;
  onDeleteGroup?: (node: TreeNode) => void;
  onSegmentGroup?: (node: TreeNode) => void;
  onLinkToGroup?: (node: TreeNode) => void;
}

export const GroupCard = ({ 
  node, 
  level = 0, 
  onNodeClick, 
  onEditPlaylist,
  onRemoveDevice,
  onCreateSubgroup,
  onDeleteGroup,
  onSegmentGroup,
  onLinkToGroup
}: GroupCardProps) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  
  const { setNodeRef, isOver } = useDroppable({
    id: node.id,
    data: {
      type: node.type,
      node: node
    }
  });

  const getStatusColor = (node: TreeNode) => {
    if (node.has_conflict) return "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]";
    if (node.playlist_id && !node.inherited_from) return "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]";
    if (node.has_override) return "border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]";
    if (node.inherited_from) return "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]";
    return "border-white/5";
  };

  const getStatusLabel = (node: TreeNode) => {
    if (node.has_conflict) return "Conflito";
    if (node.playlist_id && !node.inherited_from) return "Override";
    if (node.has_override) return "Modificado";
    if (node.inherited_from) return "Herdado";
    return "Nenhum";
  };

  const getIcon = (type: NodeType) => {
    switch (type) {
      case 'store_group': return <Layers className="w-4 h-4" />;
      case 'store': return <Store className="w-4 h-4" />;
      case 'device_group': return <LayoutGrid className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full" style={{ paddingLeft: level > 0 ? '24px' : '0' }}>
      <motion.div
        ref={setNodeRef}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative flex flex-col rounded-xl bg-[#18181b]/60 border transition-all duration-200 overflow-hidden",
          getStatusColor(node),
          isOver && "ring-2 ring-primary/50 bg-primary/5",
          "hover:bg-[#18181b]/80"
        )}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 text-white/70 transition-transform",
              isExpanded && "rotate-90"
            )}>
              <ChevronRight className="w-4 h-4" />
            </div>
            
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white truncate">{node.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-2 h-4 border-white/10 text-white/40">
                  {node.type.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-white/40 flex items-center gap-1">
                  {getIcon(node.type)}
                  {node.playlist_name || "Sem Playlist"}
                </span>
                <span className="text-[11px] text-white/20">•</span>
                <span className="text-[11px] text-white/40">
                  {node.device_count || 0} dispositivos
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateSubgroup?.(node.id);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Adicionar Subgrupo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSegmentGroup?.(node);
                    }}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Segmentar</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#18181b] border-white/10 text-white">
                <DropdownMenuItem onClick={() => onEditPlaylist?.(node)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Editar Playlist
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLinkToGroup?.(node)}>
                  <Settings className="w-4 h-4 mr-2" /> Vincular
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-400 focus:text-red-400"
                  onClick={() => onDeleteGroup?.(node)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/5 bg-black/20"
            >
              <div className="p-4 flex flex-col gap-4">
                {/* Devices Section */}
                <div className="flex flex-wrap gap-2">
                  {(node.children || [])
                    .filter(c => c.type === 'device')
                    .map(device => (
                      <Badge 
                        key={device.id}
                        variant="secondary" 
                        className="bg-white/5 hover:bg-white/10 text-white/70 border-white/5 gap-2 pr-1 h-7"
                      >
                        <Monitor className="w-3 h-3 text-[#085CF0]" />
                        <span className="max-w-[120px] truncate">{device.name}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-5 h-5 rounded-full hover:bg-red-500/20 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveDevice?.(device.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  
                  {/* Segment Tags */}
                  {(node.children || [])
                    .filter(c => c.type === 'store')
                    .map(store => (
                      <Badge 
                        key={store.id}
                        variant="outline" 
                        className="border-[#085CF0]/30 bg-[#085CF0]/10 text-[#085CF0] gap-2 h-7"
                      >
                        <Store className="w-3 h-3" />
                        {store.name}
                      </Badge>
                    ))}

                  {/* Empty State */}
                  {(!node.children || node.children.length === 0) && (
                    <span className="text-[11px] text-white/20 italic py-1">
                      Nenhum dispositivo ou loja vinculada
                    </span>
                  )}
                </div>

                {/* Subgroups Area */}
                <div className="flex flex-col gap-2">
                  {(node.children || [])
                    .filter(c => c.type !== 'device' && c.type !== 'store')
                    .map(subgroup => (
                      <GroupCard 
                        key={subgroup.id} 
                        node={subgroup} 
                        level={1}
                        onNodeClick={onNodeClick}
                        onEditPlaylist={onEditPlaylist}
                        onRemoveDevice={onRemoveDevice}
                        onCreateSubgroup={onCreateSubgroup}
                        onDeleteGroup={onDeleteGroup}
                        onSegmentGroup={onSegmentGroup}
                        onLinkToGroup={onLinkToGroup}
                      />
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
