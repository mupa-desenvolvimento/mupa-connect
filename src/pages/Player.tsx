import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { devices, getMediaById, getPlaylistById, mediaItems } from "@/lib/mock-data";
import { useDeviceCommandChannel } from "@/hooks/useDeviceCommandChannel";
import { supabase } from "@/integrations/supabase/client";

/**
 * WebViewPlayer — /play/:deviceCode
 * - Loops playlist items
 * - Fallback: if device unknown OR no playlist OR media fails, plays a default rotation
 * - Receives realtime commands (reload, set_volume, play_campaign, …) and reports back
 * - Designed to NEVER stop
 */
export default function PlayerPage() {
  const { deviceCode } = useParams();
  const device = devices.find((d) => d.code.toLowerCase() === (deviceCode ?? "").toLowerCase());
  const playlist = device ? getPlaylistById(device.playlistId) : undefined;

  // Resolve the real device UUID from Supabase so realtime filter works
  const [deviceUuid, setDeviceUuid] = useState<string | undefined>();
  useEffect(() => {
    if (!deviceCode) return;
    supabase
      .from("devices")
      .select("id")
      .eq("device_code", deviceCode)
      .maybeSingle()
      .then(({ data }) => setDeviceUuid(data?.id));
  }, [deviceCode]);

  const [reloadKey, setReloadKey] = useState(0);
  const [volume, setVolume] = useState(60);

  useDeviceCommandChannel(deviceUuid, {
    reloadPlaylist: () => setReloadKey((k) => k + 1),
    playCampaign:   (id) => console.info("[player] play_campaign", id),
    setVolume:      (v) => setVolume(v),
    screenshot:     () => undefined,
    clearCache:     async () => { try { await caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))); } catch {} },
    reboot:         () => window.location.reload(),
  });

  const queue = useMemo(() => {
    const items = playlist?.items
      .map((i) => ({ media: getMediaById(i.mediaId), duration: i.duration }))
      .filter((x): x is { media: NonNullable<ReturnType<typeof getMediaById>>; duration: number } => !!x.media);
    if (items && items.length) return items;
    // Fallback rotation
    return mediaItems.map((m) => ({ media: m, duration: m.duration }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, reloadKey]);

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
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % queue.length);
    }, ms);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, queue]);

  const current = queue[index];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden text-white">
      {/* Media stage */}
      <div className="absolute inset-0">
        {current?.media.type === "image" ? (
          <img
            key={current.media.id + index}
            src={current.media.url}
            alt={current.media.name}
            className="w-full h-full object-cover animate-in fade-in duration-500"
            onError={() => setIndex((i) => (i + 1) % queue.length)}
          />
        ) : (
          <video
            key={(current?.media.id ?? "") + String(index)}
            src={current?.media.url}
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
            <div className="font-display font-semibold">{device?.name ?? "Player Mupa"}</div>
            <div className="text-[11px] uppercase tracking-widest opacity-70 font-mono">
              {device ? `${device.code} · ${device.store}` : `Modo demo · code=${deviceCode ?? "—"}`}
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
          <span className="text-sm truncate">{current?.media.name}</span>
        </div>
        <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
          <div
            key={index}
            className="h-full bg-primary"
            style={{ animation: `mupaProgress ${current?.duration ?? 8}s linear forwards` }}
          />
        </div>
      </div>

      <style>{`@keyframes mupaProgress { from { width: 0% } to { width: 100% } }`}</style>
    </div>
  );
}
