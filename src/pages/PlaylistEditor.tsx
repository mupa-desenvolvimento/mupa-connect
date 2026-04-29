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
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { usePlaylist, useMedias, useTenant } from "@/hooks/use-playlist-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

// --- Types ---
interface EditorPlaylistItem {
  id: string; // Unique ID for DND
  dbId?: string; // DB ID
  mediaId: string;
  duration: number;
  type: string;
  media?: any;
}

// --- Sortable Item Component ---
const SortableItem = ({ item, index, onRemove }: { item: EditorPlaylistItem, index: number, onRemove: (id: string) => void }) => {
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
      className={`relative group flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 ${isDragging ? 'shadow-2xl' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-purple-400 transition-colors">
        <GripVertical className="h-5 w-5" />
      </div>
      
      <div className="relative h-16 w-28 rounded-lg overflow-hidden bg-black/20 shrink-0 border border-border/20">
        <img 
          src={media?.thumbnail_url || media?.file_url} 
          alt={media?.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-1 right-1">
          {media?.type === 'video' ? (
            <Badge className="h-4 px-1 bg-black/60 text-[8px] border-none backdrop-blur-sm"><Video className="h-2 w-2 mr-0.5" /> VIDEO</Badge>
          ) : (
            <Badge className="h-4 px-1 bg-black/60 text-[8px] border-none backdrop-blur-sm"><ImageIcon className="h-2 w-2 mr-0.5" /> IMAGE</Badge>
          )}
        </div>
        <div className="absolute bottom-1 left-1">
           <span className="text-[10px] font-mono font-bold text-white px-1 rounded bg-black/60 backdrop-blur-sm">#{index + 1}</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate group-hover:text-purple-400 transition-colors">{media?.name || 'Carregando...'}</h4>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{item.duration}s</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Layers className="h-3 w-3" />
            <span className="capitalize">{item.type}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/5">
                <Settings2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Configurações</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
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
        setItems(playlistData.playlist_items.map((it: any) => ({
          id: it.id,
          dbId: it.id,
          mediaId: it.media_id,
          duration: it.duracao,
          type: it.tipo,
          media: medias?.find(m => m.id === it.media_id)
        })));
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

      // 1. Ensure playlist exists
      if (id === "new") {
        const { data: newPlaylist, error: createError } = await supabase
          .from("playlists")
          .insert({
            name: updatedName,
            tenant_id: tenantId,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        currentPlaylistId = newPlaylist.id;
        navigate(`/playlists/${currentPlaylistId}`, { replace: true });
      } else {
        await supabase
          .from("playlists")
          .update({ name: updatedName, updated_at: new Date().toISOString() })
          .eq("id", id!);
      }

      // 2. Sync items
      // Simple strategy: delete existing items and insert new ones to maintain order and structure
      // In a real app, you might want a more sophisticated diffing algorithm
      const { error: deleteError } = await supabase
        .from("playlist_items")
        .delete()
        .eq("playlist_id", currentPlaylistId!);

      if (deleteError) throw deleteError;

      if (updatedItems.length > 0) {
        const itemsToInsert = updatedItems.map((it, idx) => ({
          playlist_id: currentPlaylistId!,
          media_id: it.mediaId,
          duracao: it.duration,
          tipo: it.type,
          ordem: idx + 1,
          position: idx + 1,
          conteudo_id: it.mediaId // Assuming this is needed
        }));

        const { error: insertError } = await supabase
          .from("playlist_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["playlist", currentPlaylistId] });
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
    triggerAutoSave(newItems, playlistName);
    toast.success(`${media.name} adicionado`);
  };

  const removeItem = (idToRemove: string) => {
    const newItems = items.filter(item => item.id !== idToRemove);
    setItems(newItems);
    triggerAutoSave(newItems, playlistName);
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    await triggerAutoSave(items, playlistName);
    setIsSaving(false);
    toast.success("Salvo manualmente");
  };

  const totalDuration = items.reduce((acc, curr) => acc + curr.duration, 0);

  if (isLoadingPlaylist) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#09090b]">
      {/* Header */}
      <header className="h-16 border-b border-border/40 bg-card/30 backdrop-blur-xl px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/playlists")} className="text-muted-foreground hover:text-white">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <input 
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              onBlur={() => triggerAutoSave(items, playlistName)}
              className="bg-transparent border-none focus:ring-0 text-lg font-display font-semibold text-white p-0 h-7"
            />
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <span>{items.length} ITENS</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>DURAÇÃO TOTAL: {totalDuration}S</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center gap-1">
                {saveStatus === "saving" && <><RefreshCw className="h-3 w-3 animate-spin text-purple-400" /> SALVANDO...</>}
                {saveStatus === "saved" && <><CheckCircle2 className="h-3 w-3 text-green-400" /> SALVO</>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-border/50 hover:bg-white/5 gap-2 h-9 px-4">
            <Play className="h-4 w-4 fill-current" /> Preview
          </Button>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20 h-9 px-4 gap-2"
            onClick={handleManualSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4" /> {isSaving ? "Salvando..." : "Salvar"}
          </Button>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar Telas
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Media Assets */}
        <aside className="w-80 border-r border-border/40 bg-[#0c0c0e] flex flex-col z-40">
          <Tabs defaultValue="media" className="flex-1 flex flex-col">
            <div className="p-4 border-b border-border/40">
              <TabsList className="grid w-full grid-cols-2 bg-black/40 p-1 border border-border/20 h-10">
                <TabsTrigger value="media" className="data-[state=active]:bg-purple-600 text-xs gap-2">
                  <ImageIcon className="h-3.5 w-3.5" /> Mídias
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="data-[state=active]:bg-purple-600 text-xs gap-2">
                  <Layers className="h-3.5 w-3.5" /> Campanhas
                </TabsTrigger>
              </TabsList>
              
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="pl-9 h-9 bg-black/20 border-border/30 focus:border-purple-500/50"
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <TabsContent value="media" className="p-4 m-0 grid grid-cols-2 gap-3">
                {medias?.map((media) => (
                  <motion.div
                    key={media.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group border border-border/40 hover:border-purple-500/50 transition-colors"
                    onClick={() => addItem(media.id)}
                  >
                    <img 
                      src={media.thumbnail_url || media.file_url} 
                      alt={media.name} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                      <span className="text-[10px] text-white font-medium truncate">{media.name}</span>
                      <Plus className="h-3 w-3 text-purple-400 shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </TabsContent>
              <TabsContent value="campaigns" className="p-4 m-0">
                 <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Layers className="h-10 w-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Em breve</p>
                 </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </aside>

        {/* Center - Timeline Area */}
        <main className="flex-1 bg-[#09090b] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="p-6 flex items-center justify-between border-b border-border/20 bg-card/10 backdrop-blur-sm z-30 shrink-0">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              ORDEM DE EXIBIÇÃO <Badge variant="secondary" className="bg-white/5 border-white/10 text-[10px]">{items.length}</Badge>
            </h2>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs gap-1.5 text-muted-foreground"
                onClick={() => { setItems([]); triggerAutoSave([], playlistName); }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar tudo
              </Button>
              <div className="h-4 w-px bg-border/40 mx-1" />
              <div className="flex bg-black/40 rounded-lg p-1 border border-border/20">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-purple-600 text-white rounded-md">
                   <GripVertical className="h-3.5 w-3.5 rotate-90" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                   <GripVertical className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 max-w-3xl mx-auto min-h-full">
              <AnimatePresence>
                {items.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-border/40 rounded-3xl bg-card/20"
                  >
                    <div className="h-20 w-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
                      <Plus className="h-10 w-10 text-purple-500/40" />
                    </div>
                    <h3 className="text-xl font-display font-semibold mb-2 text-white">Sua playlist está vazia</h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      Arraste mídias da barra lateral ou clique nelas para começar a montar sua sequência de exibição.
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={items.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {items.map((item, index) => (
                          <SortableItem 
                            key={item.id} 
                            item={item} 
                            index={index}
                            onRemove={removeItem}
                          />
                        ))}
                      </SortableContext>
                      
                      <DragOverlay dropAnimation={{
                        sideEffects: defaultDropAnimationSideEffects({
                          styles: {
                            active: {
                              opacity: '0.5',
                            },
                          },
                        }),
                      }}>
                        {activeId ? (
                          <div className="flex items-center gap-4 p-3 rounded-xl border border-purple-500/50 bg-purple-500/10 backdrop-blur-xl shadow-2xl scale-105">
                            <GripVertical className="h-5 w-5 text-purple-400" />
                            <div className="h-12 w-20 rounded bg-muted animate-pulse" />
                            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </main>

        {/* Right Sidebar - Preview & Settings */}
        <aside className="w-80 border-l border-border/40 bg-[#0c0c0e] flex flex-col z-40">
          <div className="p-6">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Preview em Tempo Real</h3>
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border/40 relative group shadow-2xl">
              {items.length > 0 ? (
                <>
                  <img 
                    src={items[0].media?.thumbnail_url || items[0].media?.file_url} 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button size="icon" className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-500/40">
                      <Play className="h-6 w-6 fill-current" />
                    </Button>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                       <div className="h-full bg-purple-500 w-1/3" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
                  <Monitor className="h-12 w-12 mb-2" />
                  <span className="text-xs uppercase font-bold tracking-tighter">Sem Conteúdo</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-border/20" />

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <section>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Agendamento de Playlist</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Período de Ativação</label>
                    <Button variant="outline" className="w-full justify-start text-xs border-border/40 bg-black/20 gap-2 font-normal">
                      <Calendar className="h-3.5 w-3.5 text-purple-400" /> Permanente
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Prioridade</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" className="h-8 text-[10px] border-purple-500/50 bg-purple-500/10 text-purple-400">NORMAL</Button>
                      <Button variant="outline" className="h-8 text-[10px] border-border/40 text-muted-foreground">ALTA</Button>
                      <Button variant="outline" className="h-8 text-[10px] border-border/40 text-muted-foreground">CRÍTICA</Button>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="bg-border/20" />

              <section>
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Dispositivos Vinculados</h4>
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground italic">Funcionalidade em desenvolvimento</p>
                </div>
              </section>
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
