import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Permission, hasPermission } from "@/lib/permissions";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute: State check", { user: user?.id, role, loading, path: location.pathname });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: No user, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && role && !hasPermission(role, requiredPermission)) {
    console.warn(`ProtectedRoute: Access denied. Role ${role} missing permission ${requiredPermission}`);
    // toast.error("Acesso não autorizado para seu perfil."); // Optional: avoid toast loop
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
