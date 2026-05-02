import { supabase } from "@/integrations/supabase/client";
import { ManifestManager } from "@/components/PlayerServices";

export const ManifestService = {
  async fetchManifest(deviceCode: string) {
    console.log("[ManifestService] Fetching manifest via device endpoint for:", deviceCode);
    const { data, error } = await supabase.functions.invoke("device-api/manifest", {
      body: { serial: deviceCode }
    });

    if (error || !data?.manifest) {
      throw new Error(error?.message || data?.error || "Manifest data not found");
    }

    const newManifest = data.manifest;
    const device = data.device;

    ManifestManager.saveManifest(deviceCode, newManifest);
    if (device?.serial) ManifestManager.saveManifest(device.serial, newManifest);

    return { manifest: newManifest, device };
  }
};
