
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { trainingService, TrainingDetails } from "@/services/trainingService";
import { toast } from "sonner";
import { CheckCircle2, PlayCircle, ArrowLeft } from "lucide-react";

const TrainingPlayer = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [training, setTraining] = useState<TrainingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!user || !id) return;
      try {
        const data = await trainingService.getTrainingDetails(id, user.id);
        setTraining(data);
        setCompletedSteps(new Set(data.completedStepIds));
      } catch (error) {
        console.error("Error fetching training details:", error);
        toast.error("Erro ao carregar detalhes do treinamento");
        navigate("/training");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [user, id, navigate]);

  const handleToggleStep = async (stepId: string, checked: boolean) => {
    if (!user) return;
    
    // Optimistic update
    const newCompleted = new Set(completedSteps);
    if (checked) newCompleted.add(stepId);
    else newCompleted.delete(stepId);
    setCompletedSteps(newCompleted);

    try {
      await trainingService.toggleStep(stepId, user.id, checked);
    } catch (error) {
      console.error("Error toggling step:", error);
      toast.error("Erro ao atualizar passo");
      // Revert
      setCompletedSteps(prev => {
        const revert = new Set(prev);
        if (checked) revert.delete(stepId);
        else revert.add(stepId);
        return revert;
      });
    }
  };

  const handleComplete = async () => {
    if (!user || !id || !training) return;

    // Verify required steps
    const pendingRequired = training.steps.filter(s => s.required && !completedSteps.has(s.id));
    if (pendingRequired.length > 0) {
      toast.error(`Complete todos os passos obrigatórios (${pendingRequired.length} restantes)`);
      return;
    }

    try {
      await trainingService.completeTraining(id, user.id);
      toast.success("Treinamento concluído com sucesso!");
      navigate("/training");
    } catch (error) {
      console.error("Error completing training:", error);
      toast.error("Erro ao concluir treinamento");
    }
  };

  if (loading) {
    return (
      <AppLayout title="Carregando...">
        <div className="p-4 space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!training) return null;

  const currentVideo = training.videos[activeVideoIndex];
  const allRequiredDone = training.steps.every(s => !s.required || completedSteps.has(s.id));

  return (
    <AppLayout title={training.name}>
      <div className="flex flex-col h-full">
        <div className="p-4 pb-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/training")} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold">{training.name}</h1>
          <p className="text-sm text-muted-foreground">{training.description}</p>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-6">
          {/* Video Player Section */}
          {training.videos.length > 0 && (
            <div className="space-y-3">
              <div className="aspect-video bg-black rounded-xl overflow-hidden relative group">
                {currentVideo?.video_url ? (
                  <iframe 
                    src={currentVideo.video_url} 
                    className="w-full h-full" 
                    allowFullScreen 
                    title={currentVideo.title || "Video"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50 bg-muted">
                    <PlayCircle className="w-16 h-16" />
                  </div>
                )}
              </div>
              
              {training.videos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {training.videos.map((v, idx) => (
                    <Button
                      key={v.id}
                      variant={idx === activeVideoIndex ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveVideoIndex(idx)}
                      className="whitespace-nowrap"
                    >
                      Vídeo {idx + 1}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Steps Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Passos para Conclusão
            </h3>
            
            <div className="space-y-3">
              {training.steps.map((step) => (
                <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                  <Checkbox 
                    id={step.id} 
                    checked={completedSteps.has(step.id)}
                    onCheckedChange={(c) => handleToggleStep(step.id, c as boolean)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={step.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {step.description}
                      {step.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-background mt-auto">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleComplete}
            disabled={!allRequiredDone}
          >
            Concluir Treinamento
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default TrainingPlayer;
