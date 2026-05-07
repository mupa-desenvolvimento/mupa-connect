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
  logo: { enabled: false, url: "", position: "top-left", size: 80, opacity: 1 },
  custom_preview_url: "https://qtbkvshbmqlszncxlcuc.supabase.co/storage/v1/object/public/dsl-uploads/kqrRuPz304ckV2bn5HmQpveeQQo1/b19f4132-ca7d-4c68-8eec-d7645111e6f0.png"
};

const normalizeAppearanceConfig = (config?: any) => ({
  ...DEFAULT_APPEARANCE_CONFIG,
  ...(config && typeof config === "object" ? config : {}),
  footer: { ...DEFAULT_APPEARANCE_CONFIG.footer, ...(config?.footer && typeof config.footer === "object" ? config.footer : {}) },
  logo: { ...DEFAULT_APPEARANCE_CONFIG.logo, ...(config?.logo && typeof config.logo === "object" ? config.logo : {}) }
});

const SortableItem = ({ item, index, isSelected, onSelect }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id,
    disabled: item.isLocked 
  });
  
  const media = item.media;
  const isCampaignItem = item.campaignId;
  const campaign = item.campaign;
  
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
        "relative shrink-0 w-[180px] h-[240px] rounded-2xl border transition-all cursor-pointer group overflow-hidden flex flex-col bg-[#1A1A1E]",
        isSelected ? "border-[#085CF0] ring-2 ring-[#085CF0]/30 shadow-[0_0_20px_rgba(8,92,240,0.2)]" : "border-white/5 hover:border-white/20",
        item.isLocked && "opacity-80"
      )}
    >
      {/* Thumbnail Area */}
      <div className="relative h-[160px] w-full overflow-hidden bg-black/40">
        {!isCampaignItem ? (
          <img 
            src={media?.thumbnail_url || media?.file_url} 
            alt={media?.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20"
              style={{ backgroundColor: campaign?.color || '#085CF0' }}
            />
            <Megaphone className="h-12 w-12 relative z-10" style={{ color: campaign?.color || '#085CF0' }} />
          </div>
        )}
        
        {/* Badges/Overlays */}
        <div className="absolute top-2 left-2 flex gap-1.5 z-10">
          <span className="text-[10px] font-mono font-bold text-white/90 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
            {index + 1}
          </span>
          {item.isLocked && (
            <div className="bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded px-1.5 py-0.5 flex items-center">
              <Lock className="h-3 w-3" />
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] font-bold text-white/90 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1">
            <Clock className="h-3 w-3 text-[#085CF0]" /> {item.duration}s
          </span>
        </div>

        {/* Drag Handle */}
        {!item.isLocked && (
          <div 
            {...attributes} 
            {...listeners} 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing z-20 hover:bg-[#085CF0]"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="flex-1 p-3 flex flex-col justify-between relative bg-gradient-to-b from-[#1A1A1E] to-[#141417]">
        <p className="text-xs font-bold text-white/90 line-clamp-2 leading-tight">
          {isCampaignItem ? campaign?.name : (media?.name || 'Sem nome')}
        </p>
        
        <div className="flex items-center justify-between mt-auto pt-2">
          {!isCampaignItem ? (
            <div className="flex items-center gap-1.5">
              {media?.type === 'video' ? <Video className="h-3 w-3 text-white/40" /> : <ImageIcon className="h-3 w-3 text-white/40" />}
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{item.type}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Megaphone className="h-3 w-3" style={{ color: campaign?.color || '#085CF0' }} />
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: campaign?.color || '#085CF0' }}>Campanha</span>
            </div>
          )}
          {item.priority > 1 && (
            <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-[#085CF0]/30 bg-[#085CF0]/10 text-[#085CF0] font-bold">
              P{item.priority}
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom Color Bar (Campaign Indicator) */}
      <div 
        className="h-1.5 w-full mt-auto"
        style={{ 
          backgroundColor: isCampaignItem ? (campaign?.color || '#085CF0') : 'transparent',
          boxShadow: isCampaignItem ? `0 -4px 12px ${(campaign?.color || '#085CF0')}40` : 'none'
        }}
      />
    </div>
  );
};

const DraggableMediaItem = ({ media, onClick, isSelected, onToggleSelect }: any) => {
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
      className={cn(
        "relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border transition-all group",
        isSelected ? "border-[#085CF0] ring-2 ring-[#085CF0]/20" : "border-white/10 hover:border-[#085CF0]",
        isDragging && "opacity-50 ring-2 ring-[#085CF0] z-50"
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
            isSelected ? "bg-[#085CF0] border-[#085CF0]" : "bg-black/40 border-white/20 hover:border-white/40"
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

const DraggableCampaignItem = ({ campaign, onClick }: any) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-campaign-${campaign.id}`,
    data: {
      type: 'library-campaign',
      campaignId: campaign.id,
      campaign: campaign
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
        "relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer border transition-all group border-white/10 hover:border-[#085CF0]",
        isDragging && "opacity-50 ring-2 ring-[#085CF0] z-50"
      )}
      onClick={() => onClick(campaign.id)}
    >
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-black/40">
        <div 
          className="absolute inset-0 opacity-10"
          style={{ backgroundColor: campaign.color || '#085CF0' }}
        />
        <Megaphone className="h-8 w-8 relative z-10" style={{ color: campaign.color || '#085CF0' }} />
      </div>
      
      <div 
        {...listeners} 
        {...attributes}
        className="absolute inset-0 z-10"
      />

      <div className="absolute bottom-1 left-1 right-1 text-[10px] truncate bg-black/60 px-1 rounded font-bold text-white/90 z-20">
        {campaign.name}
      </div>
    </div>
  );
};

const CampaignDropZone = ({ children }: any) => {
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
        "flex-1 flex flex-col transition-all duration-200 relative",
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

const TimelineDropZone = ({ children }: any) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'playlist-timeline-drop-zone',
    data: {
      accepts: ['library-campaign']
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "h-full relative px-8 flex items-center min-w-full",
        isOver && "bg-[#085CF0]/5 ring-2 ring-[#085CF0]/20 ring-inset"
      )}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-[#085CF0] text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl animate-bounce">
            <Plus className="h-4 w-4" /> Adicionar Campanha à Playlist
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
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [mediaSearch, setMediaSearch] = useState("");
  const [appearanceConfig, setAppearanceConfig] = useState<any>(DEFAULT_APPEARANCE_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const playheadIntervalRef = useRef<number | null>(null);

  const totalDuration = useMemo(() => items.reduce((acc, it) => acc + it.duration, 0), [items]);

  const { data: allCampaigns } = useQuery({
    queryKey: ["all-campaigns", contextId],
    queryFn: async () => {
      if (!contextId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .or(`company_id.eq.${contextId},tenant_id.eq.${contextId}`)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!contextId
  });

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

    // Handle library to campaign content drop
    if (over.id === 'campaign-drop-zone' && active.data.current?.type === 'library-media') {
      const mediaId = active.data.current.mediaId;
      if (selectedLibraryIds.includes(mediaId)) {
        addMultipleItems(selectedLibraryIds);
      } else {
        addItem(mediaId);
      }
      return;
    }

    // Handle library campaign to playlist timeline drop
    if (over.id === 'playlist-timeline-drop-zone' && active.data.current?.type === 'library-campaign') {
      const campaign = active.data.current.campaign;
      addCampaignToPlaylist(campaign);
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

  const addCampaignToPlaylist = async (campaign: any) => {
    try {
      // Buscar os conteúdos da campanha
      const { data: contents, error: contentsError } = await supabase
        .from("campaign_contents")
        .select("*, media:media_items(*)")
        .eq("campaign_id", campaign.id)
        .eq("is_active", true)
        .order("position");

      if (contentsError) throw contentsError;

      if (!contents || contents.length === 0) {
        toast.error(`A campanha "${campaign.name}" não possui conteúdos.`);
        return;
      }

      // Transformar os conteúdos da campanha em itens da playlist
      const newItems: EditorPlaylistItem[] = contents.map(content => ({
        id: `campaign-item-${Date.now()}-${Math.random()}`,
        mediaId: content.media_id,
        duration: content.duration_override || content.media?.duration || 10,
        priority: 1,
        type: content.media?.type === 'video' ? 'video' : 'image',
        media: content.media,
        campaignId: campaign.id,
        campaign: campaign
      }));

      const updatedItems = [...items, ...newItems];
      setItems(updatedItems);
      setHasUnsavedChanges(true);
      toast.success(`${contents.length} itens da campanha "${campaign.name}" adicionados.`);
    } catch (err: any) {
      toast.error(`Erro ao processar campanha: ${err.message}`);
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

  const addMultipleItems = async (mediaIds: string[]) => {
    if (mediaIds.length === 0) return;
    
    if (selectedItem?.type === 'campaign') {
      const contentsToInsert = mediaIds.map((mediaId, index) => ({
        campaign_id: selectedItem.campaignId,
        media_id: mediaId,
        tenant_id: tenantId,
        position: (campaignContents?.length || 0) + index + 1,
        is_active: true
      }));

      const { error } = await supabase.from("campaign_contents").insert(contentsToInsert);
      
      if (error) {
        toast.error("Erro ao adicionar itens à campanha");
      } else {
        toast.success(`${mediaIds.length} itens adicionados à campanha ${selectedItem.campaign?.name}`);
        setSelectedLibraryIds([]);
        refetchCampaignContents();
      }
      return;
    }

    // Adding to regular playlist
    const newPlaylistItems: EditorPlaylistItem[] = mediaIds.map(mediaId => {
      const media = medias?.find(m => m.id === mediaId);
      return {
        id: `temp-${Date.now()}-${Math.random()}`,
        mediaId: mediaId,
        duration: media?.duration || 10,
        priority: 1,
        type: media?.type === 'video' ? 'video' : 'image',
        media: media
      };
    });

    const newItems = [...items, ...newPlaylistItems];
    setItems(newItems);
    setSelectedLibraryIds([]);
    setHasUnsavedChanges(true);
    toast.success(`${mediaIds.length} itens adicionados`);
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
              <div className="p-4 space-y-4 shrink-0">
                <TabsList className="grid w-full grid-cols-3 bg-black/40">
                  <TabsTrigger value="media" className="text-[10px] gap-2">Mídias</TabsTrigger>
                  <TabsTrigger value="campaigns" className="text-[10px] gap-2">Campanhas</TabsTrigger>
                  <TabsTrigger value="appearance" className="text-[10px] gap-2">Aparência</TabsTrigger>
                </TabsList>
                
                <TabsContent value="media" className="m-0">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                        <input 
                          placeholder="Buscar mídias..." 
                          className="w-full h-8 pl-8 text-[10px] bg-black/40 border border-white/5 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#085CF0]" 
                          value={mediaSearch}
                          onChange={(e) => setMediaSearch(e.target.value)}
                        />
                      </div>
                      {selectedLibraryIds.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-[10px] text-red-500 hover:bg-red-500/10"
                          onClick={() => setSelectedLibraryIds([])}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {selectedLibraryIds.length > 0 && (
                      <div className="bg-[#085CF0]/10 border border-[#085CF0]/30 rounded-lg p-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#085CF0]">
                          {selectedLibraryIds.length} selecionados
                        </span>
                        <Button 
                          size="sm" 
                          className="h-6 px-2 text-[9px] bg-[#085CF0] hover:bg-[#085CF0]/80"
                          onClick={() => addMultipleItems(selectedLibraryIds)}
                        >
                          Adicionar
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="campaigns" className="m-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                    <input 
                      placeholder="Buscar campanhas..." 
                      className="w-full h-8 pl-8 text-[10px] bg-black/40 border border-white/5 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-[#085CF0]" 
                    />
                  </div>
                </TabsContent>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <TabsContent value="media" className="h-full m-0 p-4 overflow-y-auto grid grid-cols-2 gap-3 pb-20">
                  {medias?.filter(m => m.name.toLowerCase().includes(mediaSearch.toLowerCase())).map((media) => (
                    <DraggableMediaItem 
                      key={media.id} 
                      media={media} 
                      onClick={addItem} 
                      isSelected={selectedLibraryIds.includes(media.id)}
                      onToggleSelect={(id: string) => {
                        setSelectedLibraryIds(prev => 
                          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                        );
                      }}
                    />
                  ))}
                </TabsContent>

                <TabsContent value="campaigns" className="h-full m-0 p-4 overflow-y-auto grid grid-cols-2 gap-3 pb-20">
                  {allCampaigns?.map((campaign) => (
                    <DraggableCampaignItem 
                      key={campaign.id} 
                      campaign={campaign} 
                      onClick={addCampaignToPlaylist} 
                    />
                  ))}
                </TabsContent>

                <TabsContent value="appearance" className="h-full m-0 p-4 space-y-4">
                  <div className="flex items-center justify-between"><Label className="text-xs">Mostrar Nome</Label><Switch checked={appearanceConfig.show_device_name} onCheckedChange={(v) => { setAppearanceConfig({...appearanceConfig, show_device_name: v}); setHasUnsavedChanges(true); }} /></div>
                  <div className="flex items-center justify-between"><Label className="text-xs">Data e Hora</Label><Switch checked={appearanceConfig.show_datetime} onCheckedChange={(v) => { setAppearanceConfig({...appearanceConfig, show_datetime: v}); setHasUnsavedChanges(true); }} /></div>
                </TabsContent>
              </div>
            </Tabs>
          </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden flex flex-row p-6 gap-6">
            {/* Preview Section */}
            <div className="flex-1 relative bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-2xl flex flex-col">
              {selectedItem ? (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 flex items-center justify-center p-8 bg-black/20 overflow-hidden">
                    {selectedItem.campaignId ? (
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div 
                          className="w-32 h-32 rounded-[2rem] flex items-center justify-center border-4 shadow-[0_0_30px_rgba(var(--campaign-color-rgb),0.2)]"
                          style={{ 
                            backgroundColor: `${selectedItem.campaign?.color || '#085CF0'}10`,
                            borderColor: `${selectedItem.campaign?.color || '#085CF0'}`,
                            color: selectedItem.campaign?.color || '#085CF0',
                          } as any}
                        >
                          <Megaphone className="h-14 w-14" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white tracking-tight">{selectedItem.campaign?.name}</h3>
                          <div className="flex items-center justify-center gap-3 mt-2">
                            <Badge variant="outline" className="text-[10px] border-white/10 bg-white/5 uppercase tracking-widest px-3">
                              Parte da Campanha
                            </Badge>
                            <div className="relative h-12 w-24 rounded-lg overflow-hidden border border-white/10 bg-black">
                               <img 
                                src={selectedItem.media?.thumbnail_url || selectedItem.media?.file_url} 
                                className="w-full h-full object-contain" 
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-full w-full flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
                          {selectedItem.media?.type === 'video' ? <Video className="h-64 w-64 text-white" /> : <ImageIcon className="h-64 w-64 text-white" />}
                        </div>
                        <div className="relative z-10 max-h-full max-w-full aspect-video rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 bg-black">
                           <img 
                            src={selectedItem.media?.thumbnail_url || selectedItem.media?.file_url} 
                            className="w-full h-full object-contain" 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/5">
                  <Monitor className="h-32 w-32 mb-6" />
                  <p className="text-sm font-bold uppercase tracking-[0.3em]">Selecione um item</p>
                </div>
              )}
            </div>

            {/* Sidebar Controls */}
            {selectedItem && (
              <div className="w-80 bg-[#0c0c0e] border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right-8 duration-500">
                <div className="p-6 border-b border-white/5 bg-black/20">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-[#085CF0] uppercase tracking-[0.2em]">Propriedades</span>
                    {selectedItem.isLocked && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] uppercase font-bold">Bloqueado</Badge>}
                  </div>
                  <h4 className="text-lg font-bold text-white leading-tight">
                    {selectedItem.media?.name}
                  </h4>
                  {selectedItem.campaign && (
                    <div className="mt-2 flex items-center gap-2">
                      <Megaphone className="h-3.5 w-3.5" style={{ color: selectedItem.campaign.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: selectedItem.campaign.color }}>
                        {selectedItem.campaign.name}
                      </span>
                    </div>
                  )}
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-8">
                    {/* Settings Group */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Configurações</Label>
                        <div className="space-y-4 pt-2">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-white/80">Duração</span>
                              <span className="text-xs font-mono text-[#085CF0]">{selectedItem.duration}s</span>
                            </div>
                            <Slider 
                              disabled={selectedItem.isLocked}
                              value={[selectedItem.duration]} 
                              min={1} 
                              max={600} 
                              step={1}
                              onValueChange={([val]) => {
                                setSelectedItem({...selectedItem, duration: val});
                                setItems(items.map(it => it.id === selectedItem.id ? {...it, duration: val} : it));
                                setHasUnsavedChanges(true);
                              }}
                              className="py-2"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <span className="text-xs font-medium text-white/80">Prioridade</span>
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
                              <SelectTrigger className="w-full bg-black/40 border-white/10 text-sm h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#0c0c0e] border-white/10 text-white">
                                {[1,2,3,4,5,6,7,8,9,10].map(p => (
                                  <SelectItem key={p} value={p.toString()}>Prioridade {p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-white/5" />

                    {/* Actions Group */}
                    <div className="space-y-4">
                      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ações Rápidas</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <Button 
                          variant="outline" 
                          className={cn(
                            "w-full h-11 justify-start gap-3 border-white/5 font-bold text-xs uppercase tracking-widest",
                            selectedItem.isLocked ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-white/5 text-white/60"
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
                          className="w-full h-11 justify-start gap-3 text-red-500 hover:text-red-400 hover:bg-red-500/10 font-bold text-xs uppercase tracking-widest disabled:opacity-30" 
                          onClick={() => removeItem(selectedItem.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

            {/* Timeline Area */}
            <div className="h-72 bg-[#0c0c0e] border-t border-white/5 flex flex-col overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.3)] shrink-0">
              <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-black/20 shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-[#085CF0] shadow-[0_0_8px_rgba(8,92,240,0.8)] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Timeline do Editor</span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-white/10" />
                  <div className="flex items-center gap-3 text-[10px] text-white/60 font-mono">
                    <span className="text-[#085CF0] font-bold">{currentTime.toFixed(1)}s</span>
                    <span className="opacity-20">/</span>
                    <span>{totalDuration?.toFixed(1) || '0.0'}s</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-white/60 hover:text-[#085CF0] hover:bg-white/5" 
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <TimelineDropZone>
                  <div 
                    className="h-full flex items-center" 
                    ref={timelineScrollRef} 
                    onClick={handleTimelineClick}
                  >
                    {/* Playhead */}
                    <div 
                      className="absolute top-0 bottom-0 w-[2px] bg-[#085CF0] z-30 pointer-events-none shadow-[0_0_15px_rgba(8,92,240,0.5)] transition-all duration-100 ease-linear" 
                      style={{ left: ((currentTime || 0) * PIXELS_PER_SECOND) + 32 }} 
                    />
                    
                    <div className="flex gap-4 items-center">
                      <SortableContext items={items.map(it => it.id)} strategy={horizontalListSortingStrategy}>
                        {items.map((item, index) => (
                          <div key={item.id} className="dnd-item animate-in zoom-in-95 fade-in duration-300">
                            <SortableItem 
                              item={item} 
                              index={index} 
                              isSelected={selectedItem?.id === item.id} 
                              onSelect={setSelectedItem} 
                            />
                          </div>
                        ))}
                      </SortableContext>
                      
                      {/* Add Item Placeholder */}
                      <div className="w-[180px] h-[240px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-white/5 gap-3 hover:border-white/10 hover:text-white/10 transition-all">
                         <Plus className="h-10 w-10" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Adicionar Item</span>
                      </div>
                    </div>
                  </div>
                </TimelineDropZone>
                <ScrollBar orientation="horizontal" className="bg-transparent" />
              </ScrollArea>
            </div>
          </main>

          <DragOverlay dropAnimation={null}>
            {activeId ? (
              activeId.toString().startsWith('library-') ? (
                <div className="relative">
                  <div className="w-32 aspect-square rounded-2xl overflow-hidden border-2 border-[#085CF0] bg-black shadow-2xl scale-110 opacity-90 rotate-3">
                    <img 
                      src={medias?.find(m => `library-${m.id}` === activeId)?.thumbnail_url || medias?.find(m => `library-${m.id}` === activeId)?.file_url} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  {selectedLibraryIds.length > 1 && selectedLibraryIds.includes(activeId.toString().replace('library-', '')) && (
                    <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-[#085CF0] text-white flex items-center justify-center font-bold text-sm shadow-xl border-2 border-white animate-in zoom-in">
                      {selectedLibraryIds.length}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-[180px] h-[240px] rounded-2xl border-2 border-[#085CF0] bg-[#1A1A1E] shadow-2xl flex flex-col overflow-hidden scale-105 rotate-2 opacity-90">
                  <div className="h-32 bg-black/40 flex items-center justify-center">
                    {items.find(it => it.id === activeId)?.type === 'campaign' ? (
                      <Megaphone className="h-12 w-12 text-[#085CF0]" />
                    ) : (
                      <img 
                        src={items.find(it => it.id === activeId)?.media?.thumbnail_url || items.find(it => it.id === activeId)?.media?.file_url} 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold text-white truncate">
                      {items.find(it => it.id === activeId)?.type === 'campaign' ? items.find(it => it.id === activeId)?.campaign?.name : items.find(it => it.id === activeId)?.media?.name}
                    </p>
                  </div>
                </div>
              )
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
