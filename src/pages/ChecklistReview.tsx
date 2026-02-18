import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  ClipboardCheck, 
  Filter, 
  Calendar as CalendarIcon, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock,
  ChevronRight,
  Eye,
  AlertCircle,
  CheckSquare
} from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { checklistService } from "@/services/checklistService";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

type ChecklistReviewItem = {
  id: string;
  title: string;
  status: "ok" | "nok";
  reason?: string;
  observation?: string;
  photo?: string;
};

type ExecutedChecklist = {
  id: string;
  name: string;
  unit: string;
  executor: string;
  startTime: string;
  endTime: string;
  date: string;
  status: "ok" | "warning" | "critical";
  reviewed: boolean;
  reviewedBy?: string;
  items: ChecklistReviewItem[];
};

const reasonLabels: Record<string, string> = {
  sujo: "Sujo / Limpeza",
  falta: "Falta de Item",
  quebrado: "Equipamento Quebrado",
  procedimento: "Erro de Procedimento",
  outros: "Outros"
};

const ChecklistReview = () => {
  const { user } = useAuth();
  const { activeUnitId, isSuperAdmin } = usePermissions();
  const [executedChecklists, setExecutedChecklists] = useState<ExecutedChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<ExecutedChecklist | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [managerObservation, setManagerObservation] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCompleted = async () => {
      if (!activeUnitId && !isSuperAdmin) {
        setExecutedChecklists([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const runs = await checklistService.getCompletedChecklistRuns(activeUnitId || undefined, isSuperAdmin);
      if (!cancelled) {
        setExecutedChecklists(
          runs.map((run) => ({
            id: run.id,
            name: run.name,
            unit: run.unit,
            executor: run.executor,
            startTime: run.startTime,
            endTime: run.endTime,
            date: run.date,
            status: run.status,
            reviewed: Boolean(run.reviewedAt),
            items: [],
          }))
        );
        setLoading(false);
      }
    };

    loadCompleted();

    return () => {
      cancelled = true;
    };
  }, [activeUnitId, isSuperAdmin]);

  const handleOpenReview = async (checklist: ExecutedChecklist) => {
    setSelectedChecklist(checklist);
    setIsReviewDialogOpen(true);
    setManagerObservation("");
    const items = await checklistService.getChecklistRunDetails(checklist.id);
    const sortedItems = [...items].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "nok" ? -1 : 1;
    });
    setSelectedChecklist((prev) => (prev ? { ...prev, items: sortedItems } : prev));
  };

  const handleConfirmReview = async () => {
    if (!selectedChecklist || !user) return;

    try {
      const success = await checklistService.reviewChecklist(
        selectedChecklist.id,
        managerObservation,
        user.id
      );

      if (!success) {
        return;
      }

      setExecutedChecklists((prev) =>
        prev.map((item) =>
          item.id === selectedChecklist.id ? { ...item, reviewed: true } : item
        )
      );
      setSelectedChecklist((prev) => (prev ? { ...prev, reviewed: true } : prev));
      toast.success("Checklist revisado com sucesso!");
      setIsReviewDialogOpen(false);
    } catch (error) {
      console.error("Erro ao enviar revisão:", error);
    }
  };

  return (
    <AppLayout title="Revisão de Checklists">
      <PageHeader
        title="Revisão Operacional"
        subtitle="Auditoria de checklists executados"
        actions={
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        }
      />

      <div className="p-4 space-y-6">
        {/* Filters Summary (Mock) */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs whitespace-nowrap border">
            <Building2 className="w-3 h-3 text-muted-foreground" />
            Todas as Unidades
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs whitespace-nowrap border">
            <CalendarIcon className="w-3 h-3 text-muted-foreground" />
            Hoje
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs whitespace-nowrap border">
            <AlertCircle className="w-3 h-3 text-muted-foreground" />
            Pendentes de Revisão
          </div>
        </div>

        {/* Checklist List */}
        <section className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
          ) : executedChecklists.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Sem checklists executados"
              description="Não há checklists finalizados para revisar"
            />
          ) : (
            executedChecklists.map((checklist) => (
              <div 
                key={checklist.id}
                className="bg-card rounded-xl border shadow-sm p-4 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleOpenReview(checklist)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-base">{checklist.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {checklist.unit}
                    </div>
                  </div>
                <div className="flex flex-col items-end gap-2">
                  {checklist.status === "critical" && (
                    <div className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-bold rounded">
                      Com Falhas
                    </div>
                  )}
                  {checklist.reviewed ? (
                    <div className="px-2 py-1 bg-success/10 text-success text-xs font-bold rounded flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      REVISADO
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-warning/10 text-warning text-xs font-bold rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      PENDENTE
                    </div>
                  )}
                </div>
                </div>

                <div className="flex items-center justify-between text-sm border-t pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {checklist.executor.charAt(0)}
                    </div>
                    <span className="text-muted-foreground">{checklist.executor}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {checklist.status === 'ok' && (
                      <span className="text-success flex items-center gap-1 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Sem falhas
                      </span>
                    )}
                    {checklist.status === 'warning' && (
                      <span className="text-warning flex items-center gap-1 text-xs font-medium">
                        <AlertTriangle className="w-4 h-4" /> Atenção
                      </span>
                    )}
                    {checklist.status === 'critical' && (
                      <span className="text-destructive flex items-center gap-1 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" /> Falhas
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Review Modal */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[95%] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Auditoria de Checklist</DialogTitle>
          </DialogHeader>
          
          {selectedChecklist && (
            <div className="space-y-6">
              {/* Info Header */}
              <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidade:</span>
                  <span className="font-medium">{selectedChecklist.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Executor:</span>
                  <span className="font-medium">{selectedChecklist.executor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium">{selectedChecklist.startTime} - {selectedChecklist.endTime}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Itens Verificados</h4>
                  <span className="text-xs text-muted-foreground">
                    {selectedChecklist.items.filter((item) => item.status === "nok").length} falhas encontradas
                  </span>
                </div>
                {selectedChecklist.items.map((item) => (
                  <div key={item.id} className={cn(
                    "p-3 rounded-lg border",
                    item.status === 'nok' ? "border-destructive/50 bg-destructive/5" : "border-border"
                  )}>
                    <div className="flex items-start justify-between">
                      <span className={cn("font-medium text-sm", item.status === 'nok' && "text-destructive")}>
                        {item.title}
                      </span>
                      {item.status === 'ok' ? (
                        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                    </div>
                    
                    {item.status === 'nok' && (
                      <div className="mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded space-y-1">
                        {item.reason && (
                           <div><strong>Motivo:</strong> {reasonLabels[item.reason] || item.reason}</div>
                        )}
                        {item.observation && (
                           <div><strong>Obs:</strong> {item.observation}</div>
                        )}
                      </div>
                    )}

                    {item.photo && (
                      <div className="mt-2">
                        <img src={item.photo} className="w-full h-32 object-cover rounded-md border" alt="Evidência" />
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Evidência fotográfica
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Review Action */}
              {!selectedChecklist.reviewed && (
                <div className="pt-4 border-t space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Observação do Gestor (Opcional)</label>
                    <Textarea 
                      placeholder="Ex: Bom trabalho, mas atenção à limpeza..." 
                      value={managerObservation}
                      onChange={(e) => setManagerObservation(e.target.value)}
                    />
                  </div>
                  <Button className="w-full" size="lg" onClick={handleConfirmReview}>
                    <CheckSquare className="w-4 h-4 mr-2" />
                    Marcar como Revisado
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ChecklistReview;
