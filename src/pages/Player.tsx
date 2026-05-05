import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, ScheduleResolver, MediaCacheService } from "@/components/PlayerServices";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { ManifestService } from "@/services/ManifestService";
import { cn } from "@/lib/utils";

interface AppearanceConfig {
  show_device_name?: boolean;
  show_datetime?: boolean;
  show_serial?: boolean;
  transition_type?: "fade" | "slide-left" | "slide-right" | "zoom" | "none";
  transition_duration?: number;
  footer?: {
    enabled: boolean;
    text: string;
    background_color: string;
    text_color: string;
    height: number;
  };
  logo?: {
    enabled: boolean;
    url: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    size: number;
    opacity?: number;
  };
}

export default function PlayerPage() {
  useEffect(() => {
    // Force black background for all players
    document.body.style.backgroundColor = "black";
    document.documentElement.classList.add("dark");
  }, []);
  const { deviceCode } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const previewPlaylistId = searchParams.get("id");
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [volume, setVolume] = useState(0); // Default muted as requested
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastIndexChange, setLastIndexChange] = useState(Date.now());
  const [syncToast, setSyncToast] = useState<{ msg: string; ts: number } | null>(null);

  const appearance = useMemo(() => (manifest?.appearance_config || {}) as AppearanceConfig, [manifest]);

  // 1. Core Loader: Resolve Identity & Manifest (Offline-First)
  useEffect(() => {
    if (!deviceCode) return;

    async function initializePlayer() {
      // Step A: Load Local Cache Immediately
      if (deviceCode) {
        MediaCacheService.logPerformance(deviceCode, 'init_start', 'Iniciando carregamento do player');
        const cachedManifest = ManifestManager.getManifest(deviceCode);
        if (cachedManifest && !isPreview) {
          console.log("[Player] Resuming from offline manifest");
          MediaCacheService.logPerformance(deviceCode, 'manifest_cache_hit', 'Retomando do manifesto local');
          setManifest(cachedManifest);
          setIsLoading(false);
        }
      }

      try {
        if (isPreview && playlistId) {
          console.log("[Player] Loading preview for playlist:", playlistId);
          const { data: playlist, error } = await supabase
            .from("playlists")
            .select("id, name, updated_at, schedule, appearance_config")
            .eq("id", playlistId)
            .single();

          if (error) throw error;

          const { data: items, error: itemsError } = await supabase
            .from("playlist_items")
            .select("id, media_id, position, ordem, duracao, tipo, media_items(id, name, file_url, thumbnail_url, type, duration)")
            .eq("playlist_id", playlistId);

          if (itemsError) throw itemsError;

          const mapItems = (items: any[]) => (items || [])
            .sort((a, b) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
            .map((item) => {
              const media = Array.isArray(item.media_items) ? item.media_items[0] : item.media_items;
              return {
                id: item.media_id || item.id,
                type: item.tipo || media?.type || "image",
                url: media?.file_url,
                duration: item.duracao || media?.duration || 10,
                name: media?.name || "Sem nome"
              };
            })
            .filter((item) => item.url);

          setManifest({
            playlist_id: playlist.id,
            name: playlist.name,
            updated_at: playlist.updated_at || new Date().toISOString(),
            items: mapItems(items || []),
            appearance_config: playlist.appearance_config || {}
          });
          setIsLoading(false);
          return;
        }

        if (!deviceCode) return;

        console.log("[Player] Fetching initial manifest for device:", deviceCode);
        const result = await ManifestService.fetchManifest(deviceCode);
        setManifest(result.manifest);
        if (result.device) {
          setDeviceUuid(result.device.id?.toString());
          setDeviceInfo(result.device);
        }
        setIsLoading(false);
      } catch (err) {
        console.error("[Player] Initial resolve error:", err);
        setIsLoading(false);
      }
    }

    initializePlayer();
  }, [deviceCode]);

  // 1.5 Realtime Updates via Firebase
  useEffect(() => {
    if (!deviceCode || isPreview) return;
    
    const unsubscribe = FirebaseRealtimeService.subscribeToDeviceUpdates(deviceCode, (payload) => {
      setSyncToast({ msg: "Sincronizando conteúdo...", ts: Date.now() });
      setReloadKey(k => k + 1);
      // auto-hide after 3.5s
      setTimeout(() => {
        setSyncToast(s => (s && Date.now() - s.ts >= 3000 ? null : s));
      }, 3500);
    });

    return () => unsubscribe();
  }, [deviceCode]);

  // 2. Schedule & Queue Resolver
  const activePlaylist = useMemo(() => {
    return ScheduleResolver.getActivePlaylist(manifest);
  }, [manifest]);

  // 3. System Commands (Control Plane)
  useDeviceCommandChannel(isPreview ? undefined : deviceUuid, {
    reloadPlaylist: () => setReloadKey(k => k + 1),
    setVolume: (v) => setVolume(v),
    clearCache: () => { caches.keys().then(ks => ks.map(k => caches.delete(k))); },
    reboot: () => window.location.reload(),
    playCampaign: (id) => console.log("Play campaign", id),
    screenshot: () => Promise.resolve(""),
  });

  const handleMediaChange = useCallback((idx: number) => {
    setCurrentIndex(idx);
    setLastIndexChange(Date.now());
    
    const media = activePlaylist[idx];
    if (media && deviceInfo?.id && !isPreview) {
      // 1. Firebase Realtime Heartbeat (New)
      FirebaseRealtimeService.sendHeartbeat(deviceCode!, media.id?.toString());

      // 2. Proof of Play Log (Legacy compat)
      supabase.functions.invoke('device-api/heartbeat', { 
        body: { 
          serial: deviceInfo.serial,
          media_id: media.id,
          playlist_id: manifest?.playlist_id
        } 
      }).catch(() => {});

      // 3. Trade Marketing Event (New Module)
      supabase.from('media_events').insert({
        device_id: deviceInfo.id,
        media_id: media.id?.toString(),
        playlist_id: manifest?.playlist_id,
        event_type: 'view',
        duration: media.duration || 10,
        metadata: {
          media_name: media.name,
          media_type: media.type,
          serial: deviceInfo.serial
        }
      }).then(({ error }) => {
        if (error) console.error("[Player] Failed to log media event:", error);
      });
    }
  }, [activePlaylist, deviceInfo, manifest, deviceCode]);

  // 4. Background Sync (Polling) - Silent & Efficient
  useEffect(() => {
    if (!deviceCode || isPreview) return;
    
    const backgroundSync = async () => {
      console.log("[Player] Background sync checking for updates...");
      try {
        const { data: device, error } = await (supabase
          .from("dispositivos")
          .select("id, atualizado, playlist_id") as any)
          .or(`apelido_interno.eq."${deviceCode}",serial.eq."${deviceCode}"`)
          .maybeSingle();

        if (error || !device) return;

        const { data: playlistData } = await supabase
          .from("playlists")
          .select("updated_at")
          .eq("id", device.playlist_id)
          .maybeSingle();

        const remoteUpdatedAt = playlistData?.updated_at || device.atualizado || "";
        const cachedManifest = ManifestManager.getManifest(deviceCode);

        if (!cachedManifest || cachedManifest.updated_at !== remoteUpdatedAt) {
          console.log("[Player] Update detected or no cache, fetching manifest...");
          const result = await ManifestService.fetchManifest(deviceCode);
          setManifest(result.manifest);
          setDeviceInfo(result.device || device);
          setDeviceUuid((result.device?.id || device.id).toString());
        } else {
          console.log("[Player] No changes detected in background.");
          if (!deviceInfo) {
            setDeviceInfo(device);
            setDeviceUuid(device.id.toString());
          }
        }
      } catch (err) {
        console.warn("[Player] Background sync failed", err);
      }
    };

    // Initial check immediately, then every 60s
    backgroundSync();
    const interval = setInterval(backgroundSync, 60000);
    
    return () => {
      clearInterval(interval);
    };
  }, [deviceCode, reloadKey]);

  // 5. Heartbeat (Supabase + Firebase)
  useEffect(() => {
    if (!deviceInfo?.serial || !deviceCode || isPreview) return;
    
    const currentMedia = activePlaylist[currentIndex];
    
    const beat = () => {
      // Supabase heartbeat
      supabase.functions.invoke('device-api/heartbeat', { body: { serial: deviceInfo.serial } }).catch(() => {});
      
      // Firebase heartbeat (every 30s)
      FirebaseRealtimeService.sendHeartbeat(deviceCode, currentMedia?.id?.toString());
    };

    beat();
    const interval = setInterval(beat, 30000);
    return () => clearInterval(interval);
  }, [deviceInfo?.serial, deviceCode, activePlaylist, currentIndex]);

  // 6. Page-Level Watchdog (Anti-Stall)
  // Uses RequestAnimationFrame to detect if the entire engine is stuck
  useEffect(() => {
    if (isPreview) return;
    let rafId: number;
    
    const checkEngineHealth = () => {
      const now = Date.now();
      const timeSinceLastAdvance = now - lastIndexChange;
      const currentMedia = activePlaylist[currentIndex];
      
      // Safety margin: 30s beyond media duration or 2 mins default
      const maxWait = currentMedia ? (currentMedia.duration * 1000) + 30000 : 120000;
      
      if (timeSinceLastAdvance > maxWait) {
        console.error("[Player] Page heartbeat detected engine stall. Forcing page reload.");
        window.location.reload();
      }
      
      rafId = requestAnimationFrame(checkEngineHealth);
    };

    rafId = requestAnimationFrame(checkEngineHealth);
    return () => cancelAnimationFrame(rafId);
  }, [lastIndexChange, currentIndex, activePlaylist]);

  // UI Setup - Already handled in top-level useEffect

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (isLoading && !activePlaylist.length) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-widest">Iniciando Engine Profissional...</div>;
  }

  if (!activePlaylist.length) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 text-white/40 font-mono text-xs uppercase tracking-widest">
        <div>Manifesto Vazio</div>
        <div className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-white/70 tracking-wider">
          ID: {deviceCode}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden text-white select-none">
      <PlayerEngine 
        playlist={activePlaylist} 
        volume={volume}
        serial={deviceInfo?.serial || deviceCode}
        onMediaChange={handleMediaChange}
        appearance={{
          transition_type: appearance.transition_type,
          transition_duration: appearance.transition_duration
        }}
      />

      {/* Top Overlay Layer */}
      <div className={cn(
        "absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6",
        isPreview && "rounded-3xl border-8 border-black shadow-inner"
      )}>
        {/* Header: Device Info & Clock */}
        <div className="flex items-start justify-between w-full">
          {/* Device Info */}
          {(appearance.show_device_name !== false && !isPreview) && (
            <div className="flex items-center gap-3 animate-fade-in bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary grid place-items-center font-display font-bold text-primary-foreground shadow-lg shadow-primary/20">M</div>
              <div className="leading-tight">
                <div className="font-display font-bold text-lg tracking-tight">
                  {deviceInfo?.apelido_interno || "Player Profissional"}
                </div>
                <div className="text-[11px] uppercase tracking-[0.2em] opacity-60 font-mono font-bold">
                  {deviceInfo ? `Filial ${deviceInfo.num_filial}` : `Offline · ${deviceCode}`}
                </div>
              </div>
            </div>
          )}

          {/* Date/Time */}
          {(appearance.show_datetime !== false && !isPreview) && (
            <div className="text-right animate-fade-in bg-black/20 backdrop-blur-sm p-3 rounded-xl border border-white/5">
              <div className="font-display text-3xl font-bold tabular-nums tracking-tighter">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-[10px] uppercase opacity-50 font-mono tracking-widest">
                {now.toLocaleDateString("pt-BR", { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Layer */}
        <div className="flex flex-col items-center gap-4">
          {/* Logo Overlay */}
          {appearance.logo?.enabled && appearance.logo.url && (
            <div 
              className={cn(
                "absolute pointer-events-none transition-all duration-500",
                appearance.logo.position === "top-left" && "top-6 left-6",
                appearance.logo.position === "top-right" && "top-6 right-6",
                appearance.logo.position === "bottom-left" && "bottom-6 left-6",
                appearance.logo.position === "bottom-right" && "bottom-6 right-6",
                // Adjust position if header is enabled
                appearance.logo.position === "top-left" && (appearance.show_device_name !== false) && "top-24",
                appearance.logo.position === "top-right" && (appearance.show_datetime !== false) && "top-24"
              )}
              style={{ 
                opacity: appearance.logo.opacity ?? 1,
                // Handle dynamic footer offset
                ...(appearance.logo.position.startsWith('bottom') && appearance.footer?.enabled ? {
                  bottom: `80px`
                } : {})
              }}
            >
              <img 
                src={appearance.logo.url} 
                alt="Logo" 
                style={{ width: `${appearance.logo.size || 80}px`, height: 'auto' }}
                className="drop-shadow-2xl"
              />
            </div>
          )}

          {/* Configurable Footer - Refined & Elegant */}
          {appearance.footer?.enabled && (
            <div 
              className="absolute bottom-6 right-6 z-40 flex items-center justify-center gap-2 px-6 py-3 rounded-2xl backdrop-blur-md shadow-2xl border border-white/5 animate-fade-in max-w-[85%] pointer-events-none"
              style={{ 
                backgroundColor: appearance.footer.background_color || "rgba(0, 0, 0, 0.6)",
                color: appearance.footer.text_color || "#FFFFFF",
              }}
            >
              <div className="flex flex-col items-center justify-center text-center leading-tight">
                <div 
                  className="font-display tracking-wide"
                  style={{ 
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: "1.6rem",
                    letterSpacing: "0.05em"
                  }}
                >
                  <span className="opacity-95 block line-clamp-2">{appearance.footer.text}</span>
                </div>
                {deviceInfo && (
                  <div className="flex items-center gap-1.5 mt-1 opacity-50 font-mono text-[9px] uppercase tracking-widest">
                    <span>Filial {deviceInfo.num_filial}</span>
                    <span>•</span>
                    <span>ID: {deviceCode}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Serial Info (Discreet) */}
      {(appearance.show_serial !== false && !isPreview) && (
        <div className="absolute bottom-4 right-4 z-40 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 font-mono text-[10px] text-white/40 tracking-[0.2em] select-none pointer-events-none uppercase">
          Device ID: {deviceInfo?.serial || deviceCode}
        </div>
      )}

      {/* Discreet sync notification */}
      {syncToast && !isPreview && (
        <div className="absolute bottom-20 left-6 z-40 flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/20 backdrop-blur-xl border border-primary/20 font-mono text-xs text-primary-foreground tracking-wider select-none pointer-events-none animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          {syncToast.msg}
        </div>
      )}
    </div>
  );
}
