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
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Usuário';

  // Mock data - será substituído por dados reais
  const stats = {
    criticalStock: 3,
    pendingOrders: 5,
    delayedChecklists: 2,
    pendingTrainings: 4,
  };

  return (
    <AppLayout title="OpFood">
      <div className="p-4 space-y-6 animate-fade-in">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold">Olá, {firstName}!</h2>
          <p className="text-muted-foreground">
            <Clock className="w-4 h-4 inline mr-1" />
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </p>
        </div>

        {/* Alert Stats */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Alertas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Estoque Crítico"
              value={stats.criticalStock}
              icon={AlertTriangle}
              variant={stats.criticalStock > 0 ? "critical" : "success"}
              subtext="itens abaixo do mínimo"
            />
            <StatCard
              label="Pedidos Pendentes"
              value={stats.pendingOrders}
              icon={ShoppingCart}
              variant={stats.pendingOrders > 3 ? "warning" : "default"}
              subtext="aguardando aprovação"
            />
            <StatCard
              label="Checklists Atrasados"
              value={stats.delayedChecklists}
              icon={ClipboardCheck}
              variant={stats.delayedChecklists > 0 ? "warning" : "success"}
              subtext="não executados"
            />
            <StatCard
              label="Treinos Pendentes"
              value={stats.pendingTrainings}
              icon={GraduationCap}
              variant={stats.pendingTrainings > 2 ? "warning" : "default"}
              subtext="para sua equipe"
            />
          </div>
        </section>

        {/* Quick Modules */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Módulos
          </h3>
          <div className="space-y-3">
            <ModuleCard
              title="Estoque"
              description="Controle movimentações e veja níveis de ingredientes"
              icon={Package}
              to="/stock"
              badge={stats.criticalStock > 0 ? stats.criticalStock : undefined}
            />
            <ModuleCard
              title="Pedidos"
              description="Gerencie pedidos de fornecimento e aprovações"
              icon={ShoppingCart}
              to="/orders"
              badge={stats.pendingOrders}
            />
            <ModuleCard
              title="Checklists"
              description="Execute checklists de abertura, praça e fechamento"
              icon={ClipboardCheck}
              to="/checklists"
            />
            <ModuleCard
              title="Treinamentos"
              description="Trilhas de capacitação por cargo e produto"
              icon={GraduationCap}
              to="/training"
            />
            <ModuleCard
              title="Produtos"
              description="Fichas técnicas e receitas padronizadas"
              icon={Utensils}
              to="/products"
            />
            <ModuleCard
              title="Unidades"
              description="Gerencie lojas e turnos da rede"
              icon={Building2}
              to="/units"
            />
            <ModuleCard
              title="Equipe"
              description="Usuários, cargos e permissões"
              icon={Users}
              to="/users"
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
