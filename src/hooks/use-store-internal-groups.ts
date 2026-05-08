import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InternalGroup {
  id: string;
  store_id: string;
  name: string;
  playlist_id: string | null;
  playlist_name?: string;
  device_count?: number;
}

export function useStoreInternalGroups(storeId?: string) {
  return useQuery({
    queryKey: ["store-internal-groups", storeId],
    queryFn: async () => {
      if (!storeId) return [];

      const { data, error } = await supabase
        .from("store_internal_groups")
        .select(`
          *,
          playlists (name)
        `)
        .eq("store_id", storeId);

      if (error) throw error;

      // Fetch device counts
      const { data: deviceCounts, error: devicesError } = await supabase
        .from("store_internal_group_devices")
        .select("internal_group_id")
        .in("internal_group_id", data.map(g => g.id));

      const deviceMap = (deviceCounts || []).reduce((acc: any, curr: any) => {
        acc[curr.internal_group_id] = (acc[curr.internal_group_id] || 0) + 1;
        return acc;
      }, {});

      return data.map((g: any) => ({
        ...g,
        playlist_name: g.playlists?.name,
        device_count: deviceMap[g.id] || 0
      })) as InternalGroup[];
    },
    enabled: !!storeId,
  });
}
