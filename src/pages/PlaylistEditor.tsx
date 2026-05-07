import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
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
  Maximize2,
  Bug,
  ChevronDown,
  ChevronUp,
  X,
  Pause,
  AlertTriangle,
  ExternalLink,
  Lock,
  Unlock,
  ChevronRight,
  Eye,
  History,
  MoreVertical,
  Edit,
  Megaphone
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlaylist, useMedias, useTenant } from "@/hooks/use-playlist-data";
import { supabase } from "@/integrations/supabase/client";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { handlePlaylistError } from "@/utils/error-handlers";
import { PlaylistErrorBanner } from "@/components/PlaylistErrorBanner";
import { format } from "date-fns";

const PIXELS_PER_SECOND = 12;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface EditorPlaylistItem {
  id: string; 
  dbId?: string; 
  mediaId?: string;
  duration: number;
  priority: number;
  type: 'image' | 'video' | 'campaign';
  media?: any;
  isLocked?: boolean;
  campaign?: any;
  campaignId?: string;
}

const DEFAULT_APPEARANCE_CONFIG = {
  show_device_name: true,
  show_datetime: true,
  show_serial: false,
  transition_type: "fade",
  transition_duration: 500,
  footer: { enabled: false, text: "Consulte o preço aqui", background_color: "#000000AA", text_color: "#FFFFFF", height: 60 },
  logo: { enabled: false, url: "", position: "top-left", size: 80, opacity: 1 }
};

const normalizeAppearanceConfig = (config?: any) => ({
  ...DEFAULT_APPEARANCE_CONFIG,
  ...(config && typeof config === "object" ? config : {}),
  footer: { ...DEFAULT_APPEARANCE_CONFIG.footer, ...(config?.footer && typeof config.footer === "object" ? config.footer : {}) },
  logo: { ...DEFAULT_APPEARANCE_CONFIG.logo, ...(config?.logo && typeof config.logo === "object" ? config.logo : {}) }
});

