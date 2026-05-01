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

      // Fetch device links per group
      const { data: deviceLinks, error: devicesError } = await supabase
        .from("group_devices")
        .select("group_id, device_id");

      if (devicesError) throw devicesError;

      // Fetch store links per group
      const { data: storeLinks, error: storesError } = await supabase
        .from("group_stores")
        .select("group_id, store_id");

      if (storesError) throw storesError;

      const deviceMap = deviceLinks.reduce((acc: any, curr: any) => {
        if (!acc[curr.group_id]) acc[curr.group_id] = [];
        acc[curr.group_id].push(curr.device_id);
        return acc;
      }, {});

      const storeMap = storeLinks.reduce((acc: any, curr: any) => {
        if (!acc[curr.group_id]) acc[curr.group_id] = [];
        acc[curr.group_id].push(curr.store_id);
        return acc;
      }, {});

      return groups.map((g: any) => ({
        ...g,
        playlist_name: g.playlists?.name,
        device_count: (deviceMap[g.id]?.length || 0), // This is just direct devices for now, will be updated in UI
        store_count: storeMap[g.id]?.length || 0,
        linked_store_ids: storeMap[g.id] || [],
        direct_device_ids: deviceMap[g.id] || []
      })) as Group[];
    },
    enabled: !!tenantId,
  });
}
