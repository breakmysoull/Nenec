import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus, Users as UsersIcon, Search, Mail, Shield, Loader2, Edit,
  Trash2, Building2, GraduationCap, CheckCircle2, Clock, BookOpen, X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AppRole, roleLabels } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";
import { canManageUser, canCreateRole } from "@/lib/permissions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  unit: string;
  unitId: string;
  isActive: boolean;
}

type UserRoleRow = {
  id: string;
  role: AppRole;
  is_active: boolean;
  user_id: string;
  unit_id: string | null;
  profiles?: { full_name: string | null; email: string } | null;
  units?: { name: string | null } | null;
};

type TrainingRow = {
  id: string;
  name: string;
  description: string | null;
};

type UserTrainingProgress = {
  training_id: string;
  status: string;
  score: number | null;
  started_at: string | null;
  completed_at: string | null;
};

const roleColors: Record<string, string> = {
  super_admin: "bg-purple-900 text-purple-100",
  admin: "bg-primary/15 text-primary",
  manager: "bg-warning/15 text-warning",
  operator: "bg-secondary text-secondary-foreground",
  operador: "bg-secondary text-secondary-foreground",
  trainee: "bg-emerald-500/15 text-emerald-600",
  lider_turno: "bg-info/15 text-info",
  gerente: "bg-warning/15 text-warning",
  admin_rede: "bg-primary/15 text-primary",
};

