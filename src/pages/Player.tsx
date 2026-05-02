import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, MediaCacheService, ScheduleResolver } from "@/components/PlayerServices";
import { FirebaseRealtimeService } from "@/services/FirebaseRealtimeService";
import { ManifestService } from "@/services/ManifestService";

export default function PlayerPage() {
  const { deviceCode } = useParams();
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [volume, setVolume] = useState(0); // Default muted as requested
  const [currentIndex, setCurrentIndex] = useState(0);
  const [syncToast, setSyncToast] = useState<{ msg: string; ts: number } | null>(null);

  // 1. Core Loader: Resolve Identity & Manifest (Offline-First)
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

        // Step C: Manifest is now handled by BackgroundSync and Realtime updates
        // We rely on the local cache for immediate playback to ensure zero-flicker startups
        setIsLoading(false);
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

        if (!cachedManifest || cachedManifest.updated_at !== remoteUpdatedAt) {
          console.log("[Player] Update detected or no cache, fetching manifest...");
          const newManifest = await ManifestService.fetchManifest(deviceCode);
          setManifest(newManifest);
          setDeviceInfo(device);
          setDeviceUuid(device.id.toString());
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
        onMediaChange={handleMediaChange}
      />

      {/* HUD overlay - Zero flickering absolute layers */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center font-display font-bold text-primary-foreground">M</div>
          <div className="leading-tight">
            <div className="font-display font-semibold">{deviceInfo?.apelido_interno || "Player Profissional"}</div>
            <div className="text-[11px] uppercase tracking-widest opacity-70 font-mono">
              {deviceInfo ? `Filial ${deviceInfo.num_filial}` : `Cache Local · ${deviceCode}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tabular-nums">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 z-30 px-3 py-1.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 font-mono text-xs text-white/80 tracking-wider select-none pointer-events-none">
        ID: {deviceInfo?.serial || deviceCode}
      </div>

      {/* Discreet sync notification */}
      {syncToast && (
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 font-mono text-xs text-white/80 tracking-wider select-none pointer-events-none animate-fade-in">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {syncToast.msg}
        </div>
      )}
    </div>
  );
}
