import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTenant() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getTenant() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // 1. Check user_tenant_mappings (New system)
          const { data: mappingData } = await supabase
            .from("user_tenant_mappings")
            .select("tenant_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (mappingData) {
            setTenantId(mappingData.tenant_id);
            setIsLoading(false);
            return;
          }

          // 2. Check users table (Legacy/Modal system)
          const { data: userData } = await supabase
            .from("users")
            .select("company")
            .eq("id", session.user.id)
            .maybeSingle();

          if (userData?.company) {
            // If it's a UUID, use it directly
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(userData.company)) {
              setTenantId(userData.company);
            } else {
              // It's likely a Bubble-style _id, look up the UUID in empresas
              const { data: empresaData } = await supabase
                .from("empresas")
                .select("id")
                .eq("_id", userData.company)
                .maybeSingle();
              
              if (empresaData) {
                setTenantId(empresaData.id);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in useTenant:", error);
      } finally {
        setIsLoading(false);
      }
    }

    getTenant();
  }, []);

  return { tenantId, isLoading };
}
