import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  ClipboardCheck, 
  Sunrise, 
  Sun, 
  Moon,
  CheckCircle2,
  Circle,
  Camera
} from "lucide-react";
import { ChecklistType, checklistTypeLabels } from "@/types/database";
import { cn } from "@/lib/utils";

// Mock data
const mockChecklists = [
  { 
    id: 1, 
    name: "Checklist de Abertura",
    type: "abertura" as ChecklistType,
    totalItems: 12,
    completedItems: 0,
    status: "pending",
    scheduledFor: "06:00"
  },
  { 
    id: 2, 
    name: "Checklist da Praça",
    type: "praca" as ChecklistType,
    totalItems: 8,
    completedItems: 8,
    status: "completed",
    scheduledFor: "12:00"
  },
  { 
    id: 3, 
    name: "Checklist de Fechamento",
    type: "fechamento" as ChecklistType,
    totalItems: 15,
    completedItems: 0,
    status: "pending",
    scheduledFor: "22:00"
  },
];

const typeIcons = {
  abertura: Sunrise,
  praca: Sun,
  fechamento: Moon,
};

const Checklists = () => {
  return (
    <AppLayout title="Checklists">
      <PageHeader
        title="Checklists"
        subtitle="Verificações operacionais"
      />

      <div className="p-4 space-y-4">
        {/* Today's Checklists */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Hoje
          </h3>
          
          {mockChecklists.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Sem checklists"
              description="Não há checklists configurados para hoje"
            />
          ) : (
            <div className="space-y-3">
              {mockChecklists.map((checklist) => {
                const Icon = typeIcons[checklist.type];
                const isComplete = checklist.status === "completed";
                const progress = Math.round((checklist.completedItems / checklist.totalItems) * 100);

                return (
                  <div
                    key={checklist.id}
                    className={cn(
                      "list-item cursor-pointer",
                      isComplete && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-xl",
                      isComplete ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{checklist.name}</span>
                        {isComplete && (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{checklist.scheduledFor}</span>
                        <span>•</span>
                        <span>{checklist.completedItems}/{checklist.totalItems} itens</span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            isComplete ? "bg-success" : "bg-primary"
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={isComplete ? "outline" : "default"}
                      disabled={isComplete}
                    >
                      {isComplete ? "Ver" : "Iniciar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Info Card */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Camera className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Evidências Obrigatórias</p>
              <p className="text-sm text-muted-foreground mt-1">
                Alguns itens exigem foto ou vídeo como evidência. 
                Tenha a câmera pronta!
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Checklists;
