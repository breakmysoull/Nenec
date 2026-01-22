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
  Camera,
  Loader2,
  ChevronLeft,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ThumbsUp
} from "lucide-react";
import { ChecklistType } from "@/types/database";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Mock Checklist Items (Simulating DB)
interface ChecklistItemMock {
  id: string;
  title: string;
  type: 'check' | 'photo' | 'observation';
  isRequired: boolean;
}

const mockChecklistItems: Record<string, ChecklistItemMock[]> = {
  '1': [
    { id: '1', title: 'Verificar temperatura dos freezers (-18°C)', type: 'check', isRequired: true },
    { id: '2', title: 'Higienizar bancada de preparação', type: 'check', isRequired: true },
    { id: '3', title: 'Foto do uniforme completo', type: 'photo', isRequired: true },
    { id: '4', title: 'Verificar validade dos molhos na pista', type: 'check', isRequired: true },
    { id: '5', title: 'Ligar equipamentos da chapa', type: 'check', isRequired: true },
  ],
  '2': [
    { id: '6', title: 'Reposição de embalagens', type: 'check', isRequired: true },
    { id: '7', title: 'Limpeza do chão (área de fritura)', type: 'check', isRequired: true },
  ]
};

// Mock data
const mockChecklists = [
  { 
    id: 1, 
    name: "Checklist de Abertura",
    type: "abertura" as ChecklistType,
    totalItems: 5,
    completedItems: 0,
    status: "pending",
    scheduledFor: "08:00",
    deadline: "10:00"
  },
  { 
    id: 2, 
    name: "Checklist da Praça",
    type: "praca" as ChecklistType,
    totalItems: 2,
    completedItems: 0,
    status: "pending",
    scheduledFor: "12:00",
    deadline: "14:00"
  },
  { 
    id: 3, 
    name: "Checklist de Fechamento",
    type: "fechamento" as ChecklistType,
    totalItems: 15,
    completedItems: 0,
    status: "pending",
    scheduledFor: "22:00",
    deadline: "23:59"
  },
];

const typeIcons = {
  abertura: Sunrise,
  praca: Sun,
  fechamento: Moon,
};

