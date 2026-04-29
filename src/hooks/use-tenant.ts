import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useTenant() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getTenant() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from("user_tenant_mappings")
          .select("tenant_id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (data) {
          setTenantId(data.tenant_id);
        }
      }
      setIsLoading(false);
    }

    getTenant();
  }, []);

  return { tenantId, isLoading };
}
