import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useAuth } from "@/contexts/AuthContext";
import { isManagerOrAbove } from "@/lib/permissions";
import { toast } from "sonner";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  Camera,
  XCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChecklistActionPlan } from "@/types/database";

export default function ActionPlans() {
  const { activeUnitId, role } = usePermissions();
  const { user } = useAuth();
  
  const [plans, setPlans] = useState<ChecklistActionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution State
  const [selectedPlan, setSelectedPlan] = useState<ChecklistActionPlan | null>(null);
  const [isResolveDrawerOpen, setIsResolveDrawerOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = isManagerOrAbove(role);

  const loadActionPlans = async () => {
    if (!activeUnitId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("checklist_action_plans" as any)
        .select("*")
        .eq("unit_id", activeUnitId)
        .in("status", ["PENDING", "IN_PROGRESS"])
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      setPlans(data as unknown as ChecklistActionPlan[]);
    } catch (err) {
      console.error("Erro ao carregar planos de ação:", err);
      toast.error("Não foi possível carregar as tratativas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActionPlans();
  }, [activeUnitId]);

  const handleResolveClick = (plan: ChecklistActionPlan) => {
    setSelectedPlan(plan);
    setResolutionNotes("");
    setResolutionPhoto(null);
    setIsResolveDrawerOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlan || !user) return;

    try {
      setUploading(true);
      const filePath = `action_plans/${selectedPlan.id}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("checklist-evidences")
        .upload(filePath, file, { upsert: true, contentType: "image/jpeg" });

      if (error) throw error;

      const { data } = supabase.storage.from("checklist-evidences").getPublicUrl(filePath);
      setResolutionPhoto(data.publicUrl);
      toast.success("Foto anexada!");
    } catch (error) {
      console.error("Erro ao fazer upload da evidência:", error);
      toast.error("Falha ao anexar a foto.");
    } finally {
      setUploading(false);
    }
  };

  const confirmResolution = async () => {
    if (!selectedPlan) return;
    
    // To ensure quality, force photo upload for resolution
    if (!resolutionPhoto) {
      toast.error("A foto evidenciando a resolução é obrigatória.");
      return;
    }

    try {
      const { error } = await supabase
        .from("checklist_action_plans" as any)
        .update({
          status: isAdmin ? 'VERIFIED_BY_MANAGER' : 'RESOLVED',
          resolution_notes: resolutionNotes,
          resolution_evidence_url: resolutionPhoto,
        })
        .eq("id", selectedPlan.id);

      if (error) throw error;

      toast.success("Tratativa concluída com sucesso!");
      setIsResolveDrawerOpen(false);
      loadActionPlans();
    } catch (err) {
      console.error("Erro ao salvar resolução:", err);
      toast.error("Falha ao salvar a tratativa.");
    }
  };

  // List View
  return (
    <AppLayout title="Planos de Ação">
      <PageHeader
        title="Tratativas"
        subtitle="Acompanhamento de falhas e pendências"
      />

      <div className="p-4 space-y-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Tudo em Ordem"
            description="Nenhuma tratativa pendente encontrada."
          />
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-destructive/5 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm line-clamp-2">{plan.description}</h3>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(plan.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-muted/20 flex justify-end">
                  <Button size="sm" onClick={() => handleResolveClick(plan)}>
                    Resolver Agora <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Drawer */}
      <Drawer open={isResolveDrawerOpen} onOpenChange={setIsResolveDrawerOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader>
              <DrawerTitle>Finalizar Tratativa</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-6">
              <div className="space-y-2">
                <Label>O que foi feito?</Label>
                <Textarea 
                  placeholder="Descreva como o problema foi resolvido..." 
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label>Foto da Solução (Obrigatória)</Label>
                {resolutionPhoto ? (
                  <div className="relative rounded-lg overflow-hidden border aspect-video">
                    <img src={resolutionPhoto} alt="Evidência" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setResolutionPhoto(null)}
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full border-dashed border-2 h-16 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    Tirar Foto da Solução
                  </Button>
                )}
              </div>
            </div>
            <DrawerFooter>
              <Button 
                size="lg" 
                className="w-full"
                onClick={confirmResolution}
                disabled={uploading || !resolutionPhoto}
              >
                Concluir Tratativa
              </Button>
              <Button variant="outline" onClick={() => setIsResolveDrawerOpen(false)}>
                Cancelar
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handlePhotoUpload}
      />
    </AppLayout>
  );
}
