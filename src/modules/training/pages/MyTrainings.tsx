import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, PlayCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trainingService } from "../services/trainingService";
import { Training, TrainingStatus } from "../types";
import { toast } from "sonner";

export const MyTrainings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTrainings = async () => {
      try {
        setLoading(true);
        const data = await trainingService.getMyTrainings(user.uid);
        setTrainings(data);
      } catch (error) {
        console.error("Error fetching trainings:", error);
        toast.error("Erro ao carregar treinamentos.");
      } finally {
        setLoading(false);
      }
    };
    fetchTrainings();
  }, [user]);

  return (
    <AppLayout title="Meus Treinamentos">
      <PageHeader 
        title="Meus Treinamentos" 
        subtitle="Acesse os conteúdos interativos da sua unidade"
      />

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : trainings.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Nenhum treinamento atribuído"
            description="Você ainda não possui treinamentos nesta unidade. Converse com seu gestor."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trainings.map((training) => (
              <div key={training.id} className="bg-card border rounded-lg p-5 space-y-4 flex flex-col justify-between hover:border-primary/50 transition-colors shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-bold text-lg leading-tight">{training.name || "Treinamento sem nome"}</div>
                    <StatusBadge status={(training.status || 'pendente') as TrainingStatus} />
                  </div>
                  {training.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {training.description}
                    </p>
                  )}
                  {training.duration_seconds && training.duration_seconds > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{Math.floor(training.duration_seconds / 60)} minutos de duração estimada</span>
                    </div>
                  ) : null}
                </div>
                
                <Button
                  className="w-full font-bold h-11 gap-2 mt-4"
                  variant={training.status === "concluido" ? "outline" : "default"}
                  onClick={() => navigate(`/training/${training.id}`)}
                >
                  <PlayCircle className="w-5 h-5" />
                  {training.status === "concluido" ? "Revisar Conteúdo" : "Começar Treinamento"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
