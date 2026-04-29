import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  horizontalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Play, 
  Save, 
  Plus, 
  Search, 
  Image as ImageIcon, 
  Video, 
  Clock, 
  GripVertical, 
  Trash2,
  Settings2,
  Monitor,
  Calendar,
  Layers,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Type,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { usePlaylist, useMedias, useTenant } from "@/hooks/use-playlist-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// --- Types ---
interface EditorPlaylistItem {
  id: string; 
  dbId?: string; 
  mediaId: string;
  duration: number;
  type: string;
  media?: any;
}

// --- Horizontal Sortable Item Component ---
const SortableItem = ({ 
  item, 
  index, 
  isSelected, 
  onSelect 
}: { 
  item: EditorPlaylistItem, 
  index: number, 
  isSelected: boolean,
  onSelect: (item: EditorPlaylistItem) => void
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const media = item.media;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      onClick={() => onSelect(item)}
      className={`relative shrink-0 w-48 h-32 rounded-xl border transition-all cursor-pointer group overflow-hidden ${
        isSelected 
          ? 'border-[#085CF0] ring-2 ring-[#085CF0]/20 bg-[#085CF0]/5 shadow-xl shadow-[#085CF0]/10' 
          : 'border-border/40 bg-card/40 hover:border-[#085CF0]/30'
      } ${isDragging ? 'shadow-2xl' : ''}`}
    >
      <div className="absolute inset-0">
        <img 
          src={media?.thumbnail_url || media?.file_url} 
          alt={media?.name} 
          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Item Order Badge */}
      <div className="absolute top-2 left-2">
         <span className="text-[10px] font-mono font-bold text-white px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
           {index + 1}
         </span>
      </div>

      {/* Duration Badge */}
      <div className="absolute top-2 right-2">
         <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded bg-[#085CF0]/80 backdrop-blur-sm flex items-center gap-1">
           <Clock className="h-2.5 w-2.5" /> {item.duration}s
         </span>
      </div>

      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute bottom-2 left-2 p-1 rounded bg-black/40 hover:bg-[#085CF0]/60 text-white/50 hover:text-white transition-colors cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Name */}
      <div className="absolute bottom-2 left-9 right-2">
        <p className="text-[10px] font-medium text-white truncate drop-shadow-lg">
          {media?.name || 'Sem nome'}
        </p>
      </div>

      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-[#085CF0] pointer-events-none rounded-xl" />
      )}
    </div>
  );
};

