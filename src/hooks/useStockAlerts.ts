import { useQuery } from '@tanstack/react-query';
import { stockService } from '@/services/stockService';
import { usePermissions } from '@/contexts/PermissionsContext';

export interface StockAlert {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit_measure: string;
}

type StockAlertRow = {
  id?: string | null;
  name?: string | null;
  current_stock?: number | null;
  min_stock?: number | null;
  unit_measure?: string | null;
};

export function useStockAlerts() {
  const { activeUnitId, isSuperAdmin } = usePermissions();
  const normalizedUnitId = activeUnitId === "null" ? null : activeUnitId;

  const { data: lowStockItems = [], isLoading: loading } = useQuery({
    queryKey: ['stock-alerts', normalizedUnitId, isSuperAdmin],
    queryFn: async () => {
      if (!normalizedUnitId && !isSuperAdmin) {
        return [];
      }

      const data = await stockService.getInventory(normalizedUnitId || undefined);

      return data
        .map((item) => ({
          id: item.id || "",
          name: item.ingredient_name || "",
          current_stock: Number(item.stock || 0),
          min_stock: Number(item.minimum_stock || 0),
          unit_measure: item.unit_measure || "",
        }))
        .filter((item) => item.current_stock <= item.min_stock && item.min_stock > 0);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  return {
    lowStockItems,
    critical: lowStockItems,
    count: lowStockItems.length,
    loading
  };
}
