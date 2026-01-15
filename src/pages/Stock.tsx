import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Package, ArrowDown, ArrowUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// Mock data
const mockStock = [
  { id: 1, name: "Hambúrguer 180g", current: 45, min: 50, unit: "un", status: "critical" },
  { id: 2, name: "Pão de Hambúrguer", current: 120, min: 100, unit: "un", status: "ok" },
  { id: 3, name: "Queijo Cheddar", current: 8, min: 10, unit: "kg", status: "warning" },
  { id: 4, name: "Batata Congelada", current: 25, min: 20, unit: "kg", status: "ok" },
  { id: 5, name: "Alface Americana", current: 3, min: 5, unit: "kg", status: "critical" },
];

const Stock = () => {
  const [search, setSearch] = useState("");

  const filteredStock = mockStock.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (current: number, min: number) => {
    const ratio = current / min;
    if (ratio < 0.8) return "critical";
    if (ratio < 1) return "warning";
    return "ok";
  };

  return (
    <AppLayout title="Estoque">
      <PageHeader
        title="Estoque"
        subtitle="Controle de ingredientes"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Movimento
          </Button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stock List */}
        {filteredStock.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum item encontrado"
            description="Tente buscar por outro termo"
          />
        ) : (
          <div className="space-y-3">
            {filteredStock.map((item) => {
              const status = getStockStatus(item.current, item.min);
              return (
                <div
                  key={item.id}
                  className="list-item"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{item.name}</span>
                      {status === "critical" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-destructive/15 text-destructive uppercase">
                          Crítico
                        </span>
                      )}
                      {status === "warning" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-warning/15 text-warning uppercase">
                          Baixo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mínimo: {item.min} {item.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      status === "critical" ? "text-destructive" : 
                      status === "warning" ? "text-warning" : "text-foreground"
                    }`}>
                      {item.current}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.unit}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <ArrowDown className="w-5 h-5 text-success" />
            <span>Entrada</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2">
            <ArrowUp className="w-5 h-5 text-destructive" />
            <span>Saída/Perda</span>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Stock;
