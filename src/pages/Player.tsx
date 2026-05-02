import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, MediaCacheService, ScheduleResolver } from "@/components/PlayerServices";

export default function PlayerPage() {
  const { deviceCode } = useParams();
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [volume, setVolume] = useState(0); // Default muted as requested
  const [currentIndex, setCurrentIndex] = useState(0);

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

        // Step C: Fetch Latest Manifest Data
        const playlistId = device.playlist_id || 'e8dab79a-0612-4859-94e0-5e1a6be50756';
        const { data: playlistData } = await supabase
          .from("playlists")
          .select(`
            *,
            playlist_items (
              *,
              media_items (*)
            )
          `)
          .eq("id", playlistId)
          .single();

        if (playlistData) {
          const newManifest = {
            playlist_id: playlistId,
            name: playlistData.name,
            items: playlistData.playlist_items
              .sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
              .map((i: any) => ({
                id: i.media_id,
                type: i.media_items?.type || "image",
                url: i.media_items?.file_url,
                duration: i.duracao || 10,
                name: i.media_items?.name
              }))
              .filter((x: any) => x.url),
            updated_at: new Date().toISOString()
          };

          setManifest(newManifest);
          ManifestManager.saveManifest(deviceCode, newManifest);
          ManifestManager.saveManifest(device.serial, newManifest);
        }
      } catch (err) {
        console.error("[Player] Sync error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initializePlayer();
  }, [deviceCode, reloadKey]);

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

  // 4. Background Sync (Polling)
  useEffect(() => {
    if (!deviceCode) return;
    const interval = setInterval(() => setReloadKey(k => k + 1), 60000);
    return () => clearInterval(interval);
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
    </div>
  );
}