// --- Main Component ---
export default function PlaylistEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: tenantId } = useTenant();
  const { data: medias } = useMedias(tenantId);
  const { data: playlistData, isLoading: isLoadingPlaylist } = usePlaylist(id!);

  const [playlistName, setPlaylistName] = useState("");
  const [items, setItems] = useState<EditorPlaylistItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EditorPlaylistItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (playlistData) {
      setPlaylistName(playlistData.name);
      if (playlistData.playlist_items) {
        const mappedItems = playlistData.playlist_items.map((it: any) => ({
          id: it.id,
          dbId: it.id,
          mediaId: it.media_id,
          duration: it.duracao,
          type: it.tipo,
          media: medias?.find(m => m.id === it.media_id)
        }));
        setItems(mappedItems);
        if (mappedItems.length > 0 && !selectedItem) {
          setSelectedItem(mappedItems[0]);
        }
      }
    } else if (id === 'new') {
      setPlaylistName("Nova Playlist");
      setItems([]);
    }
  }, [playlistData, medias, id]);

  const triggerAutoSave = useCallback(async (updatedItems: EditorPlaylistItem[], updatedName: string) => {
    if (!tenantId || isSaving) return;
    
    setSaveStatus("saving");
    try {
      let currentPlaylistId = id;

      if (id === "new") {
        const { data: newPlaylist, error: createError } = await supabase
          .from("playlists")
          .insert({ name: updatedName, tenant_id: tenantId, is_active: true })
          .select().single();
        if (createError) throw createError;
        currentPlaylistId = newPlaylist.id;
        navigate(`/playlists/${currentPlaylistId}`, { replace: true });
      } else {
        await supabase.from("playlists").update({ name: updatedName, updated_at: new Date().toISOString() }).eq("id", id!);
      }

      await supabase.from("playlist_items").delete().eq("playlist_id", currentPlaylistId!);

      if (updatedItems.length > 0) {
        const itemsToInsert = updatedItems.map((it, idx) => ({
          playlist_id: currentPlaylistId!,
          media_id: it.mediaId,
          duracao: it.duration,
          tipo: it.type,
          ordem: idx + 1,
          position: idx + 1,
          conteudo_id: it.mediaId
        }));
        await supabase.from("playlist_items").insert(itemsToInsert);
      }

      // Silently invalidate to keep UI smooth without full reload state
      // Don't overwrite cache shape — just mark playlists list stale
      queryClient.invalidateQueries({ queryKey: ["playlists", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["playlists", tenantId] });
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error: any) {
      console.error("Auto-save error:", error);
      toast.error("Erro ao salvar automaticamente");
      setSaveStatus("idle");
    }
  }, [tenantId, id, navigate, queryClient]);

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      triggerAutoSave(newItems, playlistName);
    }
  };

  const addItem = (mediaId: string) => {
    const media = medias?.find(m => m.id === mediaId);
    if (!media) return;
    const newItem: EditorPlaylistItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      mediaId: media.id,
      duration: media.duration || 10,
      type: media.type === 'video' ? 'video' : 'image',
      media: media
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    setSelectedItem(newItem);
    triggerAutoSave(newItems, playlistName);
    toast.success(`${media.name} adicionado`);
  };

  const removeItem = (idToRemove: string) => {
    const newItems = items.filter(item => item.id !== idToRemove);
    setItems(newItems);
    if (selectedItem?.id === idToRemove) {
      setSelectedItem(newItems.length > 0 ? newItems[0] : null);
    }
    triggerAutoSave(newItems, playlistName);
  };

  const updateItemDuration = (id: string, newDuration: number) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, duration: newDuration } : item
    );
    setItems(newItems);
    if (selectedItem?.id === id) {
      setSelectedItem({ ...selectedItem, duration: newDuration });
    }
    triggerAutoSave(newItems, playlistName);
  };

  const totalDuration = items.reduce((acc, curr) => acc + curr.duration, 0);

  if (isLoadingPlaylist && id !== "new") {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="h-10 w-10 animate-spin text-[#085CF0]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-white">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-card/10 backdrop-blur-xl px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/playlists")} className="text-white/50 hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <input 
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              onBlur={() => triggerAutoSave(items, playlistName)}
              className="bg-transparent border-none focus:ring-0 text-lg font-display font-semibold text-white p-0 h-7"
            />
            <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium uppercase tracking-wider">
              <span>{items.length} ITENS</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span>DURAÇÃO: {totalDuration}S</span>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <div className="flex items-center gap-1">
                {saveStatus === "saving" && <><RefreshCw className="h-3 w-3 animate-spin text-[#3b82f6]" /> SALVANDO...</>}
                {saveStatus === "saved" && <><CheckCircle2 className="h-3 w-3 text-green-400" /> SALVO</>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-white/10 hover:bg-white/5 gap-2 h-9 px-4 text-white">
            <Play className="h-4 w-4 fill-current" /> Preview
          </Button>
          <Button className="bg-[#085CF0] hover:bg-[#0750d4] text-white h-9 px-4 gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar Telas
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Media Library */}
        <aside className="w-80 border-r border-white/5 bg-[#0c0c0e] flex flex-col z-40">
          <Tabs defaultValue="media" className="flex-1 flex flex-col">
            <div className="p-4 border-b border-white/5">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 border border-white/5 h-10">
                <TabsTrigger value="media" className="data-[state=active]:bg-[#085CF0] text-xs gap-2">
                  <ImageIcon className="h-3.5 w-3.5" /> Mídias
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="data-[state=active]:bg-[#085CF0] text-xs gap-2">
                  <Layers className="h-3.5 w-3.5" /> Campanhas
                </TabsTrigger>
              </TabsList>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input placeholder="Pesquisar..." className="pl-9 h-9 bg-black/20 border-white/10 focus:border-[#085CF0]/50 text-white" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <TabsContent value="media" className="p-4 m-0 grid grid-cols-2 gap-3">
                {medias?.map((media) => (
                  <motion.div
                    key={media.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group border border-white/10 hover:border-[#085CF0]/50 transition-colors"
                    onClick={() => addItem(media.id)}
                  >
                    <img src={media.thumbnail_url || media.file_url} alt={media.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100" />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 flex justify-between items-center">
                      <span className="text-[10px] text-white font-medium truncate">{media.name}</span>
                      <Plus className="h-3 w-3 text-[#3b82f6] shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </aside>

        {/* Center - Preview & Horizontal Timeline */}
        <main className="flex-1 bg-[#09090b] flex flex-col relative overflow-hidden">
          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.05),transparent)] pointer-events-none" />
             
             {/* Device Mockup Preview */}
             <div className="relative max-w-4xl w-full aspect-video bg-black rounded-3xl overflow-hidden border-[12px] border-[#1a1a1e] shadow-[0_0_100px_rgba(0,0,0,0.5)] group">
                {selectedItem ? (
                  <div className="w-full h-full relative">
                    <img 
                      src={selectedItem.media?.thumbnail_url || selectedItem.media?.file_url} 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                       <Badge className="bg-[#085CF0]/90 text-white border-none backdrop-blur-md">LIVE PREVIEW</Badge>
                       <Badge variant="secondary" className="bg-black/40 text-white border-white/10 backdrop-blur-md">
                         Item {items.indexOf(selectedItem) + 1} de {items.length}
                       </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/10">
                    <Monitor className="h-24 w-24 mb-4" />
                    <p className="text-xl font-display font-bold uppercase tracking-widest">Nenhum conteúdo selecionado</p>
                  </div>
                )}
                
                {/* Overlay Controls */}
                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                   <div className="flex items-center gap-4">
                      <Button size="icon" className="h-10 w-10 rounded-full bg-white text-black hover:bg-white/90">
                         <Play className="h-5 w-5 fill-current" />
                      </Button>
                      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                         <div className="h-full bg-[#085CF0] w-1/3" />
                      </div>
                      <span className="text-xs font-mono font-bold">03:20 / {totalDuration}S</span>
                      <Button size="icon" variant="ghost" className="text-white hover:bg-white/10">
                         <Maximize2 className="h-5 w-5" />
                      </Button>
                   </div>
                </div>
             </div>
          </div>

          {/* Horizontal Timeline Container */}
          <div className="h-64 border-t border-white/5 bg-[#0c0c0e]/80 backdrop-blur-md flex flex-col">
             <div className="px-6 py-3 flex items-center justify-between border-b border-white/5 bg-black/20">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                  Timeline de Exibição <Badge variant="outline" className="text-[9px] border-white/10">{items.length} Itens</Badge>
                </h3>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 text-[10px] font-medium text-white/60 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                      <Clock className="h-3 w-3 text-[#3b82f6]" /> Tempo Total: {totalDuration}s
                   </div>
                   <Separator orientation="vertical" className="h-4 bg-white/10" />
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-7 text-[10px] uppercase font-bold text-white/40 hover:text-red-400"
                     onClick={() => { setItems([]); triggerAutoSave([], playlistName); }}
                   >
                     <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar Timeline
                   </Button>
                </div>
             </div>

             <ScrollArea className="flex-1 w-full">
                <div className="p-6 flex gap-4 min-w-full">
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    modifiers={[restrictToHorizontalAxis]}
                  >
                    <SortableContext 
                      items={items.map(i => i.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      <AnimatePresence>
                        {items.map((item, index) => (
                          <SortableItem 
                            key={item.id} 
                            item={item} 
                            index={index}
                            isSelected={selectedItem?.id === item.id}
                            onSelect={setSelectedItem}
                          />
                        ))}
                      </AnimatePresence>
                    </SortableContext>

                    <DragOverlay dropAnimation={{
                      sideEffects: defaultDropAnimationSideEffects({
                        styles: { active: { opacity: '0.5' } }
                      })
                    }}>
                      {activeId ? (
                        <div className="w-48 h-32 rounded-xl border border-[#085CF0] bg-[#085CF0]/20 backdrop-blur-xl shadow-2xl scale-105" />
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                  
                  {/* Quick Add Button at the end of timeline */}
                  <Button 
                    variant="outline" 
                    className="shrink-0 w-48 h-32 rounded-xl border-2 border-dashed border-white/5 bg-white/5 hover:bg-white/10 hover:border-[#085CF0]/30 transition-all flex flex-col items-center justify-center gap-2"
                  >
                    <Plus className="h-6 w-6 text-white/20" />
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Adicionar</span>
                  </Button>
                </div>
                <ScrollBar orientation="horizontal" />
             </ScrollArea>
          </div>
        </main>

        {/* Right Sidebar - Properties Panel */}
        <aside className="w-80 border-l border-white/5 bg-[#0c0c0e] flex flex-col z-40">
           <div className="p-6 border-b border-white/5">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1">Painel de Propriedades</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-medium">Configuração do item selecionado</p>
           </div>

           <ScrollArea className="flex-1">
              <div className="p-6 space-y-8">
                 {selectedItem ? (
                   <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                      {/* Item Info */}
                      <section className="space-y-4">
                         <div className="h-40 rounded-xl overflow-hidden border border-white/5 bg-black">
                            <img 
                              src={selectedItem.media?.thumbnail_url || selectedItem.media?.file_url} 
                              className="w-full h-full object-cover"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Nome da Mídia</label>
                            <Input 
                              value={selectedItem.media?.name || ''} 
                              readOnly 
                              className="bg-black/40 border-white/10 text-white h-9"
                            />
                         </div>
                         <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                               <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tipo</label>
                               <div className="h-9 flex items-center px-3 bg-black/40 border border-white/10 rounded-md text-xs font-medium text-[#3b82f6]">
                                  {selectedItem.type === 'video' ? <Video className="h-3.5 w-3.5 mr-2" /> : <ImageIcon className="h-3.5 w-3.5 mr-2" />}
                                  {(selectedItem.type || 'image').toUpperCase()}
                               </div>
                            </div>
                            <div className="flex-1 space-y-2">
                               <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ordem</label>
                               <div className="h-9 flex items-center px-3 bg-black/40 border border-white/10 rounded-md text-xs font-medium text-white/60">
                                  #{items.indexOf(selectedItem) + 1} de {items.length}
                               </div>
                            </div>
                         </div>
                      </section>

                      <Separator className="bg-white/5" />

                      {/* Content Settings */}
                      <section className="space-y-6">
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                               <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Duração (Segundos)</label>
                               <span className="text-xs font-mono font-bold text-[#3b82f6]">{selectedItem.duration}s</span>
                            </div>
                            <Slider 
                              value={[selectedItem.duration]} 
                              min={1} 
                              max={60} 
                              step={1}
                              onValueChange={(val) => updateItemDuration(selectedItem.id, val[0])}
                              className="py-4"
                            />
                            <div className="flex justify-between text-[10px] text-white/20 font-bold uppercase">
                               <span>1s</span>
                               <span>60s</span>
                            </div>
                         </div>

                         <div className="space-y-3">
                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ajuste de Escala</label>
                            <div className="grid grid-cols-2 gap-2">
                               <Button variant="outline" className="h-9 text-[10px] border-[#085CF0]/50 bg-[#085CF0]/10 text-[#3b82f6] font-bold">PREENCHER</Button>
                               <Button variant="outline" className="h-9 text-[10px] border-white/10 text-white/40 font-bold">AJUSTAR</Button>
                            </div>
                         </div>
                      </section>

                      <Separator className="bg-white/5" />

                      {/* Actions */}
                      <section className="space-y-3 pt-2">
                         <Button variant="outline" className="w-full h-10 border-white/10 text-white/60 hover:text-white gap-2 font-bold text-[10px] uppercase tracking-widest">
                            <RefreshCw className="h-4 w-4" /> Substituir Mídia
                         </Button>
                         <Button 
                            variant="ghost" 
                            className="w-full h-10 text-red-400/60 hover:text-red-400 hover:bg-red-400/5 gap-2 font-bold text-[10px] uppercase tracking-widest"
                            onClick={() => removeItem(selectedItem.id)}
                         >
                            <Trash2 className="h-4 w-4" /> Remover da Playlist
                         </Button>
                      </section>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                         <Settings2 className="h-8 w-8 text-white/10" />
                      </div>
                      <div className="space-y-1">
                         <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Nenhum Item</p>
                         <p className="text-[10px] text-white/20 px-6">Selecione uma mídia na timeline para editar suas propriedades individuais.</p>
                      </div>
                   </div>
                 )}
              </div>
           </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
