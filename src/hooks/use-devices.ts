import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Device {
  id: number;
  device_uuid: string;
  nome: string;
  num_filial: string | null;
  store_id: string | null;
  grupo_dispositivos: string | null; // Legacy device group
  last_online?: string;
  status?: string;
  group_id?: string; // New hierarchy
  group_name?: string;
  internal_group_id?: string;
  internal_group_name?: string;
}

export function useDevices(tenantId: string | null) {
  return useQuery({
    queryKey: ["devices", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: devices, error } = await supabase
        .from("dispositivos")
        .select(`
          id,
          nome,
          num_filial,
          grupo_dispositivos,
          last_online,
          group_devices (
            group_id,
            groups (name)
          ),
          store_internal_group_devices (
            internal_group_id,
            store_internal_groups (name)
          )
        `);

      if (error) throw error;

      return devices.map((d: any) => ({
        ...d,
        group_id: d.group_devices?.[0]?.group_id,
        group_name: d.group_devices?.[0]?.groups?.name,
        internal_group_id: d.store_internal_group_devices?.[0]?.internal_group_id,
        internal_group_name: d.store_internal_group_devices?.[0]?.store_internal_groups?.name
      })) as Device[];
    },
    enabled: !!tenantId,
  });
}
