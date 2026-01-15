import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Users as UsersIcon, Search, Mail, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppRole, roleLabels } from "@/types/database";

// Mock data
const mockUsers = [
  { 
    id: 1, 
    name: "João Silva", 
    email: "joao@email.com",
    role: "gerente" as AppRole,
    unit: "Loja Centro",
    isActive: true 
  },
  { 
    id: 2, 
    name: "Maria Santos", 
    email: "maria@email.com",
    role: "lider_turno" as AppRole,
    unit: "Loja Centro",
    isActive: true 
  },
  { 
    id: 3, 
    name: "Carlos Oliveira", 
    email: "carlos@email.com",
    role: "operador" as AppRole,
    unit: "Loja Shopping Norte",
    isActive: true 
  },
  { 
    id: 4, 
    name: "Ana Costa", 
    email: "ana@email.com",
    role: "operador" as AppRole,
    unit: "Loja Centro",
    isActive: false 
  },
];

const roleColors: Record<AppRole, string> = {
  operador: "bg-secondary text-secondary-foreground",
  lider_turno: "bg-info/15 text-info",
  gerente: "bg-warning/15 text-warning",
  admin_rede: "bg-primary/15 text-primary",
};

const Users = () => {
  const [search, setSearch] = useState("");

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <AppLayout title="Equipe">
      <PageHeader
        title="Equipe"
        subtitle="Usuários e permissões"
        showBack
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users List */}
        {filteredUsers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Nenhum usuário encontrado"
            description="Tente buscar por outro termo"
          />
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="list-item cursor-pointer">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{user.name}</span>
                    {!user.isActive && (
                      <StatusBadge status="inactive" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.unit}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                    <Shield className="w-3 h-3" />
                    {roleLabels[user.role]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Users;
