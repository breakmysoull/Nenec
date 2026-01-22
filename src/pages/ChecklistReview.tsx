import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
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
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mock Data for Review List
const mockExecutedChecklists = [
  {
    id: 1,
    name: "Checklist de Abertura",
    unit: "Loja Centro",
    executor: "Maria Silva",
    startTime: "07:55",
    endTime: "08:15",
    date: "Hoje",
    status: "ok", // ok, warning, critical
    reviewed: false,
    items: [
      { id: 1, title: "Temperaturas Freezers", status: "ok" },
      { id: 2, title: "Limpeza Bancadas", status: "ok" },
      { id: 3, title: "Uniforme Completo", status: "ok", photo: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&q=80&w=200" }
    ]
  },
  {
    id: 2,
    name: "Checklist da Praça",
    unit: "Loja Shopping",
    executor: "João Souza",
    startTime: "11:00",
    endTime: "11:20",
    date: "Hoje",
    status: "critical",
    reviewed: false,
    items: [
      { id: 1, title: "Molhos na Validade", status: "ok" },
      { id: 2, title: "Chão Limpo", status: "nok", reason: "sujo", observation: "Óleo derramado próximo à fritadeira", photo: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200" }
    ]
  },
  {
    id: 3,
    name: "Checklist de Fechamento",
    unit: "Loja Centro",
    executor: "Carlos Oliveira",
    startTime: "22:30",
    endTime: "23:00",
    date: "Ontem",
    status: "warning",
    reviewed: true,
    reviewedBy: "Gerente Ana",
    items: []
  }
];

const reasonLabels: Record<string, string> = {
  sujo: "Sujo / Limpeza",
  falta: "Falta de Item",
  quebrado: "Equipamento Quebrado",
  procedimento: "Erro de Procedimento",
  outros: "Outros"
};

const ChecklistReview = () => {
  const [selectedChecklist, setSelectedChecklist] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  const handleOpenReview = (checklist: any) => {
    setSelectedChecklist(checklist);
    setIsReviewDialogOpen(true);
    setReviewNote("");
  };

  const handleConfirmReview = () => {
    toast.success("Checklist revisado com sucesso!");
    setIsReviewDialogOpen(false);
    // Here we would update the backend
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
          {mockExecutedChecklists.map((checklist) => (
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
          ))}
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
                <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Itens Verificados</h4>
                {selectedChecklist.items.map((item: any) => (
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
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
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