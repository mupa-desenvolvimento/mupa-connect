import { supabase } from "@/integrations/supabase/client";
import { ManifestManager } from "@/components/PlayerServices";

export const ManifestService = {
  async fetchManifest(deviceCode: string) {
    console.log("[ManifestService] Fetching manifest for:", deviceCode);
    
    // 1. Resolve Device
    const { data: device, error: deviceError } = await supabase
      .from("dispositivos")
      .select("*")
      .or(`apelido_interno.eq."${deviceCode}",serial.eq."${deviceCode}"`)
      .maybeSingle();

    if (deviceError || !device) {
      throw new Error("Device not found");
    }

    // 2. Fetch Full Data
    const { data: deviceManifest, error: manifestError } = await supabase
      .from("dispositivos")
      .select(`
        *,
        playlists (
          id,
          name,
          updated_at,
          playlist_items (
            id, position, duracao,
            media_items (*)
          )
        )
      `)
      .eq("id", device.id)
      .single();

    if (manifestError || !deviceManifest || !deviceManifest.playlists) {
      throw new Error("Manifest data not found");
    }

    const mainPlaylist = deviceManifest.playlists as any;
    const remoteUpdatedAt = mainPlaylist.updated_at || (deviceManifest as any).atualizado || new Date().toISOString();

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
      schedules: (deviceManifest as any).schedules || [], 
      fallback_items: mapItems((deviceManifest as any).fallback_playlist_items)
    };

    // 3. Save to cache
    ManifestManager.saveManifest(deviceCode, newManifest);
    if (device.serial) ManifestManager.saveManifest(device.serial, newManifest);

    return newManifest;
  }
};
