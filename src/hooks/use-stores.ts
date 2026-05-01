import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Store {
  id: string;
  name: string;
  code: string;
  playlist_id: string | null;
  tenant_id: string;
  playlist_name?: string;
  group_id?: string;
  group_name?: string;
}

export function useStores(tenantId: string | null) {
  return useQuery({
    queryKey: ["stores", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data: stores, error } = await supabase
        .from("stores")
        .select(`
          *,
          playlists (name),
          group_stores (
            group_id,
            groups (name)
          )
        `)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      return stores.map((s: any) => ({
        ...s,
        playlist_name: s.playlists?.name,
        group_id: s.group_stores?.[0]?.group_id,
        group_name: s.group_stores?.[0]?.groups?.name
      })) as Store[];
    },
    enabled: !!tenantId,
  });
}