const SortableItem = ({ item, index, isSelected, onSelect, timelineMode = false }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id,
    disabled: item.isLocked 
  });
  
  const media = item.media;
  const isCampaign = item.type === 'campaign';
  const campaign = item.campaign;
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    zIndex: isDragging ? 50 : 1, 
    opacity: isDragging ? 0.6 : 1,
    width: Math.max(100, item.duration * PIXELS_PER_SECOND)
  };

  const getBorderColor = () => {
    if (isSelected) return 'border-[#085CF0]';
    if (isCampaign) return `border-[${campaign?.color || '#085CF0'}]/30`;
    return 'border-white/10';
  };

  const getBgColor = () => {
    if (isSelected) return 'bg-[#085CF0]/10';
    if (isCampaign) return `bg-[${campaign?.color || '#085CF0'}]/5`;
    return 'bg-white/5';
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      onClick={() => onSelect(item)}
      className={cn(
        "relative shrink-0 h-24 rounded-xl border transition-all cursor-pointer group overflow-hidden",
        getBorderColor(),
        getBgColor(),
        isSelected && "ring-2 ring-[#085CF0]/20 shadow-lg",
        item.isLocked && "opacity-80"
      )}
    >
      <div className="absolute inset-0">
        {!isCampaign ? (
          <>
            <img 
              src={media?.thumbnail_url || media?.file_url} 
              alt={media?.name} 
              className="w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          </>
        ) : (
          <div 
            className="absolute inset-0 opacity-10"
            style={{ backgroundColor: campaign?.color || '#085CF0' }}
          />
        )}
      </div>
      
      <div className="absolute top-2 left-2 flex gap-1.5 z-10">
        <span className="text-[10px] font-mono font-bold text-white/90 px-1.5 py-0.5 rounded bg-black/60 border border-white/10">
          {index + 1}
        </span>
        {item.isLocked && (
          <div className="bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded px-1.5 py-0.5 flex items-center">
            <Lock className="h-2.5 w-2.5" />
          </div>
        )}
        {isCampaign && (
          <div 
            className="rounded px-1.5 py-0.5 flex items-center gap-1 border"
            style={{ 
              backgroundColor: `${campaign?.color || '#085CF0'}20`,
              borderColor: `${campaign?.color || '#085CF0'}40`,
              color: campaign?.color || '#085CF0'
            }}
          >
            <Megaphone className="h-2.5 w-2.5" />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Campanha</span>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10">
        <span className="text-[10px] font-bold text-white/90 px-1.5 py-0.5 rounded bg-black/60 border border-white/10 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5 text-[#085CF0]" /> {item.duration}s
        </span>
      </div>

      {!item.isLocked && (
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white/0 group-hover:text-white group-hover:bg-[#085CF0]/80 transition-all cursor-grab active:cursor-grabbing z-20"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 z-10">
        <p className="text-[10px] font-bold text-white truncate drop-shadow-md">
          {isCampaign ? campaign?.name : (media?.name || 'Sem nome')}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {!isCampaign ? (
            <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-white/10 bg-black/40 text-white/40 uppercase">
              {item.type}
            </Badge>
          ) : (
            <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
              Prioridade {item.priority}
            </span>
          )}
          {item.priority > 1 && !isCampaign && (
            <Badge variant="outline" className="text-[8px] h-3.5 px-1 py-0 border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold">
              P{item.priority}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const DraggableMediaItem = ({ media, onClick }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${media.id}`,
    data: {
      type: 'library-media',
      mediaId: media.id,
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
      {...listeners} 
      {...attributes}
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border border-white/10 hover:border-[#085CF0] group transition-all",
        isDragging && "opacity-50 ring-2 ring-[#085CF0] z-50"
      )}
      onClick={() => onClick(media.id)}
    >
      <img src={media.thumbnail_url || media.file_url} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      <div className="absolute bottom-1 left-1 right-1 text-[10px] truncate bg-black/60 px-1 rounded font-bold text-white/90">
        {media.name}
      </div>
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#085CF0]/20">
          <Plus className="h-6 w-6 text-white" />
        </div>
      )}
    </div>
  );
};

const CampaignDropZone = ({ children, isActive }: any) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'campaign-drop-zone',
    data: {
      accepts: ['library-media']
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "flex-1 flex flex-col transition-all duration-200",
        isOver && "bg-[#085CF0]/10 ring-2 ring-[#085CF0]/30 ring-inset rounded-xl"
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-[#085CF0] text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl animate-bounce">
            <Plus className="h-4 w-4" /> Solte para adicionar à campanha
          </div>
        </div>
      )}
    </div>
  );
};

export default function PlaylistEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contextId, tenantId, companyId, isSuperAdmin, isLoading: isTenantLoading } = useTenant();
  const { data: medias, isLoading: isMediasLoading } = useMedias(contextId || undefined);
  const { data: playlistData, isLoading: isPlaylistLoading } = usePlaylist(id!);

  const [playlistName, setPlaylistName] = useState("...");
  const [items, setItems] = useState<EditorPlaylistItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EditorPlaylistItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [applyToAllDevices, setApplyToAllDevices] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [appearanceConfig, setAppearanceConfig] = useState<any>(DEFAULT_APPEARANCE_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const playheadIntervalRef = useRef<number | null>(null);

  const totalDuration = useMemo(() => items.reduce((acc, it) => acc + it.duration, 0), [items]);

  const { data: campaignLinks } = useQuery({
    queryKey: ["playlist-campaigns", id],
    queryFn: async () => {
      if (!id || id === 'new') return [];
      const { data, error } = await supabase.from("playlist_campaigns").select(`id, priority, campaigns (id, name, color, start_date, end_date, start_time, end_time)`).eq("playlist_id", id).eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!id && id !== 'new'
  });

  const campaigns = useMemo(() => campaignLinks?.map((cl: any) => ({ ...cl.campaigns, linkId: cl.id, priority: cl.priority })) || [], [campaignLinks]);

  const { data: campaignContents, refetch: refetchCampaignContents } = useQuery({
    queryKey: ["campaign-contents", selectedItem?.campaignId],
    queryFn: async () => {
      if (!selectedItem?.campaignId) return [];
      const { data, error } = await supabase
        .from("campaign_contents")
        .select(`*, media:media_items (*)`)
        .eq("campaign_id", selectedItem.campaignId)
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedItem?.campaignId && selectedItem.type === 'campaign'
  });

  useEffect(() => {
    if (!isPlaying) return;
    let startTime = Date.now() - (currentTime * 1000);
    const updatePlayhead = () => {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      if (elapsed >= (totalDuration || 5)) { setCurrentTime(0); startTime = Date.now(); } else { setCurrentTime(elapsed); }
      playheadIntervalRef.current = requestAnimationFrame(updatePlayhead);
    };
    playheadIntervalRef.current = requestAnimationFrame(updatePlayhead);
    return () => { if (playheadIntervalRef.current) cancelAnimationFrame(playheadIntervalRef.current); };
  }, [isPlaying, totalDuration]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.dnd-item')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + (timelineScrollRef.current?.scrollLeft || 0);
    const time = x / PIXELS_PER_SECOND;
    setCurrentTime(Math.min(Math.max(0, time), totalDuration || 5));
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    if (playlistData) {
      setPlaylistName(playlistData.name);
      setIsDefault(playlistData.is_company_default || false);
      setAppearanceConfig(normalizeAppearanceConfig(playlistData.appearance_config));
      
      const mappedItems: EditorPlaylistItem[] = (playlistData.playlist_items || []).map((it: any) => ({ 
        id: it.id, 
        dbId: it.id, 
        mediaId: it.media_id, 
        duration: it.duracao, 
        priority: it.prioridade || 1, 
        type: it.tipo as any, 
        isLocked: it.is_locked || false,
        media: medias?.find(m => m.id === it.media_id),
        position: it.position || it.ordem || 0
      }));

      const mappedCampaigns: EditorPlaylistItem[] = (campaignLinks || []).map((cl: any) => ({
        id: `campaign-${cl.id}`,
        dbId: cl.id,
        duration: 5, // Visual width for campaign block in timeline
        priority: cl.priority || 1,
        type: 'campaign' as any,
        campaign: cl.campaigns,
        campaignId: cl.campaigns.id,
        position: cl.position || 0
      }));

      const combinedItems = [...mappedItems, ...mappedCampaigns].sort((a, b) => (a as any).position - (b as any).position);
      setItems(combinedItems);
      
      if (!selectedItem && combinedItems.length > 0) {
        setSelectedItem(combinedItems[0]);
      }
    } else if (id === 'new') { 
      setPlaylistName("Nova Playlist"); 
      setItems([]); 
      setSelectedItem(null); 
    }
  }, [playlistData, medias, campaignLinks, id]);

  const savePlaylist = async (updatedItems: EditorPlaylistItem[], updatedName: string) => {
    if (isSaving || !tenantId || !updatedName || updatedName.trim() === "" || updatedName === "...") { 
      if (!updatedName || updatedName.trim() === "") toast.error("Dê um nome à sua playlist.");
      return; 
    }
    setIsSaving(true); setSaveStatus("saving");
    try {
      let currentPlaylistId = id;
      if (id === "new") {
        const { data: companyData } = await supabase.from("companies").select("id").eq("tenant_id", tenantId).limit(1).maybeSingle();
        const { data: newPlaylist, error: createError } = await supabase.from("playlists").insert({ name: updatedName, tenant_id: tenantId as any, company_id: companyId || companyData?.id, is_active: true, is_company_default: isDefault, appearance_config: appearanceConfig }).select().single();
        if (createError) throw createError;
        currentPlaylistId = newPlaylist.id;
        navigate(`/playlists/${currentPlaylistId}`, { replace: true });
      } else {
        const { error: updateError } = await supabase.from("playlists").update({ name: updatedName, is_company_default: isDefault, updated_at: new Date().toISOString(), appearance_config: appearanceConfig }).eq("id", id as any);
        if (updateError) throw updateError;
      }

      const regularItems = updatedItems.filter(it => it.type !== 'campaign');
      const campaignItems = updatedItems.filter(it => it.type === 'campaign');

      // Update regular items
      await supabase.from("playlist_items").delete().eq("playlist_id", currentPlaylistId as any);
      if (regularItems.length > 0) {
        const itemsToInsert = regularItems.map((it, idx) => ({ 
          playlist_id: currentPlaylistId as any, 
          media_id: it.mediaId, 
          duracao: it.duration, 
          prioridade: it.priority, 
          tipo: it.type, 
          ordem: idx + 1, 
          position: updatedItems.indexOf(it), // Use overall position in timeline
          conteudo_id: it.mediaId, 
          ativo: true,
          is_locked: it.isLocked || false
        }));
        const { error: insertError } = await supabase.from("playlist_items").insert(itemsToInsert);
        if (insertError) throw insertError;
      }

      // Update campaign positions
      for (const campaignItem of campaignItems) {
        await supabase.from("playlist_campaigns")
          .update({ position: updatedItems.indexOf(campaignItem) })
          .eq("id", campaignItem.dbId!);
      }

      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", currentPlaylistId] });
      queryClient.invalidateQueries({ queryKey: ["playlist-campaigns", currentPlaylistId] });
      if (applyToAllDevices && (companyId || playlistData?.company_id)) {
        const targetId = companyId || playlistData?.company_id;
        await supabase.from("dispositivos").update({ appearance_config: appearanceConfig }).eq("company_id", targetId);
        FirebaseRealtimeService.notifyCompanyDevices(targetId!).catch(() => {});
      }
      if (currentPlaylistId) FirebaseRealtimeService.notifyPlaylistDevices(currentPlaylistId).catch(() => {});
      setSaveStatus("saved"); setIsSaving(false); setHasUnsavedChanges(false); toast.success("Playlist salva!");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error: any) { handlePlaylistError(error, "Salvar playlist"); setSaveStatus("idle"); setIsSaving(false); }
  };

  const handlePreview = () => {
    if (id === "new") { toast.error("Salve a playlist antes."); return; }
    const width = window.innerWidth * 0.7; const height = window.innerHeight * 0.7;
    const popup = window.open(`/play?preview=true&id=${id}`, "preview_player", `width=${width},height=${height},top=100,left=100,resizable=yes`);
    if (!popup) toast.error("Permita popups.");
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event; 
    setActiveId(null);
    
    if (!over) return;

    // Handle library to campaign drop
    if (over.id === 'campaign-drop-zone' && active.data.current?.type === 'library-media') {
      const mediaId = active.data.current.mediaId;
      addItem(mediaId);
      return;
    }

    // Handle timeline reordering
    if (active.id !== over.id) {
      const activeItem = items.find(i => i.id === active.id);
      if (activeItem) {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newItems = arrayMove(items, oldIndex, newIndex);
          setItems(newItems); 
          setHasUnsavedChanges(true);
        }
      }
    }
  };

  const addItem = async (mediaId: string) => {
    const media = medias?.find(m => m.id === mediaId);
    if (!media) return;

    if (selectedItem?.type === 'campaign') {
      const { error } = await supabase.from("campaign_contents").insert({
        campaign_id: selectedItem.campaignId,
        media_id: mediaId,
        tenant_id: tenantId,
        position: (campaignContents?.length || 0) + 1,
        is_active: true
      });
      if (error) toast.error("Erro ao adicionar à campanha");
      else { toast.success(`Adicionado à campanha ${selectedItem.campaign?.name}`); refetchCampaignContents(); }
      return;
    }

    const newItem: EditorPlaylistItem = { id: `temp-${Date.now()}`, mediaId: media.id, duration: media.duration || 10, priority: 1, type: media.type === 'video' ? 'video' : 'image', media: media };
    const newItems = [...items, newItem]; setItems(newItems); setSelectedItem(newItem); setHasUnsavedChanges(true); toast.success(`${media.name} adicionado`);
  };

  const removeItem = (idToRemove: string) => {
    const newItems = items.filter(item => item.id !== idToRemove); setItems(newItems);
    if (selectedItem?.id === idToRemove) setSelectedItem(newItems.length > 0 ? newItems[0] : null);
    setHasUnsavedChanges(true);
  };

  if (isPlaylistLoading && id !== "new") return <div className="h-screen flex items-center justify-center bg-[#09090b]"><Loader2 className="h-10 w-10 animate-spin text-[#085CF0]" /></div>;

  return (
    <div className="flex flex-col h-screen bg-[#09090b] text-white">
      <header className="h-16 border-b border-white/5 bg-card/10 backdrop-blur-xl px-6 flex items-center justify-between z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/playlists")}><ChevronLeft className="h-5 w-5" /></Button>
          <div className="flex flex-col">
            <input value={playlistName} onChange={(e) => { setPlaylistName(e.target.value); setHasUnsavedChanges(true); }} className="bg-transparent border-none focus:ring-0 text-lg font-bold text-white p-0 h-7" />
            <div className="flex items-center gap-2 text-[10px] text-white/40 font-medium uppercase tracking-wider">
              <span>{items.length} ITENS</span> <span className="w-1 h-1 rounded-full bg-white/10" /> <span>{totalDuration}S</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => savePlaylist(items, playlistName)} disabled={isSaving} className={cn("h-9 px-4 gap-2 font-bold text-xs", hasUnsavedChanges ? "bg-green-600 hover:bg-green-700" : "bg-white/5")}>
            <Save className="h-4 w-4" /> {isSaving ? "SALVANDO..." : "SALVAR"}
          </Button>
          <Button variant="outline" className="border-white/10 h-9 px-4 text-white" onClick={handlePreview}><Play className="h-4 w-4 mr-2" /> Preview</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden h-full">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd} 
          onDragStart={(e) => setActiveId(e.active.id as string)}
        >
          <aside className="w-80 border-r border-white/5 bg-[#0c0c0e] flex flex-col z-40 overflow-hidden">
            <Tabs defaultValue="media" className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-4 shrink-0"><TabsList className="grid w-full grid-cols-2 bg-black/40"><TabsTrigger value="media" className="text-[10px] gap-2">Mídias</TabsTrigger><TabsTrigger value="appearance" className="text-[10px] gap-2">Aparência</TabsTrigger></TabsList></div>
              <TabsContent value="media" className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3">
                {medias?.filter(m => m.name.toLowerCase().includes(mediaSearch.toLowerCase())).map((media) => (
                  <DraggableMediaItem 
                    key={media.id} 
                    media={media} 
                    onClick={addItem} 
                  />
                ))}
              </TabsContent>
              <TabsContent value="appearance" className="p-4 space-y-4">
                <div className="flex items-center justify-between"><Label className="text-xs">Mostrar Nome</Label><Switch checked={appearanceConfig.show_device_name} onCheckedChange={(v) => { setAppearanceConfig({...appearanceConfig, show_device_name: v}); setHasUnsavedChanges(true); }} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">Data e Hora</Label><Switch checked={appearanceConfig.show_datetime} onCheckedChange={(v) => { setAppearanceConfig({...appearanceConfig, show_datetime: v}); setHasUnsavedChanges(true); }} /></div>
              </TabsContent>
            </Tabs>
          </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden flex flex-col p-6 gap-6">
            <div className="flex-1 relative bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
              {selectedItem ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 flex items-center justify-center p-8 bg-black/20 overflow-hidden">
                    {selectedItem.type === 'campaign' ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div 
                          className="w-24 h-24 rounded-3xl flex items-center justify-center border-4"
                          style={{ 
                            backgroundColor: `${selectedItem.campaign?.color || '#085CF0'}10`,
                            borderColor: `${selectedItem.campaign?.color || '#085CF0'}`,
                            color: selectedItem.campaign?.color || '#085CF0'
                          }}
                        >
                          <Megaphone className="h-10 w-10" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{selectedItem.campaign?.name}</h3>
                          <p className="text-sm text-white/40 mt-1 uppercase tracking-widest font-mono">
                            Campanha • Prioridade {selectedItem.priority}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-full flex items-center justify-center">
                        {selectedItem.media?.type === 'video' ? <Video className="h-16 w-16 text-white/10 absolute" /> : <ImageIcon className="h-16 w-16 text-white/10 absolute" />}
                        <img 
                          src={selectedItem.media?.thumbnail_url || selectedItem.media?.file_url} 
                          className="max-h-full max-w-full rounded shadow-2xl relative z-10" 
                        />
                      </div>
                    )}
                  </div>

                  {selectedItem.type === 'campaign' && (
                    <div className="h-64 border-t border-white/10 bg-[#0c0c0e]/80 backdrop-blur-md flex flex-col">
                      <div className="h-10 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-black/20">
                        <div className="flex items-center gap-2">
                          <Layers className="h-3 w-3 text-white/40" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Conteúdos da Campanha</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-2 text-[#085CF0] hover:bg-[#085CF0]/10">
                          <Plus className="h-3 w-3" /> Adicionar Mídia
                        </Button>
                      </div>
                      <CampaignDropZone>
                        <ScrollArea className="flex-1">
                        <div className="p-4 flex gap-3">
                          {campaignContents?.map((content: any, idx: number) => (
                            <div key={content.id} className="relative group shrink-0 w-32">
                              <div className="aspect-video rounded-lg overflow-hidden border border-white/10 bg-black/40 relative">
                                <img src={content.media?.thumbnail_url || content.media?.file_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-1 left-1 bg-black/60 px-1 rounded text-[8px] font-mono text-white">{idx + 1}</div>
                                <button 
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const { error } = await supabase.from("campaign_contents").delete().eq("id", content.id);
                                    if (error) toast.error("Erro ao remover");
                                    else { toast.success("Removido"); refetchCampaignContents(); }
                                  }}
                                  className="absolute top-1 right-1 h-5 w-5 rounded bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                              <p className="text-[9px] font-bold text-white/60 mt-2 truncate">{content.media?.name}</p>
                            </div>
                          ))}
                          {(!campaignContents || campaignContents.length === 0) && (
                            <div className="w-full h-32 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-white/10 gap-2">
                              <Plus className="h-6 w-6" />
                              <span className="text-[10px] font-bold uppercase">Nenhum conteúdo</span>
                            </div>
                          )}
                        </div>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    </CampaignDropZone>
                  </div>
                  )}

                  <div className="h-28 bg-card/60 backdrop-blur-md border-t border-white/10 flex items-center justify-between px-6 shrink-0">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {selectedItem.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {selectedItem.type === 'campaign' ? selectedItem.campaign?.name : selectedItem.media?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        {selectedItem.type !== 'campaign' && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-[#085CF0]" />
                            <input 
                              type="number" 
                              disabled={selectedItem.isLocked}
                              value={selectedItem.duration} 
                              onChange={(e) => { 
                                const d = parseInt(e.target.value); 
                                setSelectedItem({...selectedItem, duration: d}); 
                                setItems(items.map(it => it.id === selectedItem.id ? {...it, duration: d} : it)); 
                                setHasUnsavedChanges(true); 
                              }} 
                              className="w-16 bg-black/40 border-white/10 rounded h-8 text-xs px-2 focus:ring-1 focus:ring-[#085CF0] disabled:opacity-50 text-white" 
                            /> 
                            <span className="text-[10px] text-white/40 font-bold uppercase">segundos</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Layers className="h-3 w-3 text-[#085CF0]" />
                          <Select 
                            disabled={selectedItem.isLocked}
                            value={selectedItem.priority.toString()} 
                            onValueChange={(v) => {
                              const p = parseInt(v);
                              setSelectedItem({...selectedItem, priority: p});
                              setItems(items.map(it => it.id === selectedItem.id ? {...it, priority: p} : it));
                              setHasUnsavedChanges(true);
                            }}
                          >
                            <SelectTrigger className="w-20 h-8 text-xs bg-black/40 border-white/10 disabled:opacity-50 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0c0c0e] border-white/10 text-white">
                              {[1,2,3,4,5,6,7,8,9,10].map(p => (
                                <SelectItem key={p} value={p.toString()}>P{p}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-[10px] text-white/40 font-bold uppercase">prioridade</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={cn(
                          "h-9 px-4 gap-2 text-xs border-white/10",
                          selectedItem.isLocked ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" : "bg-white/5 text-white/60 hover:text-white"
                        )}
                        onClick={() => {
                          const newLocked = !selectedItem.isLocked;
                          setSelectedItem({...selectedItem, isLocked: newLocked});
                          setItems(items.map(it => it.id === selectedItem.id ? {...it, isLocked: newLocked} : it));
                          setHasUnsavedChanges(true);
                          toast.success(newLocked ? "Conteúdo bloqueado" : "Conteúdo desbloqueado");
                        }}
                      >
                        {selectedItem.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {selectedItem.isLocked ? "Desbloquear" : "Bloquear"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        disabled={selectedItem.isLocked}
                        className="h-9 px-4 text-red-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50" 
                        onClick={() => removeItem(selectedItem.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10"><Layers className="h-24 w-24 mb-4" /><p className="text-sm font-bold uppercase tracking-widest">Playlist Vazia</p></div>
              )}
            </div>

            <div className="h-44 bg-[#0c0c0e] border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-inner shrink-0">
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-black/20 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#085CF0] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Timeline Principal</span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-white/5" />
                  <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono">
                    <span className="text-[#085CF0] font-bold">{currentTime.toFixed(1)}s</span>
                    <span className="opacity-20">/</span>
                    <span>{totalDuration?.toFixed(1) || '0.0'}s</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-white/60 hover:text-[#085CF0] hover:bg-[#085CF0]/10" 
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-x-auto relative scrollbar-thin scrollbar-thumb-white/10" ref={timelineScrollRef} onClick={handleTimelineClick}>
                <div className="h-full relative px-6 flex items-center" style={{ width: Math.max(800, (totalDuration || 0) * PIXELS_PER_SECOND + 100) }}>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-[#085CF0] z-30 pointer-events-none" style={{ left: ((currentTime || 0) * PIXELS_PER_SECOND) + 24 }} />
                  <div className="flex gap-2">
                    <SortableContext items={items.map(it => it.id)} strategy={horizontalListSortingStrategy}>
                      {items.map((item, index) => (
                        <div key={item.id} className="dnd-item">
                          <SortableItem 
                            item={item} 
                            index={index} 
                            isSelected={selectedItem?.id === item.id} 
                            onSelect={setSelectedItem} 
                          />
                        </div>
                      ))}
                    </SortableContext>
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activeId ? (
                  activeId.toString().startsWith('library-') ? (
                    <div className="w-32 aspect-square rounded-lg overflow-hidden border-2 border-[#085CF0] bg-black shadow-2xl scale-110 opacity-80">
                      <img 
                        src={medias?.find(m => `library-${m.id}` === activeId)?.thumbnail_url || medias?.find(m => `library-${m.id}` === activeId)?.file_url} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="h-24 rounded-xl border-2 border-[#085CF0] bg-black/40 shadow-2xl flex items-center px-4 overflow-hidden" style={{ width: Math.max(100, (items.find(it => it.id === activeId)?.duration || 10) * PIXELS_PER_SECOND) }}>
                      <p className="text-[10px] font-bold text-white truncate">
                        {items.find(it => it.id === activeId)?.type === 'campaign' ? items.find(it => it.id === activeId)?.campaign?.name : items.find(it => it.id === activeId)?.media?.name}
                      </p>
                    </div>
                  )
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>
      </div>
    </div>
  );
}
