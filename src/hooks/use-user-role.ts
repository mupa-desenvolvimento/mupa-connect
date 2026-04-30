import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "tecnico" | "marketing" | "admin_global" | string;

export function useUserRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("role, company_id, tenant_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          setRole(profile.role);
          setCompanyId(profile.company_id);
          setTenantId(profile.tenant_id);
        } else {
          // Fallback to user_roles for legacy or if profile not created yet
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (roleData) {
            setRole(roleData.role);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setIsLoading(false);
      }
    }

    getUserRole();
  }, []);

  const isAdmin = role === "admin" || role === "admin_global";
  const isSuperAdmin = role === "admin_global";
  const isTecnico = role === "tecnico" || isAdmin;
  const isMarketing = role === "marketing" || isAdmin;

  return { 
    role, 
    companyId, 
    tenantId, 
    isAdmin, 
    isSuperAdmin, 
    isTecnico, 
    isMarketing, 
    isLoading 
  };
}
