import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";
import { PlayerEngine } from "@/components/PlayerEngine";
import { ManifestManager, MediaCacheService } from "@/components/PlayerServices";

export default function PlayerPage() {
  const { deviceCode } = useParams();
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [volume, setVolume] = useState(60);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. Resolve Device and Playlist
  useEffect(() => {
    if (!deviceCode) return;

    async function resolvePlaylist() {
      setIsLoading(true);
      try {
        // Try to load from manifest first for speed/offline
        const localManifest = ManifestManager.getManifest(deviceCode);
        if (localManifest && localManifest.items) {
          console.log("[Player] Loading from local manifest");
          setPlaylist({
            id: localManifest.playlist_id,
            playlist_items: localManifest.items.map((item: any) => ({
              media_id: item.media_id,
              duracao: item.duration,
              media_items: {
                name: item.name,
                file_url: item.url,
                type: item.type
              }
            }))
          });
          setIsLoading(false);
        }

        const { data: device, error: devError } = await supabase
          .from("dispositivos")
          .select("id, num_filial, grupo_dispositivos, empresa, apelido_interno, serial, playlist_id")
          .eq("apelido_interno", deviceCode)
          .maybeSingle();

        let targetDevice = device;

        if (devError || !device) {
          const { data: deviceBySerial } = await supabase
            .from("dispositivos")
            .select("id, num_filial, grupo_dispositivos, empresa, apelido_interno, serial, playlist_id")
            .eq("serial", deviceCode)
            .maybeSingle();
            
          if (!deviceBySerial) {
            console.error("Device not found:", deviceCode);
            if (!localManifest) setIsLoading(false);
            return;
          }
          targetDevice = deviceBySerial;
        }

        setDeviceUuid(targetDevice.id.toString());
        setDeviceInfo(targetDevice);
        
        const playlistId = targetDevice.playlist_id || 'e8dab79a-0612-4859-94e0-5e1a6be50756';
        await loadPlaylist(playlistId, targetDevice.serial);
      } catch (err) {
        console.error("Resolution error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    async function loadPlaylist(playlistId: string, serial: string) {
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
        setPlaylist(playlistData);
        // Save to offline manifest
        const manifest = {
          playlist_id: playlistId,
          items: playlistData.playlist_items.map((i: any) => ({
            media_id: i.media_id,
            type: i.media_items?.type,
            url: i.media_items?.file_url,
            duration: i.duracao,
            name: i.media_items?.name
          }))
        };
        ManifestManager.saveManifest(serial, manifest);
        ManifestManager.saveManifest(deviceCode, manifest); // Also save by deviceCode
      }
    }

    resolvePlaylist();
  }, [deviceCode, reloadKey]);

  useDeviceCommandChannel(deviceUuid, {
    reloadPlaylist: async () => {
      console.log("[Player] Reload command received");
      setReloadKey(k => k + 1);
    },
    playCampaign:   (id) => console.info("[player] play_campaign", id),
    setVolume:      (v) => setVolume(v),
    screenshot:     () => Promise.resolve(),
    clearCache:     async () => { try { await caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))); } catch {} },
    reboot:         () => { window.location.reload(); return Promise.resolve(); },
  });

  const formattedPlaylist = useMemo(() => {
    if (playlist?.playlist_items?.length) {
      return playlist.playlist_items
        .sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
        .map((i: any) => ({ 
          id: i.media_id || i.id, // Use media_id if available
          name: i.media_items?.name || "Sem nome",
          url: i.media_items?.file_url,
          type: i.media_items?.type || "image",
          duration: i.duracao || 10 
        }))
        .filter((x: any) => x.url);
    }
    return [];
  }, [playlist]);

  const currentMedia = useMemo(() => formattedPlaylist[currentIndex] || null, [formattedPlaylist, currentIndex]);

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.style.background = "#000";
    return () => {
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Heartbeat logic
  useEffect(() => {
    if (!deviceInfo?.serial) return;
    const sendHeartbeat = async () => {
      try {
        await supabase.functions.invoke('device-api/heartbeat', {
          body: { serial: deviceInfo.serial }
        });
      } catch (err) {
        console.error("Heartbeat error:", err);
      }
    };
    sendHeartbeat();
    const t = window.setInterval(sendHeartbeat, 30000);
    return () => clearInterval(t);
  }, [deviceInfo?.serial]);

  // Proof of Play logic
  useEffect(() => {
    if (formattedPlaylist.length > 0 && deviceInfo?.serial && currentMedia) {
      supabase.functions.invoke('device-api/proof', {
        body: { 
          serial: deviceInfo.serial,
          playlist_id: playlist?.id,
          media_id: currentMedia.id,
          payload: {
            media_name: currentMedia.name,
            playlist_name: playlist?.name
          }
        }
      }).catch(err => console.error("Proof error:", err));
    }
  }, [currentIndex, formattedPlaylist.length, deviceInfo?.serial, currentMedia, playlist?.id]);

  if (isLoading && !formattedPlaylist.length) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-widest">Iniciando Player Mupa...</div>;
  }

  if (!formattedPlaylist.length) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-widest">Nenhum conteúdo para exibir</div>;
  }

  // currentMedia already defined via useMemo above

  return (
    <div className="fixed inset-0 bg-black overflow-hidden text-white">
      <PlayerEngine 
        playlist={formattedPlaylist} 
        volume={volume}
        onMediaChange={(idx) => setCurrentIndex(idx)}
      />

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent z-20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary grid place-items-center font-display font-bold text-primary-foreground">M</div>
          <div className="leading-tight">
            <div className="font-display font-semibold">{deviceInfo?.apelido_interno || "Player Mupa"}</div>
            <div className="text-[11px] uppercase tracking-widest opacity-70 font-mono">
              {deviceInfo ? `Filial ${deviceInfo.num_filial}` : `Modo demo · code=${deviceCode ?? "—"}`}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tabular-nums">
            {now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="text-[11px] uppercase tracking-widest opacity-70">
            {now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
          </div>
        </div>
      </div>

      {/* Bottom progress */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent z-20">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono opacity-80">{String(currentIndex + 1).padStart(2, "0")} / {String(formattedPlaylist.length).padStart(2, "0")}</span>
          <span className="text-sm truncate">{currentMedia.name}</span>
        </div>
        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
          <div
            key={currentIndex}
            className="h-full bg-primary"
            style={{ animation: `mupaProgress ${currentMedia.duration || 8}s linear forwards` }}
          />
        </div>
      </div>

      {/* Discrete device ID */}
      <div className="absolute bottom-1 right-2 z-30 text-[9px] font-mono text-white/30 tracking-wider select-none pointer-events-none">
        ID: {deviceInfo?.serial || deviceUuid || deviceCode || "—"}
      </div>

      <style>{`@keyframes mupaProgress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}

