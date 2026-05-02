import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, Monitor, Store as StoreIcon, MoreVertical, Plus, Edit2, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlaylistBadge } from "./PlaylistBadge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Group } from "@/hooks/use-groups";
import { Device } from "@/hooks/use-devices";
import { Store } from "@/hooks/use-stores";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

interface EnrichedDevice extends Device {
  origin?: 'direto' | 'loja';
}

interface EnrichedGroup extends Group {
  devices?: EnrichedDevice[];
}

interface GroupTreeNodeProps {
  node: EnrichedGroup;
  allGroups: EnrichedGroup[];
  allStores: Store[];
  allDevices: Device[];
  level?: number;
  onAction: (type: 'create' | 'edit' | 'delete' | 'stores' | 'devices', group: EnrichedGroup) => void;
}

export function GroupTreeNode({ node, allGroups, allStores, allDevices, level = 0, onAction }: GroupTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(level < 1); // Expand first level by default
  const childrenGroups = allGroups.filter(g => g.parent_id === node.id);
  const childrenStores = allStores.filter(s => node.linked_store_ids?.includes(s.id));
  const hasChildren = childrenGroups.length > 0 || childrenStores.length > 0;

  const { setNodeRef, isOver } = useDroppable({
    id: `group-${node.id}`,
    data: {
      type: 'group',
      group: node
    }
  });

  // Inheritance logic for UI
  const getInheritedPlaylist = (currentId: string | null): { name: string | null, from: string | null } => {
    if (!currentId) return { name: null, from: null };
    const group = allGroups.find(g => g.id === currentId);
    if (!group) return { name: null, from: null };
    
    if (group.playlist_id) return { name: group.playlist_name || 'Playlist', from: group.name };
    
    if (group.parent_id) return getInheritedPlaylist(group.parent_id);
    
    return { name: null, from: null };
  };

  const inherited = !node.playlist_id ? getInheritedPlaylist(node.parent_id) : { name: null, from: null };

  return (
    <div className="space-y-1">
      <div 
        ref={setNodeRef}
        className={cn(
          "group flex items-center gap-2 p-2 rounded-lg transition-all cursor-default border",
          isOver 
            ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]" 
            : "hover:bg-white/5 border-transparent hover:border-white/10"
        )}
        style={{ marginLeft: `${level * 20}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 p-0 hover:bg-white/10" 
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          ) : (
            <div className="w-5" />
          )}
          
          <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
            <Folder className="w-4 h-4" />
          </div>
          
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{node.name}</span>
            <div className="flex items-center gap-2">
              <PlaylistBadge 
                playlistName={node.playlist_id ? node.playlist_name || 'Playlist' : inherited.name}
                isInherited={!node.playlist_id}
                inheritedFromName={inherited.from}
              />
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                <span className="flex items-center gap-0.5"><Monitor className="w-3 h-3" /> {node.device_count}</span>
                <span className="flex items-center gap-0.5"><StoreIcon className="w-3 h-3" /> {node.store_count}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => onAction('edit', node)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-md border-white/10">
              <DropdownMenuItem className="gap-2" onClick={() => onAction('create', node)}>
                <Plus className="w-4 h-4" /> Novo Subgrupo
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => onAction('stores', node)}>
                <StoreIcon className="w-4 h-4" /> Gerenciar Lojas
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={() => onAction('devices', node)}>
                <Monitor className="w-4 h-4" /> Vincular Dispositivos
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => onAction('delete', node)}>
                <Trash2 className="w-4 h-4" /> Excluir Grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Direct Devices Badges */}
      {isOpen && node.devices && node.devices.length > 0 && (
        <div 
          className="flex flex-wrap gap-1.5 pb-2" 
          style={{ marginLeft: `${(level * 20) + 48}px` }}
        >
          {node.devices.map(device => (
            <Badge 
              key={device.id} 
              variant="outline" 
              className={cn(
                "text-[9px] py-0 h-4 border-white/5 flex items-center gap-1.5 px-2",
                device.origin === 'direto' 
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/20' 
                  : 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
              )}
            >
              <div className={cn(
                "w-1 h-1 rounded-full",
                device.origin === 'direto' ? 'bg-blue-400' : 'bg-yellow-400'
              )} />
              {device.nome}
              <span className="opacity-40 font-normal">({device.num_filial || 'Livre'})</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Children: Subgroups and Stores */}
      {isOpen && hasChildren && (
        <div className="space-y-1">
          {childrenGroups.map(child => (
            <GroupTreeNode 
              key={child.id} 
              node={child} 
              allGroups={allGroups} 
              allStores={allStores}
              allDevices={allDevices}
              level={level + 1} 
              onAction={onAction}
            />
          ))}
          
          {childrenStores.map(store => {
            const storeDevices = allDevices.filter(d => d.store_id === store.id);
            return (
              <StoreTreeNode 
                key={store.id} 
                store={store} 
                node={node} 
                level={level} 
                inherited={inherited} 
                storeDevices={storeDevices} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function StoreTreeNode({ store, node, level, inherited, storeDevices }: { 
  store: Store, 
  node: EnrichedGroup, 
  level: number, 
  inherited: any, 
  storeDevices: Device[] 
}) {
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `store-${store.id}`,
    data: {
      type: 'store',
      store: store
    }
  });

  return (
    <div className="space-y-1">
      <div 
        ref={setNodeRef}
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg transition-all cursor-default border",
          isOver 
            ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
            : "hover:bg-white/5 border-transparent"
        )}
        style={{ marginLeft: `${(level + 1) * 20}px` }}
      >
        {storeDevices.length > 0 ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 p-0 hover:bg-white/10" 
            onClick={() => setIsStoreOpen(!isStoreOpen)}
          >
            {isStoreOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </Button>
        ) : (
          <div className="w-5" />
        )}
        <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
          <StoreIcon className="w-4 h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{store.name} <span className="text-xs text-muted-foreground font-normal">({store.code})</span></span>
          <div className="flex items-center gap-2">
            <PlaylistBadge 
              playlistName={store.playlist_name || node.playlist_name || inherited.name || 'Playlist Padrão'}
              isInherited={!store.playlist_id}
              inheritedFromName={!store.playlist_id ? (store.playlist_name ? "Própria" : (node.playlist_id ? node.name : inherited.from)) : null}
            />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
              <Monitor className="w-3 h-3" /> {storeDevices.length}
            </div>
          </div>
        </div>
      </div>

      {isStoreOpen && storeDevices.length > 0 && (
        <div className="space-y-1" style={{ marginLeft: `${(level + 2) * 20 + 20}px` }}>
          {storeDevices.map(device => (
            <div key={device.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-white/5 group/device transition-colors">
              <Monitor className="w-3.5 h-3.5 text-white/20" />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate text-white/80">{device.nome}</span>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[8px] h-3.5 bg-blue-500/5 text-blue-400 border-blue-500/10">LOJA</Badge>
                  <div className={cn(
                    "w-1 h-1 rounded-full",
                    device.last_online && (new Date().getTime() - new Date(device.last_online).getTime() < 300000) ? "bg-green-500" : "bg-red-500"
                  )} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
