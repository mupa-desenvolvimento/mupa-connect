import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTenant() {
  return useQuery({
    queryKey: ["current-tenant"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data: mapping, error } = await supabase
        .from("user_tenant_mappings")
        .select("tenant_id")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return mapping.tenant_id;
    },
  });
}

export function useMedias(tenantId?: string) {
  return useQuery({
    queryKey: ["medias", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function usePlaylists(tenantId?: string) {
  return useQuery({
    queryKey: ["playlists", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("playlists")
        .select(`
          *,
          playlist_items (
            *
          )
        `)
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
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
          playlist_items (
            *,
            media_items:media_id (*)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      // Sort items by position or order
      if (data.playlist_items) {
        data.playlist_items.sort((a: any, b: any) => (a.position ?? a.ordem ?? 0) - (b.position ?? b.ordem ?? 0));
      }
      
      return data;
    },
    enabled: !!id && id !== "new",
  });
}
