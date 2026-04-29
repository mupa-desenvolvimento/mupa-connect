import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useTenant as useTenantHook } from "@/hooks/use-tenant";

export function useTenant() {
  const { tenantId, isSuperAdmin, isLoading } = useTenantHook();
  return { data: tenantId, isSuperAdmin, isLoading };
}

export function useMedias(tenantId?: string) {
  return useQuery({
    queryKey: ["medias", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("media_items")
        .select("id, name, thumbnail_url, file_url, type, duration, tenant_id")
        .eq("status", "ready")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    // Removido enabled: !!tenantId para permitir que super admins vejam sem tenant_id
    // Mas mantemos para usuários comuns via RLS e UI
    staleTime: 1000 * 60 * 5,
  });
}

export function usePlaylists(tenantId?: string, isSuperAdmin?: boolean) {
  return useQuery({
    queryKey: ["playlists", tenantId, isSuperAdmin],
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
          companies (
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

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (!isSuperAdmin) {
        // Se não é super admin e não tem tenantId, não deve ver nada
        // (RLS também cuida disso, mas economizamos uma query)
        return [];
      }
      
      const { data, error } = await query;

      if (error) {
        console.error("Error fetching playlists:", error);
        throw error;
      }
      
      return data || [];
    },
    // Habilitado se tiver tenantId OU se for super admin
    enabled: !!tenantId || isSuperAdmin,
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
