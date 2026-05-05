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
          nome,
          num_filial,
          store_id,
          tenant_id,
          grupo_dispositivos,
          last_heartbeat_at,
          last_proof_at,
          group_devices (
            group_id,
            groups (name)
          ),
          store_internal_group_devices (
            internal_group_id,
            store_internal_groups (name)
          )
        `);

      if (!isSuperAdmin) {
        if (!tenantId) return [];
        query = query.eq('tenant_id', tenantId);
      }

      const { data: devices, error } = await query;

      if (error) throw error;

      return devices.map((d: any) => ({
        ...d,
        group_id: d.group_devices?.[0]?.group_id,
        group_name: d.group_devices?.[0]?.groups?.name,
        internal_group_id: d.store_internal_group_devices?.[0]?.internal_group_id,
        internal_group_name: d.store_internal_group_devices?.[0]?.store_internal_groups?.name
      })) as Device[];
    },
    enabled: !!tenantId || !!isSuperAdmin,
  });
}
