import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  ChevronRight,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { checklistService, TodayChecklist, ChecklistItem } from "@/services/checklistService";
import { usePermissions } from "@/contexts/PermissionsContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ChecklistManager = () => {
  const { activeNetworkId, activeUnitId } = usePermissions();
  const [checklists, setChecklists] = useState<TodayChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<TodayChecklist | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string, title: string } | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isEditingChecklist, setIsEditingChecklist] = useState(false);
  const [editChecklistName, setEditChecklistName] = useState("");
  const [editChecklistSector, setEditChecklistSector] = useState("");
  const [editTimefenceStart, setEditTimefenceStart] = useState("");
  const [editTimefenceEnd, setEditTimefenceEnd] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    loadChecklists();
  }, [activeUnitId]);

  const loadChecklists = async () => {
    if (!activeUnitId || !activeNetworkId) return;
    setLoading(true);
    try {
      const data = await checklistService.getTodayChecklists(activeNetworkId, activeUnitId);
      setChecklists(data);
    } catch (error) {
      toast.error("Erro ao carregar checklists");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.title.trim() || !activeNetworkId || !selectedChecklist) return;
    
    const success = await checklistService.updateChecklistItem(activeNetworkId, selectedChecklist.id, editingItem.id, { title: editingItem.title });
    if (success) {
      toast.success("Item atualizado");
      if (selectedChecklist) {
        const updatedItems = selectedChecklist.items.map(item => 
          item.id === editingItem.id ? { ...item, title: editingItem.title } : item
        );
        setSelectedChecklist({ ...selectedChecklist, items: updatedItems });
      }
      setEditingItem(null);
    } else {
      toast.error("Erro ao atualizar item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    if (!activeNetworkId || !selectedChecklist) return;

    const success = await checklistService.deleteChecklistItem(activeNetworkId, selectedChecklist.id, itemId);
    if (success) {
      toast.success("Item excluído");
      if (selectedChecklist) {
        const updatedItems = selectedChecklist.items.filter(item => item.id !== itemId);
        setSelectedChecklist({ ...selectedChecklist, items: updatedItems });
      }
    } else {
      toast.error("Erro ao excluir item");
    }
  };

  const handleAddItem = async () => {
    if (!selectedChecklist || !newItemTitle.trim() || !activeNetworkId || !activeUnitId) return;

    const nextOrder = selectedChecklist.items.length + 1;
    const success = await checklistService.addChecklistItem(activeNetworkId, selectedChecklist.id, {
      title: newItemTitle,
      orderIndex: nextOrder
    });

    if (success) {
      toast.success("Item adicionado");
      setNewItemTitle("");
      setIsAddingItem(false);
      // Reload checklist to get the new item with its real ID
      const updatedData = await checklistService.getTodayChecklists(activeNetworkId, activeUnitId);
      const refreshed = updatedData.find(c => c.id === selectedChecklist.id);
      if (refreshed) setSelectedChecklist(refreshed);
    } else {
      toast.error("Erro ao adicionar item");
    }
  };

  const handleEditChecklist = async () => {
    if (!selectedChecklist || !editChecklistName.trim() || !activeNetworkId) return;

    const finalName = editChecklistSector 
      ? `${editChecklistName.trim()} [${editChecklistSector}]` 
      : editChecklistName.trim();

    // Convert time format to ensure it's compatible if needed, or send as is
    const success = await checklistService.updateChecklist(activeNetworkId, selectedChecklist.id, { 
      name: finalName,
      timefenceStart: editTimefenceStart ? `${editTimefenceStart}:00` : null,
      timefenceEnd: editTimefenceEnd ? `${editTimefenceEnd}:00` : null
    });
    
    if (success) {
      toast.success("Checklist atualizado");
      setSelectedChecklist({ 
        ...selectedChecklist, 
        name: finalName,
        timefenceStart: editTimefenceStart || null,
        timefenceEnd: editTimefenceEnd || null
      });
      setIsEditingChecklist(false);
      loadChecklists();
    } else {
      toast.error("Erro ao atualizar checklist");
    }
  };

  const handleRestoreDefaults = async () => {
    if (!activeUnitId) return;
    try {
      setLoading(true);
      setIsRestoring(false);
      
      const snap = await getDocs(query(collectionGroup(db, 'units'), where('id', '==', activeUnitId)));
      const networkId = snap.empty ? null : snap.docs[0].ref.parent.parent?.id;
        
      if (networkId) {
        await checklistService.seedOperationalChecklists(networkId);
        toast.success("Checklists padrões restaurados com sucesso no Firebase!");
        await loadChecklists();
      } else {
        toast.error("Erro ao identificar a rede da unidade.");
      }
    } catch (error) {
      toast.error("Erro ao restaurar checklists");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Gerenciar Checklists">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gerenciar Checklists">
      <PageHeader
        title="Gerenciar Checklists"
        subtitle={selectedChecklist ? `Editando: ${selectedChecklist.name}` : "Selecione um checklist para editar"}
        showBack
        onBack={selectedChecklist ? () => setSelectedChecklist(null) : undefined}
        actions={
          !selectedChecklist && (
            <Button size="sm" variant="outline" onClick={() => setIsRestoring(true)}>
              <ClipboardCheck className="w-4 h-4 mr-1" />
              Restaurar Padrões
            </Button>
          )
        }
      />

      <div className="p-4 space-y-4">
        {!selectedChecklist ? (
          <div className="space-y-3">
            {checklists.map((checklist) => (
              <div 
                key={checklist.id} 
                className="list-item cursor-pointer group hover:border-primary/50"
                onClick={() => setSelectedChecklist(checklist)}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{checklist.name.replace(/\[.*?\]/, "").trim()}</span>
                    {checklist.name.match(/\[(.*?)\]/) && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {checklist.name.match(/\[(.*?)\]/)?.[1]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{checklist.totalItems} itens</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Checklist Actions */}
            <div className="flex items-center justify-between gap-2 bg-muted/30 p-3 rounded-xl border">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <h3 className="font-bold truncate">{selectedChecklist.name.replace(/\[.*?\]/, "").trim()}</h3>
                {selectedChecklist.name.match(/\[(.*?)\]/) && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                    {selectedChecklist.name.match(/\[(.*?)\]/)?.[1]}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  let name = selectedChecklist.name;
                  let sector = "";
                  for (const s of ["Cozinha", "Bar", "Salão", "Delivery"]) {
                    if (name.includes(`[${s}]`)) {
                      sector = s;
                      name = name.replace(`[${s}]`, "").trim();
                      break;
                    }
                  }
                  
                  setEditChecklistName(name);
                  setEditChecklistSector(sector);
                  // Strip seconds when loading to type="time" input
                  setEditTimefenceStart(selectedChecklist.timefenceStart?.substring(0, 5) || "");
                  setEditTimefenceEnd(selectedChecklist.timefenceEnd?.substring(0, 5) || "");
                  setIsEditingChecklist(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-1" /> Configurações
                </Button>
                <Button size="sm" onClick={() => setIsAddingItem(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Novo Item
                </Button>
              </div>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                Itens do Checklist
              </h4>
              {selectedChecklist.items.map((item, index) => (
                <div key={item.id} className="bg-card border rounded-xl p-4 flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  
                  {editingItem?.id === item.id ? (
                    <div className="flex-1 flex gap-2">
                      <Input 
                        value={editingItem.title} 
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        autoFocus
                      />
                      <Button size="icon" onClick={handleUpdateItem}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingItem(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 font-medium">
                        {item.title}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingItem({ id: item.id, title: item.title })}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Item</Label>
              <Input 
                id="title" 
                placeholder="Ex: Verificar validade do salmão" 
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)}>Cancelar</Button>
            <Button onClick={handleAddItem}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Checklist Dialog */}
      <Dialog open={isEditingChecklist} onOpenChange={setIsEditingChecklist}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações do Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Checklist</Label>
              <Input 
                id="name" 
                value={editChecklistName}
                onChange={(e) => setEditChecklistName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Setor / Área</Label>
              <Select value={editChecklistSector || "nenhum"} onValueChange={(v) => setEditChecklistSector(v === "nenhum" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum setor específico</SelectItem>
                  {["Cozinha", "Bar", "Salão", "Delivery"].map(sector => (
                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_start">Horário Inicial</Label>
                <Input 
                  id="time_start" 
                  type="time" 
                  value={editTimefenceStart}
                  onChange={(e) => setEditTimefenceStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time_end">Horário Final</Label>
                <Input 
                  id="time_end" 
                  type="time" 
                  value={editTimefenceEnd}
                  onChange={(e) => setEditTimefenceEnd(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Se preenchidos, o checklist só poderá ser respondido dentro desta janela de horário.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingChecklist(false)}>Cancelar</Button>
            <Button onClick={handleEditChecklist}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Defaults Dialog */}
      <Dialog open={isRestoring} onOpenChange={setIsRestoring}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Restaurar Checklists Padrão</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Esta ação irá recrear todos os checklists padrões do sistema (ex: BOWL, POKE) caso eles não existam ou tenham sido apagados incorretamente.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRestoring(false)}>Cancelar</Button>
            <Button onClick={handleRestoreDefaults}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ChecklistManager;
