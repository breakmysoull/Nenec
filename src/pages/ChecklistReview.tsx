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
  CheckSquare,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

type FilterState = {
  period: "today" | "week" | "month";
  reviewStatus: "all" | "pending" | "reviewed";
  severity: "all" | "critical" | "ok";
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
  const { activeNetworkId, activeUnitId, isSuperAdmin } = usePermissions();
  const [allChecklists, setAllChecklists] = useState<ExecutedChecklist[]>([]);
  const [executedChecklists, setExecutedChecklists] = useState<ExecutedChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<ExecutedChecklist | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [managerObservation, setManagerObservation] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    period: "today",
    reviewStatus: "all",
    severity: "all",
  });
  const [pendingFilters, setPendingFilters] = useState<FilterState>(filters);

  useEffect(() => {
    let cancelled = false;

    const loadCompleted = async () => {
      if (!activeUnitId && !isSuperAdmin) {
        setAllChecklists([]);
        setLoading(false);
        return;
      }

      if (!activeNetworkId) return;

      setLoading(true);
      const runs = await checklistService.getCompletedChecklistRuns(activeNetworkId, activeUnitId || undefined, isSuperAdmin);
      if (!cancelled) {
        const mapped = runs.map((run) => ({
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
        }));
        setAllChecklists(mapped);
        setLoading(false);
      }
    };

    loadCompleted();

    return () => { cancelled = true; };
  }, [activeNetworkId, activeUnitId, isSuperAdmin]);

  // Apply filters whenever allChecklists or filters change
  useEffect(() => {
    let filtered = [...allChecklists];

    // Period filter
    const now = new Date();
    if (filters.period === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      filtered = filtered.filter((c) => {
        const d = new Date(c.date);
        return d >= startOfDay;
      });
    } else if (filters.period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      filtered = filtered.filter((c) => new Date(c.date) >= startOfWeek);
    } else if (filters.period === "month") {
      const startOfMonth = new Date(now);
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      filtered = filtered.filter((c) => new Date(c.date) >= startOfMonth);
    }

    // Review status filter
    if (filters.reviewStatus === "pending") {
      filtered = filtered.filter((c) => !c.reviewed);
    } else if (filters.reviewStatus === "reviewed") {
      filtered = filtered.filter((c) => c.reviewed);
    }

    // Severity filter
    if (filters.severity === "critical") {
      filtered = filtered.filter((c) => c.status === "critical");
    } else if (filters.severity === "ok") {
      filtered = filtered.filter((c) => c.status === "ok");
    }

    setExecutedChecklists(filtered);
  }, [allChecklists, filters]);

  const applyFilters = () => {
    setFilters(pendingFilters);
    setIsFilterDrawerOpen(false);
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = { period: "today", reviewStatus: "all", severity: "all" };
    setFilters(defaultFilters);
    setPendingFilters(defaultFilters);
    setIsFilterDrawerOpen(false);
  };

  const handleOpenReview = async (checklist: ExecutedChecklist) => {
    setSelectedChecklist(checklist);
    setIsReviewDialogOpen(true);
    setManagerObservation("");
    if (!activeNetworkId) return;
    const items = await checklistService.getChecklistRunDetails(activeNetworkId, activeUnitId || undefined, checklist.id);
    const sortedItems = [...items].sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === "nok" ? -1 : 1;
    });
    setSelectedChecklist((prev) => (prev ? { ...prev, items: sortedItems } : prev));
  };

  const handleConfirmReview = async () => {
    if (!selectedChecklist || !user || !activeNetworkId) return;

    try {
      const success = await checklistService.reviewChecklist(
        activeNetworkId,
        activeUnitId || undefined,
        selectedChecklist.id,
        managerObservation,
        user.uid
      );

      if (!success) return;

      setAllChecklists((prev) =>
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

  const activeFilterCount = [
    filters.period !== "today",
    filters.reviewStatus !== "all",
    filters.severity !== "all",
  ].filter(Boolean).length;

  const periodLabel: Record<string, string> = { today: "Hoje", week: "7 dias", month: "30 dias" };
  const reviewStatusLabel: Record<string, string> = { all: "Todos", pending: "Pendentes", reviewed: "Revisados" };
  const severityLabel: Record<string, string> = { all: "Todos", critical: "Com Falhas", ok: "Sem Falhas" };

  return (
    <AppLayout title="Revisão de Checklists">
      <PageHeader
        title="Revisão Operacional"
        subtitle="Auditoria de checklists executados"
        actions={
          <Button variant="outline" size="sm" onClick={() => { setPendingFilters(filters); setIsFilterDrawerOpen(true); }}>
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        }
      />

      <div className="p-4 space-y-6">
        {/* Active Filters Summary */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs whitespace-nowrap border border-primary/20 font-medium">
            <CalendarIcon className="w-3 h-3" />
            {periodLabel[filters.period]}
          </div>
          {filters.reviewStatus !== "all" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs whitespace-nowrap border font-medium">
              <CheckSquare className="w-3 h-3" />
              {reviewStatusLabel[filters.reviewStatus]}
              <button onClick={() => setFilters(f => ({ ...f, reviewStatus: "all" }))}><X className="w-3 h-3 ml-0.5 opacity-60" /></button>
            </div>
          )}
          {filters.severity !== "all" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs whitespace-nowrap border font-medium">
              <AlertCircle className="w-3 h-3" />
              {severityLabel[filters.severity]}
              <button onClick={() => setFilters(f => ({ ...f, severity: "all" }))}><X className="w-3 h-3 ml-0.5 opacity-60" /></button>
            </div>
          )}
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap underline-offset-2 hover:underline">
              Limpar
            </button>
          )}
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-xs text-muted-foreground -mt-2">
            {executedChecklists.length} resultado{executedChecklists.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* Checklist List */}
        <section className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Clock className="w-5 h-5 animate-spin" />
            </div>
          ) : executedChecklists.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nenhum resultado"
              description="Ajuste os filtros ou aguarde execuções"
            />
          ) : (
            executedChecklists.map((checklist) => (
              <div 
                key={checklist.id}
                className={cn(
                  "bg-card rounded-xl border shadow-sm p-4 cursor-pointer hover:border-primary/50 transition-colors",
                  checklist.status === "critical" && !checklist.reviewed && "border-l-4 border-l-destructive"
                )}
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

      {/* Filter Drawer */}
      <Drawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filtrar Revisões
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-5">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={pendingFilters.period} onValueChange={(v) => setPendingFilters(f => ({ ...f, period: v as FilterState["period"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Últimos 7 dias</SelectItem>
                    <SelectItem value="month">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status de Revisão</Label>
                <Select value={pendingFilters.reviewStatus} onValueChange={(v) => setPendingFilters(f => ({ ...f, reviewStatus: v as FilterState["reviewStatus"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes de Revisão</SelectItem>
                    <SelectItem value="reviewed">Já Revisados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gravidade</Label>
                <Select value={pendingFilters.severity} onValueChange={(v) => setPendingFilters(f => ({ ...f, severity: v as FilterState["severity"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="critical">Apenas com Falhas</SelectItem>
                    <SelectItem value="ok">Apenas sem Falhas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DrawerFooter className="gap-2">
              <Button className="w-full" onClick={applyFilters}>Aplicar Filtros</Button>
              <Button variant="outline" className="w-full" onClick={resetFilters}>Limpar Tudo</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

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
