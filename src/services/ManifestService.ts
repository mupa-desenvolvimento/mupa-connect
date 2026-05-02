import { supabase } from "@/integrations/supabase/client";
import { ManifestManager } from "@/components/PlayerServices";

export const ManifestService = {
  async fetchManifest(deviceCode: string) {
    console.log("[ManifestService] Fetching manifest via device endpoint for:", deviceCode);
    let data: any = null;
    const { data: endpointData, error } = await supabase.functions.invoke("device-api/manifest", {
      body: { serial: deviceCode }
    });

    if (endpointData?.manifest) {
      data = endpointData;
    } else {
      console.warn("[ManifestService] Endpoint unavailable, using direct fallback", error || endpointData?.error);
      data = await this.fetchManifestFallback(deviceCode);
    }

    const newManifest = data.manifest;
    const device = data.device;

    ManifestManager.saveManifest(deviceCode, newManifest);
    if (device?.serial) ManifestManager.saveManifest(device.serial, newManifest);

    return { manifest: newManifest, device };
  },

  async fetchManifestFallback(deviceCode: string) {
    const { data: device, error: deviceError } = await supabase
      .from("dispositivos")
      .select("*")
      .or(`apelido_interno.eq."${deviceCode}",serial.eq."${deviceCode}"`)
      .maybeSingle();

    if (deviceError || !device?.playlist_id) {
      throw new Error("Device or playlist not found");
    }

    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id, name, updated_at, schedule")
      .eq("id", device.playlist_id)
      .maybeSingle();

    const { data: playlistItems, error: itemsError } = await supabase
      .from("playlist_items")
      .select("id, media_id, position, ordem, duracao, tipo, media_items(id, name, file_url, thumbnail_url, type, duration)")
      .eq("playlist_id", device.playlist_id);

    if (playlistError || itemsError || !playlist) {
      throw new Error("Manifest data not found");
    }

    const mapItems = (items: any[]) => (items || [])
      .sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0))
      .map((item: any) => {
        const media = Array.isArray(item.media_items) ? item.media_items[0] : item.media_items;
        return {
          id: item.media_id || item.id,
          type: item.tipo || media?.type || "image",
          url: media?.file_url,
          duration: item.duracao || media?.duration || 10,
          name: media?.name || "Sem nome"
        };
      })
      .filter((item: any) => item.url);

    return {
      device,
      manifest: {
        playlist_id: playlist.id,
        name: playlist.name,
        updated_at: playlist.updated_at || device.atualizado || new Date().toISOString(),
        schedule: playlist.schedule || null,
        schedules: Array.isArray(playlist.schedule) ? playlist.schedule : [],
        fallback_playlist: [],
        fallback_items: [],
        items: mapItems(playlistItems || [])
      }
    };
  }
};
