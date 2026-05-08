import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Device {
  id: number;
  device_uuid: string;
  nome: string;
  num_filial: string | null;
  store_id: string | null;
  grupo_dispositivos: string | null; // Legacy device group
  last_heartbeat_at?: string;
  last_proof_at?: string;
  status?: string;
  group_id?: string; // New hierarchy
  group_name?: string;
  internal_group_id?: string;
  internal_group_name?: string;
}

export function useDevices(tenantId: string | null, isSuperAdmin?: boolean) {
  return useQuery({
    queryKey: ["devices", tenantId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from("dispositivos")
        .select(`
          id,
          device_uuid,
          apelido_interno,
          num_filial,
          store_id,
          tenant_id,
          grupo_dispositivos,
          last_heartbeat_at,
          last_proof_at
        `);

      if (!isSuperAdmin) {
        if (!tenantId) return [];
        query = query.eq('tenant_id', tenantId);
      }

      const { data: devices, error } = await query;

      if (error) throw error;

      const deviceIds = (devices || [])
        .map((d: any) => d.device_uuid)
        .filter(Boolean);

      let internalGroupMap = new Map<string, string>();
      if (deviceIds.length > 0) {
        const { data: internalLinks, error: internalLinksError } = await supabase
          .from("store_internal_group_devices")
          .select("device_id, internal_group_id")
          .in("device_id", deviceIds as any);

        if (internalLinksError) throw internalLinksError;

        internalGroupMap = new Map(
          (internalLinks || [])
            .filter((l: any) => !!l?.device_id && !!l?.internal_group_id)
            .map((l: any) => [l.device_id, l.internal_group_id])
        );
      }

      return (devices || []).map((d: any) => ({
        ...d,
        nome: d.apelido_interno ?? "Dispositivo",
        group_id: d.grupo_dispositivos ?? null,
        internal_group_id: d.device_uuid ? internalGroupMap.get(d.device_uuid) : undefined
      })) as Device[];
    },
    enabled: !!tenantId || !!isSuperAdmin,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    staleTime: 15000,
  });
}
