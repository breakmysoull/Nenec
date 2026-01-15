import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Building2, MapPin, Phone, ChevronRight, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

// Mock data
const mockUnits = [
  { 
    id: 1, 
    name: "Loja Centro", 
    code: "LC-001",
    address: "Av. Paulista, 1000",
    city: "São Paulo",
    state: "SP",
    phone: "(11) 99999-9999",
    isActive: true,
    employeeCount: 15,
    shiftsCount: 3
  },
  { 
    id: 2, 
    name: "Loja Shopping Norte", 
    code: "LSN-002",
    address: "Av. Norte Sul, 500",
    city: "São Paulo",
    state: "SP",
    phone: "(11) 88888-8888",
    isActive: true,
    employeeCount: 12,
    shiftsCount: 3
  },
  { 
    id: 3, 
    name: "Loja Zona Leste", 
    code: "LZL-003",
    address: "Rua das Flores, 200",
    city: "São Paulo",
    state: "SP",
    phone: "(11) 77777-7777",
    isActive: false,
    employeeCount: 0,
    shiftsCount: 0
  },
];

const Units = () => {
  return (
    <AppLayout title="Unidades">
      <PageHeader
        title="Unidades"
        subtitle="Lojas da rede"
        showBack
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {mockUnits.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Nenhuma unidade"
            description="Adicione a primeira unidade da rede"
            actionLabel="Adicionar Unidade"
            onAction={() => {}}
          />
        ) : (
          <div className="space-y-3">
            {mockUnits.map((unit) => (
              <div key={unit.id} className="list-item cursor-pointer group flex-col items-stretch gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl ${
                    unit.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{unit.name}</span>
                      <StatusBadge status={unit.isActive ? "active" : "inactive"} />
                    </div>
                    <p className="text-sm text-muted-foreground">{unit.code}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pl-14">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{unit.city}, {unit.state}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{unit.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{unit.employeeCount} funcionários</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Units;
