import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/use-user-role";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  requireAdmin?: boolean;
  requireMarketing?: boolean;
  requireTecnico?: boolean;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requireAdmin, 
  requireMarketing, 
  requireTecnico 
}: ProtectedRouteProps) {
  const { role, isAdmin, isMarketing, isTecnico, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireMarketing && !isMarketing) {
    return <Navigate to="/" replace />;
  }

  if (requireTecnico && !isTecnico) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
