import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useStockAlerts } from "@/hooks/useStockAlerts";
import { useTrainings } from "@/contexts/TrainingsContext";
import { useMemo } from "react";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";
import { hasPermission } from "@/lib/permissions";

const Dashboard = () => {
  const { user } = useAuth();
  const { role, baseRole, adminView } = usePermissions();
  const { count: criticalStockCount } = useStockAlerts();
  const { trainings } = useTrainings();
  
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';
  
  // Use permissions to determine view
  // If adminView is active (non-null), we show Admin Dashboard
  // Otherwise we check if they are a manager/admin by role to possibly default them (though adminView usually handles the toggle)
  const isManager = hasPermission(role || 'operator', 'manage_orders'); 
  const isAdmin = hasPermission(role || 'operator', 'manage_settings');
  const isAdminBase = baseRole === "admin" || baseRole === "super_admin";

  // Calculate pending trainings for the user (or generally)
  // For now using a simple calculation or mock
  const pendingTrainingsCount = useMemo(() => {
    // This logic can be improved to check actual user progress
    return trainings.length; 
  }, [trainings]);

  // Mock data - to be replaced by real data hooks eventually
  const stats = {
    criticalStock: criticalStockCount,
    pendingOrders: 5, // TODO: Fetch real orders count
    delayedChecklists: 2, // TODO: Fetch real checklist status
    pendingTrainings: pendingTrainingsCount,
  };

  // Determine which dashboard to show
  // If user has adminView enabled (toggled via header), show Admin Dashboard
  // If user is just an operator, show Operational Dashboard
  // If user is admin but hasn't toggled (adminView is null), show Operational Dashboard (standard behavior)
  const showAdminDashboard = !!adminView;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            {showAdminDashboard 
              ? "Painel de Controle Administrativo" 
              : "Bem-vindo ao seu painel de operações diárias."}
          </p>
        </div>

        {showAdminDashboard ? (
          <AdminDashboard stats={stats} isAdmin={isAdmin} />
        ) : (
          <OperationalDashboard stats={stats} />
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
