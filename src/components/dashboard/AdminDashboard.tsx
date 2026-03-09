import { useNavigate } from "react-router-dom";
import { 
  Package, 
  AlertTriangle, 
  ShoppingCart, 
  ClipboardCheck, 
  GraduationCap, 
  Users, 
  Building2,
  Settings,
  ArrowRight,
  Shield,
  CheckCircle2
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ModuleCard } from "@/components/ui/module-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminDashboardProps {
  stats: {
    criticalStock: number;
    pendingOrders: number;
    delayedChecklists: number;
    pendingTrainings: number;
  };
  isAdmin: boolean;
}

export const AdminDashboard = ({ stats, isAdmin }: AdminDashboardProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
       {/* 1. Visão Geral e Alertas */}
       <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Visão Geral da Operação
            </h3>
            {/* Atalho para configurações globais se for admin */}
            {isAdmin && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary" onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Estoque Crítico"
              value={stats.criticalStock}
              icon={AlertTriangle}
              variant={stats.criticalStock > 0 ? "critical" : "success"}
              subtext="itens abaixo do mínimo"
              onClick={() => navigate('/stock')}
            />
            <StatCard
              label="Pedidos Pendentes"
              value={stats.pendingOrders}
              icon={ShoppingCart}
              variant={stats.pendingOrders > 3 ? "warning" : "default"}
              subtext="aguardando aprovação"
              onClick={() => navigate('/orders')}
            />
            <StatCard
              label="Checklists Hoje"
              value={stats.delayedChecklists}
              icon={ClipboardCheck}
              variant={stats.delayedChecklists > 0 ? "warning" : "success"}
              subtext={stats.delayedChecklists > 0 ? "atrasados/pendentes" : "todos em dia"}
              onClick={() => navigate('/checklists/review')}
            />
            <StatCard
              label="Treinamentos"
              value={stats.pendingTrainings}
              icon={GraduationCap}
              variant={stats.pendingTrainings > 2 ? "warning" : "default"}
              subtext="pendentes na equipe"
              onClick={() => navigate('/training/manage')}
            />
          </div>
        </section>

        {/* 2. Central de Controle (Quick Management) */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Central de Gestão
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gestão Operacional */}
            <Card className="border-l-4 border-l-primary/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  Operação
                </CardTitle>
                <CardDescription>Checklists e Rotinas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/checklists/review")}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Auditoria Diária
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/checklists/manage")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Editar Checklists
                </Button>
              </CardContent>
            </Card>

            {/* Gestão de Treinamentos */}
            <Card className="border-l-4 border-l-info/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-info" />
                  Treinamentos
                </CardTitle>
                <CardDescription>Capacitação da Equipe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/training/manage")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Gerenciar Conteúdo
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/users")}>
                  <Users className="w-4 h-4 mr-2" />
                  Progresso da Equipe
                </Button>
              </CardContent>
            </Card>

            {/* Gestão Administrativa */}
            <Card className="border-l-4 border-l-warning/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-warning" />
                  Administrativo
                </CardTitle>
                <CardDescription>Configurações Gerais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/users")}>
                  <Users className="w-4 h-4 mr-2" />
                  Usuários e Permissões
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/products")}>
                  <Package className="w-4 h-4 mr-2" />
                  Produtos e Estoque
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
    </div>
  );
};              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-between group" onClick={() => navigate("/checklists/manage")}>
                  Gerenciar Checklists
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
                <Button variant="outline" className="w-full justify-between group" onClick={() => navigate("/checklists/review")}>
                  Auditar Respostas
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
              </CardContent>
            </Card>

            {/* Gestão de Equipe e Treino */}
            <Card className="border-l-4 border-l-info/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-info" />
                  Equipe & Treino
                </CardTitle>
                <CardDescription>Capacitação e Acessos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-between group" onClick={() => navigate("/training/manage")}>
                  Gerenciar Treinamentos
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
                <Button variant="outline" className="w-full justify-between group" onClick={() => navigate("/users")}>
                  Gerenciar Usuários
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
              </CardContent>
            </Card>

            {/* Gestão de Estoque e Rede */}
            <Card className="border-l-4 border-l-warning/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-warning" />
                  Estoque & Rede
                </CardTitle>
                <CardDescription>Produtos e Configurações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-between group" onClick={() => navigate("/stock")}>
                  Gestão de Estoque
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
                {isAdmin && (
                  <Button variant="outline" className="w-full justify-between group" onClick={() => navigate("/units")}>
                    Unidades e Cardápios
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. Acesso Rápido aos Módulos (Visualização em Grade) */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Acesso Rápido aos Módulos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ModuleCard
              title="Estoque"
              description="Inventário"
              icon={Package}
              to="/stock"
              variant="compact"
            />
            <ModuleCard
              title="Pedidos"
              description="Compras"
              icon={ShoppingCart}
              to="/orders"
              variant="compact"
            />
            <ModuleCard
              title="Checklists"
              description="Execução"
              icon={ClipboardCheck}
              to="/checklists"
              variant="compact"
            />
             <ModuleCard
              title="Treinamentos"
              description="Minha trilha"
              icon={GraduationCap}
              to="/training"
              variant="compact"
            />
          </div>
        </section>
    </div>
  );
};
