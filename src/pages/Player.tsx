import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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
  const { deviceCode } = useParams();
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
      MediaCacheService.logPerformance(deviceCode, 'init_start', 'Iniciando carregamento do player');
      const cachedManifest = ManifestManager.getManifest(deviceCode);
      if (cachedManifest) {
        console.log("[Player] Resuming from offline manifest");
        MediaCacheService.logPerformance(deviceCode, 'manifest_cache_hit', 'Retomando do manifesto local');
        setManifest(cachedManifest);
        // We set isLoading to false only if we have content to play
        setIsLoading(false);
      }

      try {
        if (!cachedManifest) {
          console.log("[Player] No cache found, fetching initial manifest...");
          MediaCacheService.logPerformance(deviceCode, 'manifest_fetch_start', 'Buscando manifesto remoto (sem cache)');
          const startTime = Date.now();
          const result = await ManifestService.fetchManifest(deviceCode);
          MediaCacheService.logPerformance(deviceCode, 'manifest_fetch_success', 'Manifesto remoto carregado', {}, Date.now() - startTime);
          setManifest(result.manifest);
          if (result.device) {
            setDeviceUuid(result.device.id?.toString());
            setDeviceInfo(result.device);
          }
          setIsLoading(false);
          return;
        }

        // Step B: Resolve Device Identity in background without blocking playback
        const { data: device, error } = await supabase
          .from("dispositivos")
          .select("*")
          .or(`apelido_interno.eq."${deviceCode}",serial.eq."${deviceCode}"`)
          .maybeSingle();

        if (!error && device) {
          setDeviceUuid(device.id.toString());
          setDeviceInfo(device);
        }
      } catch (err) {
        console.error("[Player] Initial resolve error:", err);
      } finally {
        // Always stop loading spinner if we have manifest, even on error
        if (ManifestManager.getManifest(deviceCode)) {
          setIsLoading(false);
        }
      }
    }

    initializePlayer();
  }, [deviceCode]);

  // 1.5 Realtime Updates via Firebase
  useEffect(() => {
    if (!deviceCode) return;
    
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
  useDeviceCommandChannel(deviceUuid, {
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
    if (media && deviceInfo?.id) {
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
    if (!deviceCode) return;
    
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
    if (!deviceInfo?.serial || !deviceCode) return;
    
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

  // UI Setup
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.background = "#000";
    return () => { document.body.style.background = ""; };
  }, []);

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
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6">
        {/* Header: Device Info & Clock */}
        <div className="flex items-start justify-between w-full">
          {/* Device Info */}
          {(appearance.show_device_name !== false) && (
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
          {(appearance.show_datetime !== false) && (
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
                  bottom: `${(appearance.footer.height || 60) + 24}px`
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

          {/* Configurable Footer */}
          {appearance.footer?.enabled && (
            <div 
              className="w-[calc(100%+3rem)] -mx-6 mb-[-1.5rem] flex items-center justify-center font-display font-bold uppercase tracking-[0.3em] shadow-2xl overflow-hidden"
              style={{ 
                height: `${appearance.footer?.height || 60}px`,
                backgroundColor: appearance.footer?.background_color || "#000000AA",
                color: appearance.footer?.text_color || "#FFFFFF"
              }}
            >
              <div className="animate-pulse">{appearance.footer.text}</div>
            </div>
          )}
        </div>
      </div>

      {/* Serial Info (Discreet) */}
      {(appearance.show_serial !== false) && (
        <div className="absolute bottom-4 right-4 z-40 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 font-mono text-[10px] text-white/40 tracking-[0.2em] select-none pointer-events-none uppercase">
          Device ID: {deviceInfo?.serial || deviceCode}
        </div>
      )}

      {/* Discreet sync notification */}
      {syncToast && (
        <div className="absolute bottom-20 left-6 z-40 flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/20 backdrop-blur-xl border border-primary/20 font-mono text-xs text-primary-foreground tracking-wider select-none pointer-events-none animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          {syncToast.msg}
        </div>
      )}
    </div>
  );
}
