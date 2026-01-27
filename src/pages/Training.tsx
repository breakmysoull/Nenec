import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  GraduationCap, 
  Play,
  Clock,
  Award,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingStatus } from "@/types/database";
import { Progress } from "@/components/ui/progress";

// Mock data
const mockTrainings = [
  { 
    id: 1, 
    name: "Preparo do Smash Duplo",
    description: "Aprenda o preparo padronizado do nosso hambúrguer mais vendido",
    status: "pendente" as TrainingStatus,
    duration: 15,
    progress: 0,
    type: "produto"
  },
  { 
    id: 2, 
    name: "Segurança Alimentar Básica",
    description: "Normas essenciais de higiene e manipulação de alimentos",
    status: "em_andamento" as TrainingStatus,
    duration: 30,
    progress: 60,
    type: "obrigatorio"
  },
  { 
    id: 3, 
    name: "Atendimento ao Cliente",
    description: "Técnicas para um atendimento excepcional",
    status: "concluido" as TrainingStatus,
    duration: 20,
    progress: 100,
    type: "cargo"
  },
];

const Training = () => {
  const pendingCount = mockTrainings.filter(t => t.status === 'pendente').length;
  const inProgressCount = mockTrainings.filter(t => t.status === 'em_andamento').length;
  const completedCount = mockTrainings.filter(t => t.status === 'concluido').length;

  return (
    <AppLayout title="Treinamentos">
      <PageHeader
        title="Treinamentos"
        subtitle="Sua trilha de capacitação"
      />

      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-warning/10 text-center">
            <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="p-3 rounded-xl bg-info/10 text-center">
            <p className="text-2xl font-bold text-info">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">Em Andamento</p>
          </div>
          <div className="p-3 rounded-xl bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Concluídos</p>
          </div>
        </div>

        {/* Training List */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Seus Treinamentos
          </h3>
          
          {mockTrainings.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Sem treinamentos"
              description="Você não tem treinamentos pendentes"
            />
          ) : (
            <div className="space-y-3">
              {mockTrainings.map((training) => (
                <div key={training.id} className="list-item flex-col items-stretch gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      training.status === 'concluido' 
                        ? 'bg-success/10 text-success' 
                        : training.status === 'em_andamento'
                        ? 'bg-info/10 text-info'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {training.status === 'concluido' ? (
                        <Award className="w-5 h-5" />
                      ) : (
                        <BookOpen className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{training.name}</span>
                        <StatusBadge status={training.status} />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {training.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{training.duration} min</span>
                      </div>
                    </div>
                  </div>
                  
                  {training.status !== 'pendente' && (
                    <div className="space-y-1 mb-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{training.progress}%</span>
                      </div>
                      <Progress value={training.progress} className="h-2" />
                    </div>
                  )}

                  {training.status !== 'concluido' && (
                    <Button 
                      variant={training.status === 'em_andamento' ? "default" : "outline"}
                      className="w-full mt-2"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {training.status === 'em_andamento' ? 'Continuar' : 'Iniciar'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default Training;
