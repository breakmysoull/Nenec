import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Permission, hasPermission } from "@/lib/permissions";
import { usePermissions } from "@/contexts/PermissionsContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { user, authLoading } = useAuth();
  const { role, baseRole, adminView, permissionsLoading } = usePermissions();
  const location = useLocation();

  if (authLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isAdminBase = baseRole === "admin" || baseRole === "super_admin";
  
  // Apenas redireciona se adminView estiver explicitamente indefinido, o que não deveria acontecer.
  // A verificação anterior estava muito restritiva, impedindo acesso quando adminView era 'MANAGER'
  if (isAdminBase && !adminView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requiredPermission && !role && !isAdminBase) {
    // If no role at all, redirect trainee-like users to training, others to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  const checkRole = (isAdminBase ? baseRole : role) || role;

  if (requiredPermission && checkRole && !hasPermission(checkRole, requiredPermission)) {
    // Trainee users should go to /training (the only module they have access to)
    const fallback = checkRole === 'trainee' ? '/training' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
