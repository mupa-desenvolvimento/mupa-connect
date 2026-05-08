import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Group {
  id: string;
  name: string;
  parent_id: string | null;
  playlist_id: string | null;
   tenant_id: string;
   device_count?: number;
  store_count?: number;
  playlist_name?: string;
  linked_store_ids?: string[];
  direct_device_ids?: string[];
}

export function useGroups(tenantId: string | null, isSuperAdmin?: boolean) {
  return useQuery({
    queryKey: ["groups", tenantId, isSuperAdmin],
    queryFn: async () => {
      let groupsQuery = supabase
        .from("groups")
        .select(`
          *,
          playlists (name)
        `);
      
      let devicesQuery = supabase
        .from("dispositivos")
        .select("device_uuid, grupo_dispositivos, tenant_id");

      let storeLinksQuery = supabase
        .from("group_stores")
        .select("group_id, store_id");

      if (!isSuperAdmin) {
        if (!tenantId) return [];
        groupsQuery = groupsQuery.eq("tenant_id", tenantId);
        devicesQuery = devicesQuery.eq("tenant_id", tenantId);
        storeLinksQuery = storeLinksQuery.eq("tenant_id", tenantId);
      }

      // Fetch groups
      const { data: groups, error: groupsError } = await groupsQuery;
      if (groupsError) throw groupsError;

      // Fetch devices and derive "direct devices" by matching dispositivos.grupo_dispositivos to groups.id
      const { data: devices, error: devicesError } = await devicesQuery;
      if (devicesError) throw devicesError;

      // Fetch store links per group
      const { data: storeLinks, error: storesError } = await storeLinksQuery;
      if (storesError) throw storesError;

      const deviceMap = (devices || []).reduce((acc: Record<string, string[]>, curr: any) => {
        const groupId = curr.grupo_dispositivos;
        const deviceUuid = curr.device_uuid;
        if (!groupId || !deviceUuid) return acc;
        if (!acc[groupId]) acc[groupId] = [];
        acc[groupId].push(deviceUuid);
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
        device_count: (deviceMap[g.id]?.length || 0),
        store_count: storeMap[g.id]?.length || 0,
        linked_store_ids: storeMap[g.id] || [],
        direct_device_ids: deviceMap[g.id] || []
      })) as Group[];
    },
    enabled: !!tenantId || !!isSuperAdmin,
  });
}
