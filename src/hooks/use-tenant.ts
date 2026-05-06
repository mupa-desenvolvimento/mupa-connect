import { useUserRole } from "./use-user-role";

export function useTenant() {
  const { tenantId, companyId, isSuperAdmin, isLoading } = useUserRole();
  return { tenantId, companyId, isSuperAdmin, isLoading };
}
