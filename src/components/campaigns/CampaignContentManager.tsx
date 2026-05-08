import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
  rectIntersection
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
  PlusCircle,
  Settings2,
  Lock,
  Unlock,
  Maximize2,
  Monitor,
  Filter,
  CheckCircle,
  FileVideo,
  FileImage,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useMedias } from "@/hooks/use-playlist-data";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface CampaignMedia {
  id: string;
  media_id: string;
  position: number;
  duration_override?: number;
  priority_override?: number;
  is_locked?: boolean;
  media: any;
}

interface CampaignContentManagerProps {
  campaignId: string;
  onContentChange?: () => void;
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
        "relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1e] cursor-pointer border-2 transition-all group shadow-lg",
        isSelected ? "border-primary ring-4 ring-primary/20" : "border-white/5 hover:border-white/20",
        isDragging && "opacity-50 ring-2 ring-primary z-50 scale-95"
      )}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onToggleSelect(media.id);
        } else {
          onClick(media.id);
        }
      }}
    >
      <img src={media.thumbnail_url || media.file_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
      
      <div 
        {...listeners} 
        {...attributes}
        className="absolute inset-0 z-10"
      />

      <div className="absolute top-2 right-2 z-20">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(media.id);
          }}
          className={cn(
            "h-5 w-5 rounded-md border flex items-center justify-center transition-all",
            isSelected ? "bg-primary border-primary shadow-glow" : "bg-black/40 border-white/10 hover:border-white/30"
          )}
        >
          {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
        </div>
      </div>

      <div className="absolute bottom-2 left-2 right-2 z-20">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/90 truncate drop-shadow-lg mb-1">
          {media.name}
        </p>
        <div className="flex items-center gap-2">
          <Badge className="bg-black/60 border-none text-[8px] h-3.5 px-1 font-bold text-white/40">
            {media.type === 'video' ? <FileVideo className="h-2.5 w-2.5 mr-1" /> : <FileImage className="h-2.5 w-2.5 mr-1" />}
            {media.type?.toUpperCase()}
          </Badge>
          <span className="text-[8px] font-bold text-white/40">{media.duration || 10}s</span>
        </div>
      </div>
    </div>
  );
};

const SortableCampaignItem = ({ item, index, isSelected, onSelect, onRemove, onToggleLock }: any) => {
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
      onClick={() => onSelect(item)}
      className={cn(
        "relative shrink-0 w-[180px] h-[240px] rounded-2xl border-2 bg-[#1A1A1E] overflow-hidden flex flex-col transition-all group cursor-pointer shadow-2xl",
        isSelected ? "border-primary ring-4 ring-primary/10 scale-[1.02]" : "border-white/5 hover:border-white/10",
        isDragging && "border-primary shadow-glow scale-95",
        item.is_locked && "opacity-80"
      )}
    >
      <div className="relative h-[160px] w-full overflow-hidden bg-black">
        <img 
          src={item.media?.thumbnail_url || item.media?.file_url} 
          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1E] via-transparent to-transparent" />
        
        {!item.is_locked && (
          <div 
            {...attributes} 
            {...listeners} 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity cursor-grab active:cursor-grabbing z-20"
          >
            <GripVertical className="h-8 w-8 text-white/40" />
          </div>
        )}

        <div className="absolute top-3 left-3 z-30">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-black/60 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white/90 border border-white/10">
              {index + 1}
            </span>
            {item.is_locked && (
              <Badge className="bg-orange-500/20 text-orange-500 border-none text-[8px] h-5 font-black tracking-widest px-2">
                <Lock className="h-2.5 w-2.5 mr-1" /> LOCK
              </Badge>
            )}
          </div>
        </div>

        <div className="absolute top-3 right-3 z-30 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!item.is_locked && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/90 truncate">{item.media?.name || 'Sem nome'}</p>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/5 border-none text-[8px] h-4 px-1.5 font-bold text-white/20">
              {item.media?.type === 'video' ? 'VIDEO' : 'IMAGE'}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md border border-white/5">
            <Clock className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-black text-white/60">
              {item.duration_override || item.media?.duration || 10}s
            </span>
          </div>
          {isSelected && (
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
      </div>

      {isSelected && (
        <div className="absolute inset-0 border-2 border-primary pointer-events-none rounded-2xl z-40 shadow-[inset_0_0_20px_rgba(var(--primary),0.2)]" />
      )}
    </div>
  );
};

