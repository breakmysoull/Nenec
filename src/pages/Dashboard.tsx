import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { ModuleCard } from "@/components/ui/module-card";
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  ClipboardCheck,
  GraduationCap,
  Utensils,
  Building2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/types/database";
import { hasPermission } from "@/lib/permissions";
import { useStockAlerts } from "@/hooks/useStockAlerts";

const Dashboard = () => {
  const { user, role, isSuperAdmin } = useAuth();
  const { count: criticalStockCount } = useStockAlerts();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';
  
  // Use permissions to determine view
  const isManager = hasPermission(role || 'operator', 'manage_orders'); // Proxy for manager view
  const isAdmin = hasPermission(role || 'operator', 'manage_settings'); // Proxy for admin view

  // Mock data - será substituído por dados reais
  const stats = {
    criticalStock: criticalStockCount,
    pendingOrders: 5,
    delayedChecklists: 2,
    pendingTrainings: 4,
  };

  const OperationalView = () => (
    <div className="space-y-6">
      {/* Status do Dia (Para Operador/Cozinha) */}
      <section className="bg-card rounded-xl p-4 border shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Minhas Tarefas Hoje
        </h3>
        
        <div className="space-y-3">
           {/* Checklist Card - Action Oriented */}
           <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-warning cursor-pointer hover:bg-muted transition-colors" onClick={() => window.location.href='/checklists'}>
             <div className="flex items-center gap-3">
               <div className="p-2 bg-background rounded-full">
                 <Clock className="w-4 h-4 text-warning" />
               </div>
               <div>
                 <p className="font-semibold text-sm">Checklist de Abertura</p>
                 <p className="text-xs text-muted-foreground">Pendente • Prazo: 10:00</p>
               </div>
             </div>
             <div className="px-3 py-1 bg-warning/10 text-warning text-xs font-bold rounded-full">
               FAZER
             </div>
           </div>

           {/* Training Card */}
           {stats.pendingTrainings > 0 && (
             <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-info cursor-pointer hover:bg-muted transition-colors" onClick={() => window.location.href='/training'}>
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-background rounded-full">
                   <GraduationCap className="w-4 h-4 text-info" />
                 </div>
                 <div>
                   <p className="font-semibold text-sm">Novos Treinamentos</p>
                   <p className="text-xs text-muted-foreground">{stats.pendingTrainings} módulos pendentes</p>
                 </div>
               </div>
             </div>
           )}
        </div>
      </section>

      {/* Acesso Rápido Operacional */}
      <section className="grid grid-cols-2 gap-3">
        <ModuleCard
          title="Estoque"
          description="Consultar itens"
          icon={Package}
          to="/stock"
          variant="compact"
        />
         <ModuleCard
          title="Treinamentos"
          description="Minha trilha"
          icon={GraduationCap}
          to="/training"
          variant="compact"
        />
      </section>
    </div>
  );

  const ManagerView = () => (
    <div className="space-y-6">
       {/* Alert Stats */}
       <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Visão Geral da Loja
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Estoque Crítico"
              value={stats.criticalStock}
              icon={AlertTriangle}
              variant={stats.criticalStock > 0 ? "critical" : "success"}
              subtext="itens abaixo do mínimo"
              onClick={() => window.location.href='/stock'}
            />
            <StatCard
              label="Pedidos Pendentes"
              value={stats.pendingOrders}
              icon={ShoppingCart}
              variant={stats.pendingOrders > 3 ? "warning" : "default"}
              subtext="aguardando aprovação"
              onClick={() => window.location.href='/orders'}
            />
            <StatCard
              label="Checklists"
              value={stats.delayedChecklists}
              icon={ClipboardCheck}
              variant={stats.delayedChecklists > 0 ? "warning" : "success"}
              subtext={stats.delayedChecklists > 0 ? "atrasados hoje" : "em dia"}
              onClick={() => window.location.href='/checklists'}
            />
            <StatCard
              label="Treinamentos"
              value={stats.pendingTrainings}
              icon={GraduationCap}
              variant={stats.pendingTrainings > 2 ? "warning" : "default"}
              subtext="pendentes na equipe"
              onClick={() => window.location.href='/training'}
            />
          </div>
        </section>

        {/* Manager Modules */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Gestão
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModuleCard
              title="Estoque & Perdas"
              description="Controle de inventário e registro de quebras"
              icon={Package}
              to="/stock"
              badge={stats.criticalStock}
            />
            <ModuleCard
              title="Auditoria de Checklists"
              description="Revisar e aprovar checklists executados"
              icon={ClipboardCheck}
              to="/checklists/review"
              badge={stats.delayedChecklists}
            />
            <ModuleCard
              title="Pedidos de Compra"
              description="Aprovação e recebimento de mercadoria"
              icon={ShoppingCart}
              to="/orders"
              badge={stats.pendingOrders}
            />
             <ModuleCard
              title="Equipe & Acessos"
              description="Gerenciar usuários e permissões"
              icon={Users}
              to="/users"
            />
             {isAdmin && (
              <ModuleCard
                title="Configuração de Rede"
                description="Unidades, Produtos e Cardápios"
                icon={Building2}
                to="/units"
              />
            )}
          </div>
        </section>
    </div>
  );

  return (
    <AppLayout title="Projeto1">
      <div className="p-4 space-y-6 animate-fade-in pb-24">
        {/* Greeting Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Olá, {firstName}!</h2>
            <p className="text-muted-foreground text-sm flex items-center mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </p>
          </div>
          {/* Status Badge da Loja (Mock) */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
            stats.criticalStock > 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-success/10 text-success border-success/20'
          }`}>
             {stats.criticalStock > 0 ? 'ATENÇÃO' : 'LOJA OK'}
          </div>
        </div>

        {isManager ? <ManagerView /> : <OperationalView />}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
