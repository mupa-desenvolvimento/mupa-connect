import React, { useState, useEffect, useCallback } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Plus, 
  Search, 
  Image as ImageIcon, 
  Video, 
  Clock, 
  GripVertical, 
  Trash2,
  Layers,
  CheckCircle2,
  Loader2,
  X,
  PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMedias, useTenant } from "@/hooks/use-playlist-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CampaignMedia {
  id: string;
  media_id: string;
  position: number;
  duration_override?: number;
  media: any;
}

interface CampaignContentManagerProps {
  campaignId: string;
}

const DraggableLibraryItem = ({ media, onClick, isSelected, onToggleSelect }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lib-${media.id}`,
    data: {
      type: 'library-media',
      media: media
    }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border transition-all group",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-white/10 hover:border-primary",
        isDragging && "opacity-50 ring-2 ring-primary z-50"
      )}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onToggleSelect(media.id);
        } else {
          onClick(media.id);
        }
      }}
    >
      <img src={media.thumbnail_url || media.file_url} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      
      <div 
        {...listeners} 
        {...attributes}
        className="absolute inset-0 z-10"
      />

      <div className="absolute top-1 right-1 z-20">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(media.id);
          }}
          className={cn(
            "h-4 w-4 rounded border flex items-center justify-center transition-colors",
            isSelected ? "bg-primary border-primary" : "bg-black/40 border-white/20 hover:border-white/40"
          )}
        >
          {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
        </div>
      </div>

      <div className="absolute bottom-1 left-1 right-1 text-[10px] truncate bg-black/60 px-1 rounded font-bold text-white/90 z-20">
        {media.name}
      </div>
    </div>
  );
};

const SortableCampaignItem = ({ item, index, onRemove, onUpdateDuration }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id 
  });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 50 : 1, 
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={cn(
        "relative shrink-0 w-[140px] h-[180px] rounded-xl border border-white/10 bg-[#1A1A1E] overflow-hidden flex flex-col transition-all group",
        isDragging && "border-primary shadow-glow"
      )}
    >
      <div className="relative h-[100px] w-full overflow-hidden bg-black/40">
        <img 
          src={item.media?.thumbnail_url || item.media?.file_url} 
          className="w-full h-full object-cover" 
        />
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-6 w-6 text-white" />
        </div>
        <button 
          onClick={() => onRemove(item.id)}
          className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white/60 hover:text-red-500 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white/80 border border-white/10">
          {index + 1}
        </div>
      </div>

      <div className="flex-1 p-2 flex flex-col justify-between">
        <p className="text-[10px] font-bold text-white/90 truncate">{item.media?.name}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-primary" />
            <input 
              type="number" 
              value={item.duration_override || item.media?.duration || 10} 
              onChange={(e) => onUpdateDuration(item.id, parseInt(e.target.value))}
              className="w-8 bg-transparent border-none text-[10px] font-bold text-white focus:ring-0 p-0"
            />
            <span className="text-[9px] text-white/40">s</span>
          </div>
          {item.media?.type === 'video' ? <Video className="h-3 w-3 text-white/20" /> : <ImageIcon className="h-3 w-3 text-white/20" />}
        </div>
      </div>
    </div>
  );
};

export function CampaignContentManager({ campaignId }: CampaignContentManagerProps) {
  const { tenantId } = useUserRole();
  const { data: libraryMedia, isLoading: loadingLibrary } = useMedias(tenantId as string);
  const [campaignItems, setCampaignItems] = useState<CampaignMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<any>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (campaignId) {
      fetchCampaignContent();
    }
  }, [campaignId]);

  const fetchCampaignContent = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_contents")
        .select("*, media:media_items(*)")
        .eq("campaign_id", campaignId)
        .order("position");

      if (error) throw error;
      setCampaignItems(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar conteúdo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (items: CampaignMedia[]) => {
    try {
      // Deletar conteúdo atual
      await supabase
        .from("campaign_contents")
        .delete()
        .eq("campaign_id", campaignId);

      // Inserir novo conteúdo
      if (items.length > 0) {
        const payload = items.map((item, index) => ({
          campaign_id: campaignId,
          media_id: item.media_id,
          position: index,
          duration_override: item.duration_override,
          tenant_id: tenantId
        }));

        const { error } = await supabase
          .from("campaign_contents")
          .insert(payload);

        if (error) throw error;
      }
      
      toast.success("Conteúdo da campanha atualizado");
    } catch (error: any) {
      toast.error("Erro ao salvar conteúdo: " + error.message);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Se estiver arrastando da biblioteca para a campanha
    if (active.data.current?.type === 'library-media') {
      const media = active.data.current.media;
      const newItem: CampaignMedia = {
        id: crypto.randomUUID(),
        media_id: media.id,
        position: campaignItems.length,
        duration_override: media.duration,
        media: media
      };
      const newItems = [...campaignItems, newItem];
      setCampaignItems(newItems);
      saveContent(newItems);
      return;
    }

    // Se estiver reordenando a campanha
    if (active.id !== over.id) {
      const oldIndex = campaignItems.findIndex(i => i.id === active.id);
      const newIndex = campaignItems.findIndex(i => i.id === over.id);
      const newItems = arrayMove(campaignItems, oldIndex, newIndex);
      setCampaignItems(newItems);
      saveContent(newItems);
    }
  };

  const handleAddSelected = () => {
    const selectedMedias = libraryMedia?.filter(m => selectedMedia.includes(m.id)) || [];
    const newItems = [
      ...campaignItems,
      ...selectedMedias.map((media, index) => ({
        id: crypto.randomUUID(),
        media_id: media.id,
        position: campaignItems.length + index,
        duration_override: media.duration,
        media: media
      }))
    ];
    setCampaignItems(newItems);
    saveContent(newItems);
    setSelectedMedia([]);
  };

  const handleRemove = (id: string) => {
    const newItems = campaignItems.filter(i => i.id !== id);
    setCampaignItems(newItems);
    saveContent(newItems);
  };

  const handleUpdateDuration = (id: string, duration: number) => {
    const newItems = campaignItems.map(i => i.id === id ? { ...i, duration_override: duration } : i);
    setCampaignItems(newItems);
    // Podemos deboucear o save se necessário, mas por enquanto vamos salvar direto
    saveContent(newItems);
  };

  const filteredLibrary = libraryMedia?.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-[500px] border rounded-xl overflow-hidden bg-background">
      {/* Sidebar: Media Library */}
      <div className="w-[300px] border-r flex flex-col bg-muted/20">
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Biblioteca
            </h3>
            {selectedMedia.length > 0 && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => setSelectedMedia([])}>
                Limpar ({selectedMedia.length})
              </Button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Buscar mídias..." 
              className="pl-8 h-8 text-xs bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 grid grid-cols-2 gap-2">
            {filteredLibrary?.map((media) => (
              <DraggableLibraryItem 
                key={media.id} 
                media={media} 
                isSelected={selectedMedia.includes(media.id)}
                onToggleSelect={(id: string) => {
                  setSelectedMedia(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                }}
                onClick={() => {
                  const newItem: CampaignMedia = {
                    id: crypto.randomUUID(),
                    media_id: media.id,
                    position: campaignItems.length,
                    duration_override: media.duration,
                    media: media
                  };
                  const newItems = [...campaignItems, newItem];
                  setCampaignItems(newItems);
                  saveContent(newItems);
                }}
              />
            ))}
          </div>
        </ScrollArea>

        {selectedMedia.length > 0 && (
          <div className="p-3 border-t bg-background">
            <Button className="w-full h-8 text-xs gap-2" onClick={handleAddSelected}>
              <PlusCircle className="h-3.5 w-3.5" /> Adicionar Selecionados
            </Button>
          </div>
        )}
      </div>

      {/* Main Area: Campaign Content */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col overflow-hidden bg-black/5">
          <div className="p-3 border-b flex items-center justify-between bg-background">
            <h3 className="text-sm font-bold">Conteúdo da Campanha</h3>
            <Badge variant="outline" className="text-[10px] font-bold">
              {campaignItems.length} Itens
            </Badge>
          </div>

          <div className="flex-1 flex items-center p-6 overflow-x-auto overflow-y-hidden">
            <SortableContext items={campaignItems.map(i => i.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4">
                {campaignItems.map((item, index) => (
                  <SortableCampaignItem 
                    key={item.id} 
                    item={item} 
                    index={index} 
                    onRemove={handleRemove}
                    onUpdateDuration={handleUpdateDuration}
                  />
                ))}
                
                {campaignItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center min-w-[300px] h-[180px] border-2 border-dashed rounded-2xl border-white/10 text-muted-foreground gap-3">
                    <Plus className="h-8 w-8 opacity-20" />
                    <p className="text-sm font-medium">Arraste mídias aqui ou clique para adicionar</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="w-[140px] h-[180px] rounded-xl border border-primary bg-[#1A1A1E] overflow-hidden flex flex-col shadow-2xl scale-105">
               {/* Simplified preview for dragging */}
               <div className="h-[100px] w-full bg-primary/20 flex items-center justify-center">
                 <ImageIcon className="h-8 w-8 text-primary opacity-50" />
               </div>
               <div className="p-2">
                 <div className="h-2 w-full bg-white/10 rounded mb-2" />
                 <div className="h-2 w-1/2 bg-white/5 rounded" />
               </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}