export function CampaignContentManager({ campaignId }: CampaignContentManagerProps) {
  const { tenantId } = useUserRole();
  const { data: libraryMedia, isLoading: loadingLibrary } = useMedias(tenantId as string);
  const [campaignItems, setCampaignItems] = useState<CampaignMedia[]>([]);
  const [selectedItem, setSelectedItem] = useState<CampaignMedia | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

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
      const items = (data || []).map(item => ({
        ...item,
        is_locked: (item as any).is_locked || false,
        priority_override: (item as any).priority_override || 1
      }));
      setCampaignItems(items);
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
          priority_override: item.priority_override,
          is_locked: item.is_locked,
          tenant_id: tenantId
        }));

        const { error } = await supabase
          .from("campaign_contents")
          .insert(payload);

        if (error) throw error;
      }
      
      onContentChange?.();
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
        priority_override: 1,
        is_locked: false,
        media: media
      };
      const newItems = [...campaignItems, newItem];
      setCampaignItems(newItems);
      saveContent(newItems);
      return;
    }

    // Se estiver reordenando a campanha
    if (active.id !== over.id) {
      const activeItem = campaignItems.find(i => i.id === active.id);
      if (activeItem?.is_locked) {
        toast.error("Este item está bloqueado e não pode ser movido.");
        return;
      }

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
        priority_override: 1,
        is_locked: false,
        media: media
      }))
    ];
    setCampaignItems(newItems);
    saveContent(newItems);
    setSelectedMedia([]);
  };

  const handleRemove = (id: string) => {
    const item = campaignItems.find(i => i.id === id);
    if (item?.is_locked) {
      toast.error("Este item está bloqueado e não pode ser removido.");
      return;
    }
    const newItems = campaignItems.filter(i => i.id !== id);
    setCampaignItems(newItems);
    if (selectedItem?.id === id) setSelectedItem(null);
    saveContent(newItems);
  };

  const updateItemProperty = (id: string, property: string, value: any) => {
    const newItems = campaignItems.map(i => i.id === id ? { ...i, [property]: value } : i);
    setCampaignItems(newItems);
    if (selectedItem?.id === id) setSelectedItem({ ...selectedItem, [property]: value });
    saveContent(newItems);
  };

  const filteredLibrary = useMemo(() => {
    let result = libraryMedia || [];
    if (searchQuery) {
      result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterType !== 'all') {
      result = result.filter(m => m.type === filterType);
    }
    return result;
  }, [libraryMedia, searchQuery, filterType]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
        <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-primary">MUPA</div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Carregando Media Pool...</p>
    </div>
  );

  return (
    <div className="flex h-full bg-[#0c0c0e] overflow-hidden">
      <DndContext 
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
      >
        {/* ESQUERDA: BIBLIOTECA (MEDIA POOL) */}
        <aside className="w-[320px] border-r border-white/5 flex flex-col bg-[#0c0c0e]/60 z-30">
          <div className="p-5 border-b border-white/5 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                  <Monitor className="h-3 w-3 text-primary" /> Media Pool
                </h3>
                <p className="text-sm font-black text-white uppercase tracking-tighter">Biblioteca</p>
              </div>
              {selectedMedia.length > 0 && (
                <Badge className="bg-primary text-white text-[10px] font-black px-2 py-0.5 shadow-glow animate-in zoom-in">
                  {selectedMedia.length}
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Pesquisar mídias..." 
                  className="pl-10 h-10 text-xs bg-black/40 border-white/5 focus:border-primary/30 transition-all rounded-xl text-white font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setFilterType("all")}
                  className={cn("h-7 px-3 text-[9px] font-black uppercase tracking-widest rounded-full", filterType === "all" ? "bg-white text-black" : "text-white/40 bg-white/5")}
                >
                  Tudo
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setFilterType("video")}
                  className={cn("h-7 px-3 text-[9px] font-black uppercase tracking-widest rounded-full", filterType === "video" ? "bg-white text-black" : "text-white/40 bg-white/5")}
                >
                  Vídeos
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setFilterType("image")}
                  className={cn("h-7 px-3 text-[9px] font-black uppercase tracking-widest rounded-full", filterType === "image" ? "bg-white text-black" : "text-white/40 bg-white/5")}
                >
                  Imagens
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="p-5 grid grid-cols-2 gap-4">
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
                      priority_override: 1,
                      is_locked: false,
                      media: media
                    };
                    const newItems = [...campaignItems, newItem];
                    setCampaignItems(newItems);
                    saveContent(newItems);
                  }}
                />
              ))}
              {filteredLibrary?.length === 0 && (
                <div className="col-span-2 py-10 text-center opacity-20">
                  <Monitor className="h-10 w-10 mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma mídia encontrada</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {selectedMedia.length > 0 && (
            <div className="p-5 border-t border-white/5 bg-black/20 animate-in slide-in-from-bottom">
              <Button 
                className="w-full h-11 text-xs font-black uppercase tracking-widest gap-2 bg-primary text-white hover:bg-primary/90 rounded-xl shadow-glow" 
                onClick={handleAddSelected}
              >
                <PlusCircle className="h-4 w-4" /> Adicionar Selecionados
              </Button>
              <Button 
                variant="ghost" 
                className="w-full mt-2 h-9 text-[9px] font-black uppercase tracking-widest text-white/20 hover:text-white"
                onClick={() => setSelectedMedia([])}
              >
                Cancelar Seleção
              </Button>
            </div>
          )}
        </aside>

        {/* CENTRO: CAMPANHA (TIMELINE VISUAL) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-[#0c0c0e]/40">
            <div className="flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                <Layers className="h-3 w-3 text-primary" /> Visual Timeline
              </h3>
              <p className="text-sm font-black text-white uppercase tracking-tighter">Conteúdos Vinculados</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-white/5 border-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {campaignItems.length} {campaignItems.length === 1 ? 'Item' : 'Itens'}
              </Badge>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button variant="ghost" size="icon" className="h-9 w-9 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 custom-scrollbar">
            <div className="p-10 min-h-full flex items-center">
              <SortableContext items={campaignItems.map(i => i.id)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-6 pb-10">
                  <AnimatePresence mode="popLayout">
                    {campaignItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <SortableCampaignItem 
                          item={item} 
                          index={index} 
                          isSelected={selectedItem?.id === item.id}
                          onSelect={setSelectedItem}
                          onRemove={handleRemove}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {campaignItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center w-[400px] h-[240px] border-2 border-dashed rounded-3xl border-white/5 text-white/10 gap-5 bg-white/[0.01] group hover:bg-white/[0.03] hover:border-white/10 transition-all">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                        <Plus className="h-8 w-8 opacity-20" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black uppercase tracking-widest">Campanha Vazia</p>
                        <p className="text-[10px] font-bold text-white/20 uppercase mt-1">Arraste mídias do Media Pool para começar</p>
                      </div>
                    </div>
                  )}

                  {/* ESPAÇO EXTRA NO FINAL DA TIMELINE */}
                  <div className="w-[100px] shrink-0 h-10" />
                </div>
              </SortableContext>
            </div>
            <ScrollBar orientation="horizontal" className="h-2" />
          </ScrollArea>

          {/* INDICADOR DE DROP ZONE */}
          {activeId && (
            <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none animate-in slide-in-from-bottom-5">
              <div className="bg-primary/90 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 flex items-center gap-3 shadow-glow">
                <Sparkles className="h-4 w-4 text-white animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Solte para inserir conteúdo</span>
              </div>
            </div>
          )}
        </main>

        {/* DIREITA: PROPRIEDADES (CONTEÚDO SELECIONADO) */}
        <AnimatePresence>
          {selectedItem && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-white/5 bg-[#0c0c0e]/80 backdrop-blur-xl flex flex-col z-40 relative overflow-hidden shrink-0"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <Settings2 className="h-3 w-3 text-primary" /> Propriedades
                  </h3>
                  <p className="text-sm font-black text-white uppercase tracking-tighter truncate max-w-[180px]">
                    {selectedItem.media?.name}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedItem(null)} 
                  className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/40"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="p-6 space-y-8 pb-20">
                  {/* PREVIEW */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-black shadow-2xl group">
                    <img 
                      src={selectedItem.media?.thumbnail_url || selectedItem.media?.file_url} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <Badge className="bg-primary/80 border-none text-[8px] font-black px-2 h-5">
                        {selectedItem.media?.type?.toUpperCase()}
                      </Badge>
                      <Badge className="bg-black/60 border-none text-[8px] font-black px-2 h-5">
                        {selectedItem.media?.width}x{selectedItem.media?.height}
                      </Badge>
                    </div>
                  </div>

                  {/* CONFIGURAÇÕES DO ITEM */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Duração Individual</label>
                      <div className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <Clock className="h-4 w-4 text-primary" />
                        <Input 
                          type="number" 
                          value={selectedItem.duration_override || selectedItem.media?.duration || 10} 
                          onChange={(e) => updateItemProperty(selectedItem.id, 'duration_override', parseInt(e.target.value))}
                          className="bg-transparent border-none text-xl font-black text-white focus-visible:ring-0 p-0 h-auto"
                        />
                        <span className="text-xs font-black text-white/20 uppercase tracking-widest">Segundos</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Prioridade de Exibição</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((p) => (
                          <Button
                            key={p}
                            variant="ghost"
                            onClick={() => updateItemProperty(selectedItem.id, 'priority_override', p)}
                            className={cn(
                              "h-10 font-black text-xs rounded-xl border transition-all",
                              selectedItem.priority_override === p 
                                ? "bg-primary border-primary text-white shadow-glow" 
                                : "bg-white/5 border-white/5 text-white/20 hover:text-white"
                            )}
                          >
                            P{p}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Segurança do Item</label>
                      <Button
                        variant="ghost"
                        onClick={() => updateItemProperty(selectedItem.id, 'is_locked', !selectedItem.is_locked)}
                        className={cn(
                          "w-full h-14 flex items-center justify-between px-4 rounded-2xl border transition-all group",
                          selectedItem.is_locked 
                            ? "bg-orange-500/10 border-orange-500/50 text-orange-500" 
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                            selectedItem.is_locked ? "bg-orange-500 text-white" : "bg-black/20 text-white/20 group-hover:text-white"
                          )}>
                            {selectedItem.is_locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest">Bloquear Posição</p>
                            <p className="text-[9px] font-bold opacity-40 uppercase">Impedir arraste e remoção</p>
                          </div>
                        </div>
                        <ChevronRight className={cn("h-4 w-4 opacity-20", selectedItem.is_locked && "opacity-100")} />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-10 space-y-3">
                    <Button 
                      variant="ghost" 
                      className="w-full h-12 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 gap-2 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                      onClick={() => handleRemove(selectedItem.id)}
                      disabled={selectedItem.is_locked}
                    >
                      <Trash2 className="h-4 w-4" /> Remover Conteúdo
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </motion.aside>
          )}
        </AnimatePresence>

        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <div className="w-[180px] h-[240px] rounded-2xl border-2 border-primary bg-[#1A1A1E]/80 backdrop-blur-xl overflow-hidden flex flex-col shadow-glow scale-105 z-[100] pointer-events-none rotate-3">
               <div className="h-[160px] w-full bg-primary/20 flex items-center justify-center relative">
                 <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1E] to-transparent" />
               </div>
               <div className="p-4">
                 <div className="h-2 w-full bg-white/20 rounded-full mb-2" />
                 <div className="h-2 w-1/2 bg-white/10 rounded-full" />
               </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}