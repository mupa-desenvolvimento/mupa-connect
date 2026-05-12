import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export type AppRole = "admin" | "tecnico" | "marketing" | "admin_global" | string;

export function useUserRole() {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(localStorage.getItem("mupa_support_company_id"));
  const [tenantId, setTenantId] = useState<string | null>(localStorage.getItem("mupa_support_tenant_id"));
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const email = session.user.email || null;
        setUserEmail(email);
        const isSupportEmail = email === "support@mupa.app";

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, company_id, tenant_id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          setRole(profile.role);
          const isSuperAdminRole = profile.role === "admin_global";
          if (!isSupportEmail && !isSuperAdminRole) {
            localStorage.removeItem("mupa_support_company_id");
            localStorage.removeItem("mupa_support_tenant_id");
            setCompanyId(profile.company_id);
            setTenantId(profile.tenant_id);
          } else {
            if (!localStorage.getItem("mupa_support_company_id")) {
              setCompanyId(profile.company_id);
              setTenantId(profile.tenant_id);
            }
          }
        } else {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();
          
          if (roleData) {
            setRole(roleData.role);
          }

          if (!isSupportEmail && roleData?.role !== "admin_global") {
            localStorage.removeItem("mupa_support_company_id");
            localStorage.removeItem("mupa_support_tenant_id");
            setCompanyId(null);
            setTenantId(null);
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
  const isSupport = userEmail === "support@mupa.app" || isSuperAdmin;

  const setSupportContext = (cId: string | null, tId: string | null) => {
    if (!isSupport) return;
    
    if (cId) {
      localStorage.setItem("mupa_support_company_id", cId);
      setCompanyId(cId);
    } else {
      localStorage.removeItem("mupa_support_company_id");
      setCompanyId(null);
    }

    if (tId) {
      localStorage.setItem("mupa_support_tenant_id", tId);
      setTenantId(tId);
    } else {
      localStorage.removeItem("mupa_support_tenant_id");
      setTenantId(null);
    }
    
    // Invalidate all queries to refresh data with the new tenant/company
    queryClient.invalidateQueries();
  };

  return { 
    role, 
    companyId, 
    tenantId, 
    isAdmin, 
    isSuperAdmin, 
    isSupport,
    isTecnico, 
    isMarketing, 
    isLoading,
    setSupportContext
  };
}
