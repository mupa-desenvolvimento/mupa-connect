import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useTenant as useTenantHook } from "@/hooks/use-tenant";

export function useTenant() {
  const { tenantId, isLoading } = useTenantHook();
  return { data: tenantId, isLoading };
}

export function useMedias(tenantId?: string) {
  return useQuery({
    queryKey: ["medias", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("media_items")
        .select("id, name, thumbnail_url, file_url, type, duration, tenant_id")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}

export function usePlaylists(tenantId?: string) {
  return useQuery({
    queryKey: ["playlists", tenantId],
    queryFn: async () => {
      console.log("Fetching playlists for tenant:", tenantId);
      
      let query = supabase
        .from("playlists")
        .select(`
          id, name, updated_at, is_active, tenant_id,
          playlist_items(id, media_id, duracao, tipo, ordem, position, prioridade)
        `);

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      } else {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query.order("updated_at", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("Error fetching playlists:", error);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} playlists:`, data);
      return data || [];
    },
    enabled: true,
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      if (id === "new") return null;
      const { data, error } = await supabase
        .from("playlists")
        .select(`
          *,
          playlist_items (*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      const items = data.playlist_items || [];
      const sortedItems = [...items].sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0));
      
      return { ...data, playlist_items: sortedItems };
    },
    enabled: !!id && id !== "new",
  });
}