const Checklists = () => {
  const [activeChecklistId, setActiveChecklistId] = useState<number | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [completed, setCompleted] = useState(false);
  
  // NOK Handling
  const [isNokDrawerOpen, setIsNokDrawerOpen] = useState(false);
  const [nokReason, setNokReason] = useState("sujo");
  const [nokObservation, setNokObservation] = useState("");
  const [nokPhoto, setNokPhoto] = useState<string | null>(null);
  const nokFileInputRef = useRef<HTMLInputElement>(null);

  // Get active checklist details
  const activeChecklist = mockChecklists.find(c => c.id === activeChecklistId);
  const items = activeChecklistId ? (mockChecklistItems[String(activeChecklistId)] || []) : [];
  const currentItem = items[currentItemIndex];
  const progress = items.length > 0 ? ((currentItemIndex) / items.length) * 100 : 0;

  const handleStartChecklist = (id: number) => {
    setActiveChecklistId(id);
    setCurrentItemIndex(0);
    setAnswers({});
    setCompleted(false);
  };

  const handleAnswer = (answer: any) => {
    if (!currentItem) return;
    
    setAnswers(prev => ({ ...prev, [currentItem.id]: answer }));
    
    if (currentItemIndex < items.length - 1) {
      setTimeout(() => setCurrentItemIndex(prev => prev + 1), 200); // Small delay for animation
    } else {
      finishChecklist();
    }
  };

  const handleNokClick = () => {
    setIsNokDrawerOpen(true);
    setNokReason("sujo");
    setNokObservation("");
    setNokPhoto(null);
  };

  const confirmNok = () => {
    handleAnswer({ 
      status: 'nok', 
      reason: nokReason, 
      observation: nokObservation,
      photo: nokPhoto,
      timestamp: new Date().toISOString()
    });
    setIsNokDrawerOpen(false);
    toast.error("Incidente registrado", { duration: 2000 });
  };

  const finishChecklist = async () => {
    setCompleted(true);
    toast.success("Checklist finalizado com sucesso!");
    // Here we would save to Supabase
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fakeUrl = URL.createObjectURL(file);
      handleAnswer({ type: 'photo', url: fakeUrl });
      toast.success("Foto salva!");
    } catch (error) {
      toast.error("Erro ao salvar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleNokPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fakeUrl = URL.createObjectURL(file);
      setNokPhoto(fakeUrl);
      toast.success("Foto do incidente anexada!");
    } catch (error) {
      toast.error("Erro ao salvar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    if (completed) {
      setActiveChecklistId(null);
      setCompleted(false);
    } else {
      if (confirm("Sair do checklist? O progresso não salvo será perdido.")) {
        setActiveChecklistId(null);
      }
    }
  };

  // --- EXECUTION VIEW (FOCUS MODE) ---
  if (activeChecklist && activeChecklistId) {
    if (completed) {
      return (
        <AppLayout title="Checklist Concluído">
          <div className="flex flex-col items-center justify-center h-[80vh] p-6 text-center animate-scale-in">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
              <ThumbsUp className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-success">Excelente!</h2>
            <p className="text-muted-foreground mb-8">
              Você finalizou o <strong>{activeChecklist.name}</strong> em 2min 15s.
            </p>
            <Button size="lg" className="w-full max-w-xs" onClick={() => setActiveChecklistId(null)}>
              Voltar para Início
            </Button>
          </div>
        </AppLayout>
      );
    }

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header Fixo */}
        <div className="sticky top-0 z-50 bg-background border-b safe-area-top">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div className="text-center">
              <h1 className="font-bold text-sm">{activeChecklist.name}</h1>
              <p className="text-xs text-muted-foreground">Prazo: {activeChecklist.deadline}</p>
            </div>
            <div className="w-10" /> {/* Spacer */}
          </div>
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Focus Area */}
        <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full animate-fade-in">
          <div className="flex-1 flex flex-col justify-center space-y-8">
            {/* Item Counter */}
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
              Item {currentItemIndex + 1} de {items.length}
            </div>

            {/* Item Title */}
            <h2 className="text-2xl font-bold text-center leading-tight">
              {currentItem?.title}
            </h2>

            {/* Observation if needed (hidden for now unless NOK triggered) */}
            
            {/* Photo Preview */}
            {currentItem?.type === 'photo' && answers[currentItem.id]?.url && (
              <div className="rounded-xl overflow-hidden border-2 border-primary mx-auto w-full aspect-video relative">
                 <img src={answers[currentItem.id].url} className="object-cover w-full h-full" alt="Evidência" />
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <p className="text-white font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Foto Registrada</p>
                 </div>
              </div>
            )}
          </div>

          {/* Action Area (Bottom) */}
          <div className="mt-auto space-y-4 pt-6 pb-8 safe-area-bottom">
            {currentItem?.type === 'photo' ? (
              !answers[currentItem.id] ? (
                <Button 
                  size="lg" 
                  className="w-full h-16 text-lg gap-2" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  Tirar Foto Obrigatória
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" size="lg" className="h-14" onClick={() => fileInputRef.current?.click()}>
                    Refazer Foto
                  </Button>
                  <Button size="lg" className="h-14" onClick={() => handleAnswer(answers[currentItem.id])}>
                    Confirmar <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 text-lg border-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive flex flex-col gap-1"
                  onClick={handleNokClick}
                >
                  <XCircle className="w-8 h-8 mb-1" />
                  Não OK
                </Button>
                
                <Button 
                  className="h-20 text-lg bg-success hover:bg-success/90 text-white flex flex-col gap-1"
                  onClick={() => handleAnswer({ status: 'ok' })}
                >
                  <CheckCircle2 className="w-8 h-8 mb-1" />
                  Conforme
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* NOK Drawer */}
        <Drawer open={isNokDrawerOpen} onOpenChange={setIsNokDrawerOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle className="text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Registrar Falha
                </DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-6">
                <div className="space-y-3">
                  <Label>Qual o motivo?</Label>
                  <RadioGroup value={nokReason} onValueChange={setNokReason} className="grid grid-cols-2 gap-3">
                    <div>
                      <RadioGroupItem value="sujo" id="sujo" className="peer sr-only" />
                      <Label
                        htmlFor="sujo"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:text-destructive cursor-pointer"
                      >
                        <span className="text-xl mb-1">🧹</span>
                        Sujo
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="falta" id="falta" className="peer sr-only" />
                      <Label
                        htmlFor="falta"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:text-destructive cursor-pointer"
                      >
                        <span className="text-xl mb-1">📦</span>
                        Falta Item
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="quebrado" id="quebrado" className="peer sr-only" />
                      <Label
                        htmlFor="quebrado"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:text-destructive cursor-pointer"
                      >
                        <span className="text-xl mb-1">🛠</span>
                        Quebrado
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="procedimento" id="procedimento" className="peer sr-only" />
                      <Label
                        htmlFor="procedimento"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-destructive peer-data-[state=checked]:text-destructive cursor-pointer"
                      >
                        <span className="text-xl mb-1">⚠️</span>
                        Erro Proc.
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Observação (Opcional)</Label>
                  <Textarea 
                    placeholder="Descreva o problema brevemente..." 
                    value={nokObservation}
                    onChange={(e) => setNokObservation(e.target.value)}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Evidência (Opcional)</Label>
                  {nokPhoto ? (
                    <div className="relative rounded-lg overflow-hidden border aspect-video">
                      <img src={nokPhoto} alt="Evidência" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={() => setNokPhoto(null)}
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-dashed border-2 h-12 gap-2"
                      onClick={() => nokFileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      Adicionar Foto
                    </Button>
                  )}
                </div>
              </div>
              <DrawerFooter>
                <Button 
                  size="lg" 
                  className="w-full bg-destructive hover:bg-destructive/90 text-white"
                  onClick={confirmNok}
                >
                  Confirmar Falha
                </Button>
                <Button variant="outline" onClick={() => setIsNokDrawerOpen(false)}>
                  Cancelar
                </Button>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>

        {/* Hidden Input for Camera */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={fileInputRef}
          onChange={handlePhotoUpload}
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={nokFileInputRef}
          onChange={handleNokPhotoUpload}
        />
      </div>
    );
  }

  // --- LIST VIEW (DEFAULT) ---
  return (
    <AppLayout title="Checklists">
      <PageHeader
        title="Checklists"
        subtitle="Verificações operacionais"
      />

      <div className="p-4 space-y-6">
        {/* Today's Checklists */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Para Fazer Agora
            </h3>
            <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          
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
                const isLate = false; // Logic to check time

                return (
                  <div
                    key={checklist.id}
                    onClick={() => handleStartChecklist(checklist.id)}
                    className={cn(
                      "list-item cursor-pointer active:scale-[0.98] transition-transform",
                      isComplete && "opacity-60 grayscale"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-xl",
                      isComplete ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                         <span className="font-bold text-lg">{checklist.name}</span>
                         {isComplete && <CheckCircle2 className="w-5 h-5 text-success" />}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                         <div className="flex items-center gap-1">
                           <Clock className="w-3.5 h-3.5" />
                           <span>Prazo: {checklist.deadline}</span>
                         </div>
                         <div className="flex items-center gap-1">
                           <ClipboardCheck className="w-3.5 h-3.5" />
                           <span>{checklist.totalItems} itens</span>
                         </div>
                      </div>
                    </div>
                    
                    {!isComplete && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* History Preview */}
        <section className="pt-4 border-t">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Histórico Recente
          </h3>
          <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed">
            Nenhum checklist finalizado nos últimos 7 dias.
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

// Helper for ChevronRight which was missing in imports
import { ChevronRight, Clock } from "lucide-react";

export default Checklists;
