import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Group {
  id: string;
  name: string;
  parent_id: string | null;
  playlist_id: string | null;
  tenant_id: string;
  company_id: string | null;
  device_count?: number;
  store_count?: number;
  playlist_name?: string;
  linked_store_ids?: string[];
  direct_device_ids?: string[];
}

export function useGroups(tenantId: string | null) {
  return useQuery({
    queryKey: ["groups", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      // Fetch groups
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select(`
          *,
          playlists (name)
        `)
        .or(`company_id.eq.${tenantId},tenant_id.eq.${tenantId}`);

      if (groupsError) throw groupsError;

      // Fetch device counts per group
      const { data: deviceCounts, error: devicesError } = await supabase
        .from("group_devices")
        .select("group_id");

      if (devicesError) throw devicesError;

      // Fetch store counts per group
      const { data: storeCounts, error: storesError } = await supabase
        .from("group_stores")
        .select("group_id");

      if (storesError) throw storesError;

      const deviceMap = deviceCounts.reduce((acc: any, curr: any) => {
        acc[curr.group_id] = (acc[curr.group_id] || 0) + 1;
        return acc;
      }, {});

      const storeMap = storeCounts.reduce((acc: any, curr: any) => {
        acc[curr.group_id] = (acc[curr.group_id] || 0) + 1;
        return acc;
      }, {});

      return groups.map((g: any) => ({
        ...g,
        playlist_name: g.playlists?.name,
        device_count: deviceMap[g.id] || 0,
        store_count: storeMap[g.id] || 0
      })) as Group[];
    },
    enabled: !!tenantId,
  });
}
