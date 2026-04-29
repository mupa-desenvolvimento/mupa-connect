import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";

export default function PlayerPage() {
  const { deviceCode } = useParams();
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [playlist, setPlaylist] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [volume, setVolume] = useState(60);

  // 1. Resolve Device and Hierarchy-based Playlist
  useEffect(() => {
    if (!deviceCode) return;

    async function resolvePlaylist() {
      setIsLoading(true);
      try {
        // Find device in public.dispositivos
        const { data: device, error: devError } = await supabase
          .from("dispositivos")
          .select("id, num_filial, grupo_dispositivos, empresa, apelido_interno")
          .eq("apelido_interno", deviceCode)
          .maybeSingle();

        let targetDevice = device;

        if (devError || !device) {
          // Try serial if apelido fails
          const { data: deviceBySerial } = await supabase
            .from("dispositivos")
            .select("id, num_filial, grupo_dispositivos, empresa, apelido_interno")
            .eq("serial", deviceCode)
            .maybeSingle();
            
          if (!deviceBySerial) {
            console.error("Device not found:", deviceCode);
            setIsLoading(false);
            return;
          }
          targetDevice = deviceBySerial;
        }

        setDeviceUuid(targetDevice.id);
        setDeviceInfo(targetDevice);
        await loadHierarchyPlaylist(targetDevice);
      } catch (err) {
        console.error("Resolution error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    async function loadHierarchyPlaylist(device: any) {
      const tenantId = 'f822bf9d-39e9-4726-82f7-c16bf267bc39';
      
      const { data: hierarchy } = await supabase.rpc('get_groups_hierarchy', { 
        p_tenant_id: tenantId 
      });

      if (hierarchy) {
        const nodes = hierarchy as any[];
        const deviceNode = nodes.find(n => n.id === device.id && n.type === 'device');
        
        if (deviceNode?.resolved_playlist_id) {
          const { data: playlistData } = await supabase
            .from("playlists")
            .select(`
              *,
              playlist_items (
                *,
                media_items (*)
              )
            `)
            .eq("id", deviceNode.resolved_playlist_id)
            .single();
            
          setPlaylist(playlistData);
        }
      }
    }

    resolvePlaylist();
  }, [deviceCode, reloadKey]);

  useDeviceCommandChannel(deviceUuid, {
    reloadPlaylist: () => setReloadKey((k: number) => k + 1),
    playCampaign:   (id) => console.info("[player] play_campaign", id),
    setVolume:      (v) => setVolume(v),
    screenshot:     () => undefined,
    clearCache:     async () => { try { await caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))); } catch {} },
    reboot:         () => window.location.reload(),
  });

  const queue = useMemo(() => {
    if (playlist?.playlist_items?.length) {
      return playlist.playlist_items
        .sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
        .map((i: any) => ({ 
          media: {
            id: i.media_id,
            name: i.media_items?.name || "Sem nome",
            url: i.media_items?.file_url,
            type: i.media_items?.type || "image"
          }, 
          duration: i.duracao || 10 
        }))
        .filter((x: any) => x.media.url);
    }
    return [];
  }, [playlist]);

  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const current = queue[index];
    const ms = (current?.duration ?? 8) * 1000;
    
    if (queue.length > 0) {
      timerRef.current = window.setTimeout(() => {
        setIndex((i) => (i + 1) % queue.length);
      }, ms);
    }

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, queue]);

  const current = queue[index];

  if (isLoading) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-widest">Iniciando Player Mupa...</div>;
  }

  if (!current) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-white/40 font-mono text-xs uppercase tracking-widest">Nenhum conteúdo para exibir</div>;
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden text-white">
      {/* Media stage */}
      <div className="absolute inset-0">
        {current.media.type === "image" ? (
          <img
            key={current.media.id + index}
            src={current.media.url}
            alt={current.media.name}
            className="w-full h-full object-cover animate-in fade-in duration-500"
            onError={() => setIndex((i) => (i + 1) % queue.length)}
          />
        ) : (
          <video
            key={(current.media.id ?? "") + String(index)}
            src={current.media.url}
            autoPlay
            muted={volume === 0}
            ref={(el) => { if (el) el.volume = Math.max(0, Math.min(1, volume / 100)); }}
            playsInline
            className="w-full h-full object-cover"
            onEnded={() => setIndex((i) => (i + 1) % queue.length)}
            onError={() => setIndex((i) => (i + 1) % queue.length)}
          />
        )}
      </div>

      {/* HUD overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent">
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
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-mono opacity-80">{String(index + 1).padStart(2, "0")} / {String(queue.length).padStart(2, "0")}</span>
          <span className="text-sm truncate">{current.media.name}</span>
        </div>
        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
          <div
            key={index}
            className="h-full bg-primary"
            style={{ animation: `mupaProgress ${current.duration ?? 8}s linear forwards` }}
          />
        </div>
      </div>

      <style>{`@keyframes mupaProgress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