const Users = () => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserData[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [trainings, setTrainings] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { baseRole: currentUserRole, isSuperAdmin, roles } = usePermissions();

  // User Dialog (create/edit)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator" as AppRole,
    unitId: "",
    cpf: "",
  });

  // Training Drawer
  const [trainingDrawerUser, setTrainingDrawerUser] = useState<UserData | null>(null);
  const [userProgress, setUserProgress] = useState<UserTrainingProgress[]>([]);
  const [trainingDrawerLoading, setTrainingDrawerLoading] = useState(false);
  const [assigningTraining, setAssigningTraining] = useState<string | null>(null);

  const currentNetworkId = roles?.[0]?.network_id;

  const fetchUnits = useCallback(async () => {
    const { data } = await supabase.from("units").select("id, name");
    if (data) setUnits(data);
  }, []);

  const fetchTrainings = useCallback(async () => {
    if (!currentNetworkId) return;
    const { data } = await supabase
      .from("trainings")
      .select("id, name, description")
      .eq("network_id", currentNetworkId)
      .eq("is_active", true);
    if (data) setTrainings(data as TrainingRow[]);
  }, [currentNetworkId]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("user_roles")
        .select(`
          id, role, is_active, user_id, unit_id,
          profiles:user_id ( full_name, email ),
          units:unit_id ( name )
        `);

      if (!isSuperAdmin && currentNetworkId) {
        query = query.eq("network_id", currentNetworkId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []) as UserRoleRow[];
      setUsers(
        rows.map((item) => ({
          id: item.user_id,
          name: item.profiles?.full_name || "Usuário sem nome",
          email: item.profiles?.email || "Sem email",
          role: item.role,
          unit: item.units?.name || "Todas",
          unitId: item.unit_id || "",
          isActive: item.is_active,
        }))
      );
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, [currentNetworkId, isSuperAdmin]);

  useEffect(() => {
    if (currentNetworkId || isSuperAdmin) {
      fetchUsers();
      fetchUnits();
      fetchTrainings();
    } else {
      setLoading(false);
    }
  }, [currentNetworkId, isSuperAdmin, fetchUsers, fetchUnits, fetchTrainings]);

  // --- Create/Edit User ---
  const handleOpenDialog = (user?: UserData) => {
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name, 
        email: user.email, 
        password: "", 
        role: user.role, 
        unitId: user.unitId || "",
        cpf: (user as any).cpf || ""
      });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "operator", unitId: "", cpf: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.email || !formData.role) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    if (!canCreateRole(currentUserRole, formData.role)) {
      toast.error("Você não tem permissão para atribuir este cargo");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Update role in user_roles
        const { error } = await (supabase as any)
          .from("user_roles")
          .update({ role: formData.role, unit_id: formData.unitId || null })
          .eq("user_id", editingUser.id);

        if (error) throw error;

        // Update profile name if changed
        if (formData.name && formData.name !== editingUser.name) {
          await supabase
            .from("profiles")
            .update({ full_name: formData.name })
            .eq("id", editingUser.id);
        }

        toast.success("Usuário atualizado!");
      } else {
        // Handle CPF based login logic
        let userEmail = formData.email;
        let userPassword = formData.password;

        if (formData.cpf) {
          const cleanCpf = formData.cpf.replace(/\D/g, "");
          userEmail = `${cleanCpf}@codex.internal`;
          if (!userPassword) {
            userPassword = cleanCpf.slice(-4);
          }
        }

        if (!userEmail) throw new Error("E-mail ou CPF obrigatório");

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userEmail,
          password: userPassword || Math.random().toString(36).slice(-10) + "A1!",
          options: {
            data: { 
              full_name: formData.name,
              cpf: formData.cpf.replace(/\D/g, "")
            },
          },
        });

        if (authError) throw authError;

        const newUserId = authData.user?.id;
        if (!newUserId) throw new Error("Falha ao criar usuário");

        // Ensure profile exists
        await supabase.from("profiles").upsert({
          id: newUserId,
          full_name: formData.name,
          email: userEmail,
          cpf: formData.cpf.replace(/\D/g, "")
        } as any);

        // Create role
        const { error: roleError } = await (supabase as any).from("user_roles").insert({
          user_id: newUserId,
          role: formData.role,
          unit_id: formData.unitId || null,
          network_id: currentNetworkId || null,
          is_active: true,
        });

        if (roleError) throw roleError;

        toast.success(`Usuário ${formData.name || userEmail} criado!`);
      }

      setIsDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  // --- Toggle Active ---
  const handleToggleActive = async (user: UserData) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ is_active: !user.isActive })
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success(user.isActive ? "Usuário desativado" : "Usuário reativado");
      fetchUsers();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  // --- Delete User ---
  const handleDeleteUser = async (user: UserData) => {
    if (!confirm(`Excluir ${user.name}? Esta ação removerá o acesso ao sistema. Os dados de treinamento serão mantidos.`)) return;
    try {
      // Remove role (effectively blocks login via RLS)
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success("Acesso do usuário revogado");
      fetchUsers();
    } catch {
      toast.error("Erro ao excluir usuário");
    }
  };

  // --- Training Drawer ---
  const openTrainingDrawer = async (user: UserData) => {
    setTrainingDrawerUser(user);
    setTrainingDrawerLoading(true);

    const { data } = await supabase
      .from("user_training_progress")
      .select("training_id, status, score, started_at, completed_at")
      .eq("user_id", user.id);

    setUserProgress((data as UserTrainingProgress[]) || []);
    setTrainingDrawerLoading(false);
  };

  const handleAssignTraining = async (trainingId: string) => {
    if (!trainingDrawerUser) return;
    setAssigningTraining(trainingId);
    try {
      // Check if already exists
      const existing = userProgress.find((p) => p.training_id === trainingId);
      if (existing) {
        toast.info("Treinamento já atribuído");
        return;
      }

      const { error } = await supabase.from("user_training_progress").insert({
        user_id: trainingDrawerUser.id,
        training_id: trainingId,
        status: "pendente",
        started_at: null,
        score: 0,
      });

      if (error) throw error;

      toast.success("Treinamento atribuído!");
      // Refresh progress
      const { data } = await supabase
        .from("user_training_progress")
        .select("training_id, status, score, started_at, completed_at")
        .eq("user_id", trainingDrawerUser.id);
      setUserProgress((data as UserTrainingProgress[]) || []);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atribuir treinamento");
    } finally {
      setAssigningTraining(null);
    }
  };

  const handleRemoveTraining = async (trainingId: string) => {
    if (!trainingDrawerUser) return;
    if (!confirm("Remover este treinamento do usuário? O progresso será apagado.")) return;
    try {
      await supabase
        .from("user_training_progress")
        .delete()
        .eq("user_id", trainingDrawerUser.id)
        .eq("training_id", trainingId);

      const { data } = await supabase
        .from("user_training_progress")
        .select("training_id, status, score, started_at, completed_at")
        .eq("user_id", trainingDrawerUser.id);
      setUserProgress((data as UserTrainingProgress[]) || []);
      toast.success("Treinamento removido");
    } catch {
      toast.error("Erro ao remover treinamento");
    }
  };

  const getProgressIcon = (status: string) => {
    if (status === "concluido") return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === "em_andamento") return <Clock className="w-4 h-4 text-warning" />;
    return <BookOpen className="w-4 h-4 text-muted-foreground" />;
  };

  const getProgressLabel = (status: string) => {
    if (status === "concluido") return "Concluído";
    if (status === "em_andamento") return "Em andamento";
    return "Pendente";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const availableRoles: AppRole[] = (
    ["admin", "manager", "operator", "trainee"] as AppRole[]
  ).filter((r) => canCreateRole(currentUserRole, r));

  // Training completion summary for the drawer header
  const completedCount = userProgress.filter((p) => p.status === "concluido").length;
  const totalCount = userProgress.length;

  return (
    <AppLayout title="Equipe">
      <PageHeader
        title="Equipe"
        subtitle={`${users.length} usuário${users.length !== 1 ? "s" : ""} na rede`}
        showBack
        actions={
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-1" />
            Novo Usuário
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Row */}
        {!loading && users.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-primary/10 rounded-xl text-center">
              <p className="text-xl font-bold text-primary">{users.filter(u => u.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <div className="p-3 bg-muted rounded-xl text-center">
              <p className="text-xl font-bold">{users.filter(u => !u.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Inativos</p>
            </div>
            <div className="p-3 bg-success/10 rounded-xl text-center">
              <p className="text-xl font-bold text-success">{units.length}</p>
              <p className="text-xs text-muted-foreground">Unidades</p>
            </div>
          </div>
        )}

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum usuário encontrado"
            description={
              users.length === 0
                ? "Crie o primeiro usuário para começar"
                : "Tente buscar por outro termo"
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "bg-card border rounded-xl p-4 shadow-sm",
                  !user.isActive && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{user.name}</span>
                      {!user.isActive && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          INATIVO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Building2 className="w-3 h-3" />
                      <span>{user.unit}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        roleColors[user.role] || "bg-muted text-muted-foreground"
                      )}
                    >
                      <Shield className="w-3 h-3" />
                      {roleLabels[user.role] || user.role}
                    </span>
                  </div>
                </div>

                {/* Action Row */}
                {canManageUser(currentUserRole, user.role) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => handleOpenDialog(user)}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Editar Cargo
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => openTrainingDrawer(user)}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1" />
                      Treinamentos
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className={cn("h-8 text-xs ml-auto", user.isActive ? "text-muted-foreground" : "text-success")}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? "Desativar" : "Reativar"}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => !o && setIsDialogOpen(false)}>
        <DialogContent className="w-[95%] max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                placeholder="Ex: João Silva"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CPF (para login)</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  disabled={!!editingUser}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail (opcional)</Label>
                <Input
                  placeholder="joao@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                  type="email"
                />
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label>Senha inicial</Label>
                <Input
                  placeholder="Mínimo 8 caracteres"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.cpf 
                    ? `Se vazio, a senha será os 4 últimos dígitos do CPF: ${formData.cpf.replace(/\D/g, "").slice(-4)}`
                    : "Se vazio, uma senha aleatória será gerada."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(v) => setFormData({ ...formData, role: v as AppRole })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role] || role}
                      </SelectItem>
                    ))}
                    {editingUser && !availableRoles.includes(editingUser.role) && (
                      <SelectItem value={editingUser.role} disabled>
                        {roleLabels[editingUser.role] || editingUser.role} (Atual)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select
                  value={formData.unitId || "_all"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, unitId: v === "_all" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">Todas as unidades</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={(!formData.email && !formData.cpf) || !formData.role || saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Assignment Drawer */}
      <Drawer
        open={!!trainingDrawerUser}
        onOpenChange={(o) => !o && setTrainingDrawerUser(null)}
      >
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-lg h-full flex flex-col">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Treinamentos — {trainingDrawerUser?.name}
              </DrawerTitle>
              {!trainingDrawerLoading && totalCount > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso geral</span>
                    <span>{completedCount}/{totalCount} concluídos</span>
                  </div>
                  <Progress
                    value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
                    className="h-2"
                  />
                </div>
              )}
            </DrawerHeader>

            <div className="flex-1 overflow-y-auto px-4 space-y-5 pb-4">
              {trainingDrawerLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Assigned Trainings */}
                  {userProgress.length > 0 && (
                    <section className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Atribuídos ({userProgress.length})
                      </h4>
                      {userProgress.map((p) => {
                        const training = trainings.find((t) => t.id === p.training_id);
                        return (
                          <div
                            key={p.training_id}
                            className="flex items-center gap-3 p-3 bg-card border rounded-xl"
                          >
                            {getProgressIcon(p.status)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {training?.name || "Treinamento removido"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {getProgressLabel(p.status)}
                                {p.score !== null && p.score > 0
                                  ? ` · ${p.score}%`
                                  : ""}
                                {p.completed_at
                                  ? ` · Concluído em ${new Date(p.completed_at).toLocaleDateString("pt-BR")}`
                                  : ""}
                              </p>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                              onClick={() => handleRemoveTraining(p.training_id)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </section>
                  )}

                  {/* Available Trainings to Assign */}
                  <section className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Atribuir Treinamento
                    </h4>
                    {trainings.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
                        Sem treinamentos disponíveis. Crie um em Gerenciar &gt; Treinamentos.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {trainings
                          .filter((t) => !userProgress.find((p) => p.training_id === t.id))
                          .map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 p-3 bg-muted/30 border border-dashed rounded-xl"
                            >
                              <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{t.name}</p>
                                {t.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                className="h-8 shrink-0"
                                onClick={() => handleAssignTraining(t.id)}
                                disabled={assigningTraining === t.id}
                              >
                                {assigningTraining === t.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Plus className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          ))}
                        {trainings.every((t) =>
                          userProgress.find((p) => p.training_id === t.id)
                        ) && (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            Todos os treinamentos já foram atribuídos. ✅
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            <DrawerFooter>
              <Button variant="outline" onClick={() => setTrainingDrawerUser(null)}>
                Fechar
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </AppLayout>
  );
};

export default Users;
