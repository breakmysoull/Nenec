import { useNavigate } from "react-router-dom";
import { ClipboardCheck, GraduationCap, Package, Clock } from "lucide-react";
import { ModuleCard } from "@/components/ui/module-card";

interface OperationalDashboardProps {
  stats: {
    pendingTrainings: number;
  };
}

export const OperationalDashboard = ({ stats }: OperationalDashboardProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Status do Dia (Para Operador/Cozinha) */}
      <section className="bg-card rounded-xl p-4 border shadow-sm">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          Minhas Tarefas Hoje
        </h3>
        
        <div className="space-y-3">
           {/* Checklist Card - Action Oriented */}
           <div 
             className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-warning cursor-pointer hover:bg-muted transition-colors" 
             onClick={() => navigate("/checklists")}
           >
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
             <div 
               className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border-l-4 border-info cursor-pointer hover:bg-muted transition-colors" 
               onClick={() => navigate("/training")}
             >
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
};
