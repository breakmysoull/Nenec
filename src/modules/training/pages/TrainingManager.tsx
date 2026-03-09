import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Video, GripVertical } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";
import { supabase } from "@/integrations/supabase/client";
import { trainingService } from "../services/trainingService";
import { Training, TrainingLesson } from "../types";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const TrainingManager = () => {
  const { user } = useAuth();
  const { activeUnitId } = usePermissions();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [videos, setVideos] = useState<TrainingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [networkId, setNetworkId] = useState<string | null>(null);

  // Dialog States
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Partial<Training>>({});
  const [editingVideo, setEditingVideo] = useState<Partial<TrainingLesson>>({});

  useEffect(() => {
    loadTrainings();
  }, [user]);

  useEffect(() => {
    if (activeUnitId) {
      supabase.from('units').select('network_id').eq('id', activeUnitId).single()
        .then(({ data }) => {
          if (data?.network_id) setNetworkId(data.network_id);
        });
    }
  }, [activeUnitId]);

  const loadTrainings = async () => {
    if (!user) return;
    try {
      const data = await trainingService.getMyTrainings(user.id);
      setTrainings(data);
    } catch (error) {
      toast.error("Erro ao carregar treinamentos");
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async (trainingId: string) => {
    if (!user) return;
    try {
      const data = await trainingService.getTrainingById(trainingId, user.id);
      setVideos(data.lessons);
    } catch (error) {
      toast.error("Erro ao carregar vídeos");
    }
  };

  const handleSelectTraining = (training: Training) => {
    setSelectedTraining(training);
    loadVideos(training.id);
  };

  const handleSaveTraining = async () => {
    try {
      if (editingTraining.id) {
        await trainingService.updateTraining(editingTraining.id, editingTraining);
        toast.success("Treinamento atualizado!");
      } else {
        if (!networkId) {
          toast.error("Erro: Rede não identificada. Selecione uma unidade ativa.");
          return;
        }
        await trainingService.createTraining({ ...editingTraining, network_id: networkId });
        toast.success("Treinamento criado!");
      }
      setIsTrainingDialogOpen(false);
      loadTrainings();
    } catch (error) {
      toast.error("Erro ao salvar treinamento");
    }
  };

  const handleSaveVideo = async () => {
    if (!selectedTraining) return;
    try {
      if (editingVideo.id) {
        await trainingService.updateVideo(editingVideo.id, editingVideo);
        toast.success("Vídeo atualizado!");
      } else {
        await trainingService.addVideo(selectedTraining.id, { 
          ...editingVideo, 
          order_index: videos.length + 1 
        });
        toast.success("Vídeo adicionado!");
      }
      setIsVideoDialogOpen(false);
      loadVideos(selectedTraining.id);
    } catch (error) {
      toast.error("Erro ao salvar vídeo");
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este vídeo?")) return;
    try {
      await trainingService.deleteVideo(id);
      toast.success("Vídeo excluído");
      if (selectedTraining) loadVideos(selectedTraining.id);
    } catch (error) {
      toast.error("Erro ao excluir vídeo");
    }
  };

  return (
    <AppLayout title="Gerenciar Treinamentos">
      <PageHeader
        title="Gerenciar Treinamentos"
        subtitle={selectedTraining ? `Editando: ${selectedTraining.name}` : "Selecione um treinamento"}
        actions={
          <Button onClick={() => { setEditingTraining({}); setIsTrainingDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Treinamento
          </Button>
        }
        showBack={!!selectedTraining}
        onBack={() => setSelectedTraining(null)}
      />

      <div className="p-4 space-y-6">
        {!selectedTraining ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trainings.map(training => (
              <Card 
                key={training.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => handleSelectTraining(training)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {training.type?.toUpperCase() || "TREINAMENTO"}
                  </CardTitle>
                  <Edit2 
                    className="h-4 w-4 text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTraining(training);
                      setIsTrainingDialogOpen(true);
                    }}
                  />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{training.name}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {training.description || "Sem descrição"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Conteúdo (Vídeos)</h3>
              <Button size="sm" onClick={() => { setEditingVideo({}); setIsVideoDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar Vídeo
              </Button>
            </div>

            <div className="space-y-2">
              {videos.map((video, index) => (
                <div key={video.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg group">
                  <GripVertical className="w-5 h-5 text-muted-foreground cursor-move" />
                  <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{video.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{video.video_url}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingVideo(video); setIsVideoDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteVideo(video.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {videos.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhum vídeo cadastrado. Adicione o primeiro!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Training Dialog */}
      <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTraining.id ? "Editar" : "Novo"} Treinamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input 
                value={editingTraining.name || ""} 
                onChange={e => setEditingTraining({...editingTraining, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={editingTraining.description || ""} 
                onChange={e => setEditingTraining({...editingTraining, description: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTrainingDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveTraining}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVideo.id ? "Editar" : "Novo"} Vídeo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título da Aula</Label>
              <Input 
                value={editingVideo.title || ""} 
                onChange={e => setEditingVideo({...editingVideo, title: e.target.value})} 
                placeholder="Ex: Introdução ao Módulo"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Vídeo (YouTube/MP4)</Label>
              <Input 
                value={editingVideo.video_url || ""} 
                onChange={e => setEditingVideo({...editingVideo, video_url: e.target.value})} 
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label>Duração (segundos)</Label>
              <Input 
                type="number"
                value={editingVideo.duration_seconds || ""} 
                onChange={e => setEditingVideo({...editingVideo, duration_seconds: parseInt(e.target.value)})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveVideo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};
