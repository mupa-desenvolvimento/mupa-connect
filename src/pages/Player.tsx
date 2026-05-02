import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, MapPin } from "lucide-react";
import { useParams } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, MediaCacheService, ScheduleResolver } from "@/components/PlayerServices";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";

export default function PlayerPage() {
  const { deviceCode } = useParams();
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [volume, setVolume] = useState(0); // Default muted as requested
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // 1. Core Loader: Resolve Identity & Manifest (Offline-First)
  const [appearance, setAppearance] = useState<any>(null);

  useEffect(() => {
    if (!deviceCode) return;

    async function initializePlayer() {
      // Step A: Load Local Cache Immediately
      const cachedManifest = ManifestManager.getManifest(deviceCode);
      if (cachedManifest) {
        console.log("[Player] Resuming from offline manifest");
        setManifest(cachedManifest);
        setIsLoading(false);
      }

      try {
        // Step B: Resolve Device Identify
        const { data: device, error } = await supabase
          .from("dispositivos")
          .select("*")
          .or(`apelido_interno.eq."${deviceCode}",serial.eq."${deviceCode}"`)
          .maybeSingle();

        if (error || !device) {
          console.warn("[Player] Device identity not found online, staying offline.");
          return;
        }

        setDeviceUuid(device.id.toString());
        setDeviceInfo(device);

        // Step C: Fetch Latest Manifest Data (including Schedules and Fallbacks)
        const { data: deviceManifest, error: manifestError } = await supabase
          .from("dispositivos")
          .select(`
            *,
            playlists!dispositivos_playlist_id_fkey (
              id,
              name,
              updated_at,
              appearance_config,
              playlist_items (
                id, position, duracao,
                media_items (*)
              )
            )
          `)
          .eq("id", device.id)
          .single();

        if (deviceManifest && deviceManifest.playlists) {
          const mainPlaylist = deviceManifest.playlists as any;
          const remoteUpdatedAt = mainPlaylist.updated_at || (deviceManifest as any).atualizado || new Date().toISOString();
          
          // Optimization: Only update if the remote manifest is newer than the cached one
          if (cachedManifest && cachedManifest.updated_at === remoteUpdatedAt) {
            console.log("[Player] Manifest is up to date, skipping heavy re-processing");
            setDeviceInfo(device);
            setDeviceUuid(device.id.toString());
            return;
          }

          console.log("[Player] Manifest changed, updating local cache...");
          
          // Map helper to standardize items
          const mapItems = (items: any[]) => (items || [])
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .map((i: any) => ({
              id: i.media_id || i.id,
              type: i.media_items?.type || "image",
              url: i.media_items?.file_url,
              duration: i.duracao || 10,
              name: i.media_items?.name || "Sem nome"
            }))
            .filter((x: any) => x.url);

          const newManifest = {
            playlist_id: mainPlaylist.id,
            name: mainPlaylist.name,
            updated_at: remoteUpdatedAt,
            items: mapItems(mainPlaylist.playlist_items),
            // Support for advanced scheduling
            schedules: (deviceManifest as any).schedules || [], 
            fallback_items: mapItems((deviceManifest as any).fallback_playlist_items),
            appearance_config: mainPlaylist.appearance_config || (deviceManifest as any).appearance_config || {}
          };

          setAppearance(newManifest.appearance_config);
          setManifest(newManifest);
          ManifestManager.saveManifest(deviceCode, newManifest);
          if (device.serial) ManifestManager.saveManifest(device.serial, newManifest);
        }
      } catch (err) {
        console.error("[Player] Sync error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initializePlayer();
  }, [deviceCode, reloadKey]);

  // 1.5 Realtime Updates via Firebase
  useEffect(() => {
    if (!deviceCode) return;
    
    const unsubscribe = FirebaseRealtimeService.subscribeToDeviceUpdates(deviceCode, () => {
      console.log("[Player] Realtime update signal received");
      setIsSyncing(true);
      setLastSyncTime(new Date());
      setReloadKey(k => k + 1);
      
      // Discrete notification timeout
      setTimeout(() => setIsSyncing(false), 3000);
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
    
    // Proof of Play Log (Background, non-blocking)
    if (activePlaylist[idx] && deviceInfo?.serial) {
      supabase.functions.invoke('device-api/proof', {
        body: { 
          serial: deviceInfo.serial,
          playlist_id: manifest?.playlist_id,
          media_id: activePlaylist[idx].id,
          payload: {
            media_name: activePlaylist[idx].name,
            playlist_name: manifest?.name
          }
        }
      }).catch(() => {});
    }
  }, [activePlaylist, deviceInfo?.serial, manifest]);

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

        if (cachedManifest && cachedManifest.updated_at !== remoteUpdatedAt) {
          console.log("[Player] Update detected in background, triggering silent reload...");
          setIsSyncing(true);
          setLastSyncTime(new Date());
          setReloadKey(k => k + 1);
          setTimeout(() => setIsSyncing(false), 3000);
        } else {
          console.log("[Player] No changes detected in background.");
        }
      } catch (err) {
        console.warn("[Player] Background sync failed", err);
      }
    };

    // Initial check after 30s, then every 60s (configurable)
    const initialTimer = setTimeout(backgroundSync, 30000);
    const interval = setInterval(backgroundSync, 60000);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [deviceCode]);

  // 5. Heartbeat
  useEffect(() => {
    if (!deviceInfo?.serial) return;
    const beat = () => supabase.functions.invoke('device-api/heartbeat', { body: { serial: deviceInfo.serial } }).catch(() => {});
    beat();
    const interval = setInterval(beat, 30000);
    return () => clearInterval(interval);
  }, [deviceInfo?.serial]);

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
    <div className="fixed inset-0 bg-black overflow-hidden text-white">
      <PlayerEngine 
        playlist={activePlaylist} 
        volume={volume}
        appearance={appearance}
        onMediaChange={handleMediaChange}
      />

      {/* HUD overlay - Zero flickering absolute layers */}
      {(appearance?.show_device_name !== false || appearance?.show_datetime !== false) && (
        <div className="absolute top-0 left-0 right-0 p-8 flex items-start justify-between bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 pointer-events-none transition-all duration-500">
          <div className="flex items-center gap-4">
            {appearance?.show_device_name !== false && (
              <>
                <div className="h-12 w-12 rounded-xl bg-[#085CF0] grid place-items-center font-display font-black text-white text-2xl shadow-[0_0_20px_rgba(8,92,240,0.4)]">
                  {deviceInfo?.apelido_interno?.charAt(0) || "M"}
                </div>
                <div className="leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <div className="font-display font-black text-2xl text-white tracking-tight">
                    {deviceInfo?.apelido_interno || "Player Profissional"}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10 text-[10px] uppercase font-mono font-bold text-white/90 flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-[#085CF0]" />
                      Filial {deviceInfo?.num_filial || "—"}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {appearance?.show_datetime !== false && (
            <div className="text-right drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              <div className="font-display text-4xl font-black tabular-nums text-white tracking-tighter">
                {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="text-[12px] uppercase tracking-[0.3em] text-[#085CF0] font-mono font-black mt-1">
                {now.toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: 'long' }).split(',')[0]}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-[70] flex flex-col items-end gap-2 pointer-events-none">
        {isSyncing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-primary animate-in fade-in zoom-in duration-300">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Sincronizando...</span>
          </div>
        )}
        
        {appearance?.show_serial !== false && (
          <div className="px-3 py-1.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/5 font-mono text-[10px] text-white/40 tracking-wider select-none">
            SERIAL: {deviceInfo?.serial || deviceCode}
            {lastSyncTime && (
              <span className="ml-2 opacity-30">
                V.{lastSyncTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
