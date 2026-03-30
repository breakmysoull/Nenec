import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  GraduationCap, Plus, Edit, Trash2, Video, ChevronDown, ChevronUp, Loader2,
  CheckCircle2, BookOpen, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { trainingService } from "@/modules/training/services/trainingService";
import { Training, TrainingLesson } from "@/modules/training/types";
import { usePermissions } from "@/contexts/PermissionsContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, collectionGroup, deleteDoc, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/modules/training/types";

type ExpandedState = Record<string, boolean>;

const TrainingManager = () => {
  const navigate = useNavigate();
  const { activeUnitId } = usePermissions();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [videosByTraining, setVideosByTraining] = useState<Record<string, TrainingLesson[]>>({});

  // Training dialog
  const [trainingDialog, setTrainingDialog] = useState<{ open: boolean; editing: Training | null }>({
    open: false, editing: null,
  });
  const [tName, setTName] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tRole, setTRole] = useState("all");
  const [tMandatory, setTMandatory] = useState(true);
  const [saving, setSaving] = useState(false);

  // Video dialog
  const [videoDialog, setVideoDialog] = useState<{ open: boolean; trainingId: string | null; editing: TrainingLesson | null }>({
    open: false, trainingId: null, editing: null,
  });
  const [vTitle, setVTitle] = useState("");
  const [vUrl, setVUrl] = useState("");
  const [vOrder, setVOrder] = useState("1");
  const [savingVideo, setSavingVideo] = useState(false);

  const [networkId, setNetworkId] = useState<string | null>(null);

  // Load network_id from unit
  useEffect(() => {
    const load = async () => {
      if (!activeUnitId) return;
      try {
        const snap = await getDocs(query(collectionGroup(db, 'units'), where('id', '==', activeUnitId)));
        if (!snap.empty) {
           setNetworkId(snap.docs[0].ref.parent.parent?.id || "codex_network_default");
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [activeUnitId]);

  const loadTrainings = async () => {
    if (!networkId) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'networks', networkId, 'trainings')));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTrainings((data || []) as unknown as Training[]);
    } catch {
      toast.error("Erro ao carregar treinamentos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainings();
  }, [networkId]);

  const loadVideos = async (trainingId: string) => {
    try {
      const snap = await getDocs(query(collectionGroup(db, 'videos'), where('training_id', '==', trainingId)));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVideosByTraining(prev => ({ ...prev, [trainingId]: (data || []) as unknown as TrainingLesson[] }));
    } catch (e) { console.error(e); }
  };

  const toggleExpand = (id: string) => {
    const next = !expanded[id];
    setExpanded(prev => ({ ...prev, [id]: next }));
    if (next && !videosByTraining[id]) {
      loadVideos(id);
    }
  };

  // --- Training CRUD ---
  const openCreateTraining = () => {
    setTName(""); setTDesc(""); setTRole("all"); setTMandatory(true);
    setTrainingDialog({ open: true, editing: null });
  };

  const openEditTraining = (t: Training) => {
    setTName(t.name);
    setTDesc(t.description || "");
    setTRole((t.target_role as string) || "all");
    setTMandatory(t.is_mandatory);
    setTrainingDialog({ open: true, editing: t });
  };

  const handleSaveTraining = async () => {
    if (!tName.trim() || !networkId) return;
    setSaving(true);
    try {
      const payload = {
        name: tName.trim(),
        description: tDesc.trim() || null,
        target_role: (tRole === "all" ? null : tRole) as AppRole | null,
        is_mandatory: tMandatory,
        is_active: true,
        network_id: networkId,
      };
      if (trainingDialog.editing) {
        await trainingService.updateTraining(trainingDialog.editing.id, payload);
        toast.success("Treinamento atualizado!");
      } else {
        await trainingService.createTraining(payload);
        toast.success("Treinamento criado!");
      }
      setTrainingDialog({ open: false, editing: null });
      loadTrainings();
    } catch {
      toast.error("Erro ao salvar treinamento");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTraining = async (id: string) => {
    if (!confirm("Excluir este treinamento? Os vídeos vinculados também serão removidos.")) return;
    try {
      const snap = await getDocs(collectionGroup(db, 'trainings'));
      const tDoc = snap.docs.find(d => d.id === id);
      if (tDoc) {
        // Exclusão recursiva simples omitida no client por segurança, delete apenas o doc pai
        await deleteDoc(tDoc.ref);
      }
      toast.success("Treinamento removido");
      loadTrainings();
    } catch {
      toast.error("Erro ao excluir treinamento");
    }
  };

  const handleToggleActive = async (t: Training) => {
    try {
      await trainingService.updateTraining(t.id, { is_active: !t.is_active });
      toast.success(t.is_active ? "Treinamento desativado" : "Treinamento ativado");
      loadTrainings();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  // --- Video CRUD ---
  const openAddVideo = (trainingId: string) => {
    setVTitle(""); setVUrl(""); setVOrder("1");
    setVideoDialog({ open: true, trainingId, editing: null });
  };

  const openEditVideo = (trainingId: string, lesson: TrainingLesson) => {
    setVTitle(lesson.title || "");
    setVUrl(lesson.video_url || "");
    setVOrder(String(lesson.order_index ?? 1));
    setVideoDialog({ open: true, trainingId, editing: lesson });
  };

  const handleSaveVideo = async () => {
    if (!vUrl.trim() || !videoDialog.trainingId) return;
    setSavingVideo(true);
    try {
      const payload: Partial<TrainingLesson> = {
        title: vTitle.trim() || null,
        video_url: vUrl.trim(),
        order_index: parseInt(vOrder) || 1,
      };
      if (videoDialog.editing) {
        await trainingService.updateVideo(videoDialog.editing.id, payload);
        toast.success("Vídeo atualizado!");
      } else {
        await trainingService.addVideo(videoDialog.trainingId, payload);
        toast.success("Vídeo adicionado!");
      }
      setVideoDialog({ open: false, trainingId: null, editing: null });
      loadVideos(videoDialog.trainingId!);
    } catch {
      toast.error("Erro ao salvar vídeo");
    } finally {
      setSavingVideo(false);
    }
  };

  const handleDeleteVideo = async (trainingId: string, videoId: string) => {
    if (!confirm("Remover este vídeo?")) return;
    try {
      await trainingService.deleteVideo(videoId);
      toast.success("Vídeo removido");
      loadVideos(trainingId);
    } catch {
      toast.error("Erro ao remover vídeo");
    }
  };

  const roleLabels: Record<string, string> = {
    all: "Todos os cargos",
    operador: "Operador",
    gerente: "Gerente",
    estoquista: "Estoquista",
  };

  return (
    <AppLayout title="Gerenciar Treinamentos">
      <PageHeader
        title="Treinamentos"
        subtitle="Crie e gerencie os treinamentos da sua franquia"
        actions={
          <Button size="sm" onClick={openCreateTraining}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Treinamento
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : trainings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Nenhum treinamento cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie seu primeiro treinamento para começar</p>
            </div>
            <Button onClick={openCreateTraining}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Treinamento
            </Button>
          </div>
        ) : (
          trainings.map((t) => {
            const isExpanded = !!expanded[t.id];
            const videos = videosByTraining[t.id] || [];

            return (
              <div key={t.id} className={cn(
                "bg-card border rounded-xl shadow-sm overflow-hidden transition-all",
                !t.is_active && "opacity-60"
              )}>
                {/* Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(t.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        t.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {t.description || "Sem descrição"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {roleLabels[(t.target_role as string) || "all"] || "Todos"}
                          </span>
                          {t.is_mandatory && (
                            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                              OBRIGATÓRIO
                            </span>
                          )}
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-bold",
                            t.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                          )}>
                            {t.is_active ? "ATIVO" : "INATIVO"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t divide-y">
                    {/* Actions */}
                    <div className="px-4 py-3 flex flex-wrap gap-2 bg-muted/20">
                      <Button size="sm" variant="outline" onClick={() => openEditTraining(t)}>
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(t)}
                      >
                        {t.is_active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTraining(t.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Excluir
                      </Button>
                    </div>

                    {/* Videos */}
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" />
                          Vídeos ({videos.length})
                        </h4>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openAddVideo(t.id)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar Vídeo
                        </Button>
                      </div>

                      {videos.length === 0 ? (
                        <div className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg">
                          Nenhum vídeo adicionado ainda.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {videos.map((v) => (
                            <div key={v.id} className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded-lg border text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-muted-foreground shrink-0 w-5 text-center font-bold">
                                  {v.order_index}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{v.title || "Sem título"}</p>
                                  <p className="text-xs text-muted-foreground truncate">{v.video_url}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-7 h-7"
                                  onClick={() => openEditVideo(t.id, v)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-7 h-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteVideo(t.id, v.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Training Dialog */}
      <Dialog open={trainingDialog.open} onOpenChange={(o) => !o && setTrainingDialog({ open: false, editing: null })}>
        <DialogContent className="w-[95%] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{trainingDialog.editing ? "Editar" : "Novo"} Treinamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Treinamento *</Label>
              <Input
                placeholder="Ex: Treinamento de Abertura"
                value={tName}
                onChange={(e) => setTName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo do treinamento..."
                value={tDesc}
                onChange={(e) => setTDesc(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo alvo</Label>
              <Select value={tRole} onValueChange={setTRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cargos</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="estoquista">Estoquista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="mandatory"
                checked={tMandatory}
                onChange={(e) => setTMandatory(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="mandatory" className="cursor-pointer">Obrigatório para todos os colaboradores</Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTrainingDialog({ open: false, editing: null })}>Cancelar</Button>
            <Button onClick={handleSaveTraining} disabled={!tName.trim() || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {trainingDialog.editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={videoDialog.open} onOpenChange={(o) => !o && setVideoDialog({ open: false, trainingId: null, editing: null })}>
        <DialogContent className="w-[95%] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{videoDialog.editing ? "Editar" : "Adicionar"} Vídeo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título do Vídeo</Label>
              <Input
                placeholder="Ex: Aula 1 — Preparo do Poke"
                value={vTitle}
                onChange={(e) => setVTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL do Vídeo (YouTube) *</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={vUrl}
                onChange={(e) => setVUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                min="1"
                value={vOrder}
                onChange={(e) => setVOrder(e.target.value)}
                className="w-20"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVideoDialog({ open: false, trainingId: null, editing: null })}>Cancelar</Button>
            <Button onClick={handleSaveVideo} disabled={!vUrl.trim() || savingVideo}>
              {savingVideo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {videoDialog.editing ? "Atualizar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TrainingManager;
