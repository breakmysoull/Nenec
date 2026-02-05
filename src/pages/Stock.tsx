import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Package, ArrowDown, ArrowUp, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { usePermissions } from "@/contexts/PermissionsContext";

// Interface for stock data
interface StockItem {
  id: string;
  name: string;
  unit_measure: string;
  min_stock: number;
  current_stock: number;
}

type StockViewRow = {
  ingredient_id?: string | null;
  id?: string | null;
  name?: string | null;
  unit_measure?: string | null;
  min_stock?: number | null;
  current_stock?: number | null;
};

const Stock = () => {
  const { roles, isSuperAdmin, activeUnitId } = usePermissions();
  const [search, setSearch] = useState("");
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current unit from roles (fallback if no activeUnitId)
  const currentUnitId = roles?.[0]?.unit_id;

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      
      // Step 3.3.4: Use clean view for reading stock
      let query = supabase
        .from('vw_unit_stock' as never)
        .select('*');

      // Filter by unit if not super admin or if super admin selected a unit
      // Note: activeUnitId comes from AuthContext, currentUnitId comes from roles.
      // We should prefer activeUnitId for the multi-unit selector logic.
      if (activeUnitId) {
        query = query.eq('unit_id', activeUnitId);
      } else if (currentUnitId) {
        query = query.eq('unit_id', currentUnitId);
      }
      
      const { data, error } = await query;

      if (error) throw error;

      const rows = (data || []) as StockViewRow[];
      const formattedData = rows.map((item) => ({
        id: item.ingredient_id || item.id || "",
        name: item.name || "",
        unit_measure: item.unit_measure || "",
        min_stock: item.min_stock || 0,
        current_stock: item.current_stock || 0,
      }));

      setStockItems(formattedData);
    } catch (error) {
      const maybeError = error as { code?: string };
      // Fallback for development if view is missing
      if (maybeError?.code === '42P01') {
         toast.error("View 'vw_unit_stock' não encontrada. Verifique o banco de dados.");
      } else {
         toast.error("Erro ao carregar estoque");
      }
    } finally {
      setLoading(false);
    }
  }, [activeUnitId, currentUnitId]);

  useEffect(() => {
    if (activeUnitId || currentUnitId || isSuperAdmin) {
      fetchStock();
    } else {
      setLoading(false);
    }
  }, [activeUnitId, currentUnitId, isSuperAdmin, fetchStock]);

  const registerStockMovement = async (ingredientId: string, quantity: number, type: 'compra' | 'producao' | 'venda' | 'perda' | 'ajuste') => {
    if (!currentUnitId) {
      toast.error("Unidade não identificada");
      return;
    }

    try {
      // ETAPA 7: USAR RPC (MOVIMENTAÇÃO DE ESTOQUE)
      const { error } = await supabase.rpc('register_stock_movement' as never, {
        p_unit_id: currentUnitId,
        p_ingredient_id: ingredientId,
        p_quantity: quantity,
        p_type: type,
      });

      if (error) throw error;

      toast.success("Movimentação registrada com sucesso");
      fetchStock(); // Refresh list
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao registrar movimentação";
      toast.error("Erro ao registrar movimentação: " + message);
    }
  };

  const filteredStock = stockItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStockStatus = (current: number, min: number) => {
    // If no stock tracking yet, return ok
    if (current === 0 && min === 0) return "ok";
    
    const ratio = current / (min || 1);
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
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredStock.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum item encontrado"
            description={stockItems.length === 0 ? "Nenhum ingrediente cadastrado" : "Tente buscar por outro termo"}
          />
        ) : (
          <div className="space-y-3">
            {filteredStock.map((item) => {
              const status = getStockStatus(item.current_stock, item.min_stock);
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
                      Mínimo: {item.min_stock} {item.unit_measure}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${
                      status === "critical" ? "text-destructive" : 
                      status === "warning" ? "text-warning" : "text-foreground"
                    }`}>
                      {item.current_stock}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.unit_measure}</p>
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
