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

const ChecklistManager = () => {
  const { activeUnitId } = usePermissions();
  const [checklists, setChecklists] = useState<TodayChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<TodayChecklist | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string, title: string } | null>(null);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isRenamingChecklist, setIsRenamingChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");

  useEffect(() => {
    loadChecklists();
  }, [activeUnitId]);

  const loadChecklists = async () => {
    if (!activeUnitId) return;
    setLoading(true);
    try {
      const data = await checklistService.getTodayChecklists(activeUnitId);
      setChecklists(data);
    } catch (error) {
      toast.error("Erro ao carregar checklists");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.title.trim()) return;
    
    const success = await checklistService.updateChecklistItem(editingItem.id, { title: editingItem.title });
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

    const success = await checklistService.deleteChecklistItem(itemId);
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
    if (!selectedChecklist || !newItemTitle.trim()) return;

    const nextOrder = selectedChecklist.items.length + 1;
    const success = await checklistService.addChecklistItem(selectedChecklist.id, {
      title: newItemTitle,
      order_index: nextOrder
    });

    if (success) {
      toast.success("Item adicionado");
      setNewItemTitle("");
      setIsAddingItem(false);
      // Reload checklist to get the new item with its real ID
      const updatedData = await checklistService.getTodayChecklists(activeUnitId!);
      const refreshed = updatedData.find(c => c.id === selectedChecklist.id);
      if (refreshed) setSelectedChecklist(refreshed);
    } else {
      toast.error("Erro ao adicionar item");
    }
  };

  const handleRenameChecklist = async () => {
    if (!selectedChecklist || !newChecklistName.trim()) return;

    const success = await checklistService.updateChecklist(selectedChecklist.id, { name: newChecklistName });
    if (success) {
      toast.success("Checklist renomeado");
      setSelectedChecklist({ ...selectedChecklist, name: newChecklistName });
      setIsRenamingChecklist(false);
      loadChecklists();
    } else {
      toast.error("Erro ao renomear checklist");
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
                  <span className="font-bold text-lg">{checklist.name}</span>
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
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{selectedChecklist.name}</h3>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => {
                  setNewChecklistName(selectedChecklist.name);
                  setIsRenamingChecklist(true);
                }}>
                  <Edit2 className="w-4 h-4 mr-1" /> Renomear
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

      {/* Rename Checklist Dialog */}
      <Dialog open={isRenamingChecklist} onOpenChange={setIsRenamingChecklist}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Checklist</Label>
              <Input 
                id="name" 
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenamingChecklist(false)}>Cancelar</Button>
            <Button onClick={handleRenameChecklist}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ChecklistManager;
