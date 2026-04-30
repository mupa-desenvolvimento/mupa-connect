import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";

export function useTenant() {
  const { tenantId, companyId, isSuperAdmin, isLoading } = useUserRole();
  // Return companyId if present, otherwise tenantId (reseller level)
  return { data: companyId || tenantId, isSuperAdmin, isLoading };
}

export function useMedias(contextId?: string) {
  return useQuery({
    queryKey: ["medias", contextId],
    queryFn: async () => {
      let query = supabase
        .from("media_items")
        .select("id, name, thumbnail_url, file_url, type, duration, tenant_id")
        .in("status", ["ready", "active"])
        .order("created_at", { ascending: false });

      if (contextId) {
        // Try to filter by company or tenant
        query = query.or(`company_id.eq.${contextId},tenant_id.eq.${contextId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlaylists(contextId?: string, isSuperAdmin?: boolean) {
  return useQuery({
    queryKey: ["playlists", contextId, isSuperAdmin],
    queryFn: async () => {
      let query = supabase
        .from("playlists")
        .select(`
          id, 
          name, 
          updated_at, 
          is_active, 
          tenant_id,
          company_id,
          companies:companies!playlists_company_id_fkey (
            name
          ),
          playlist_items (
            id,
            media_id,
            duracao,
            tipo,
            ordem,
            media_items (
              id,
              name,
              file_url,
              thumbnail_url,
              type
            )
          )
        `);

      if (contextId) {
        query = query.or(`company_id.eq.${contextId},tenant_id.eq.${contextId}`);
      } else if (!isSuperAdmin) {
        return [];
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!contextId || isSuperAdmin,
    staleTime: 1000 * 60 * 2,
    refetchOnMount: true,
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
