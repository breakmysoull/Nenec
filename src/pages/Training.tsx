import { useEffect, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { trainingService, Training as TrainingType } from "@/services/trainingService";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Training = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<TrainingType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrainings = async () => {
    if (!user) return;
    try {
      const data = await trainingService.getUserTrainings(user.id);
      setTrainings(data);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      toast.error("Erro ao carregar treinamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainings();
  }, [user]);

  const handleStartTraining = async (training: TrainingType) => {
    if (!user) return;
    try {
      if (training.status === 'pendente') {
        await trainingService.startTraining(training.id, user.id);
      }
      navigate(`/training/${training.id}`);
    } catch (error) {
      console.error("Error starting training:", error);
      toast.error("Erro ao iniciar treinamento");
    }
  };

  const pendingCount = trainings.filter(t => t.status === 'pendente').length;
  const inProgressCount = trainings.filter(t => t.status === 'em_andamento').length;
  const completedCount = trainings.filter(t => t.status === 'concluido').length;

  if (loading) {
    return (
      <AppLayout title="Treinamentos">
        <PageHeader title="Treinamentos" subtitle="Carregando..." />
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

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
          
          {trainings.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Sem treinamentos"
              description="Você não tem treinamentos atribuídos no momento"
            />
          ) : (
            <div className="space-y-3">
              {trainings.map((training) => (
                <div key={training.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
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
                      {/* Duration is not in RPC yet, removed or needs to be added */}
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

                  <Button 
                    variant={training.status === 'em_andamento' ? "default" : "outline"}
                    className="w-full mt-2"
                    onClick={() => handleStartTraining(training)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {training.status === 'em_andamento' ? 'Continuar' : training.status === 'concluido' ? 'Revisar' : 'Iniciar'}
                  </Button>
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
