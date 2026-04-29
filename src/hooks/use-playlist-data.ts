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
      // Prioridade absoluta para o tenant Stok Center se for o caso, 
      // mas mantemos a flexibilidade para o tenantId vindo do hook
      const effectiveTenantId = tenantId || 'f822bf9d-39e9-4726-82f7-c16bf267bc39';
      
      const { data, error } = await supabase
        .from("playlists")
        .select(`
          id, 
          name, 
          updated_at, 
          is_active, 
          tenant_id,
          playlist_items(id)
        `)
        .eq("tenant_id", effectiveTenantId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching tenant playlists:", error);
        throw error;
      }
      
      return data || [];
    },
    staleTime: 0, // Garantir que sempre busque dados novos
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
