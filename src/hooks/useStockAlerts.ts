import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
  const [lowStockItems, setLowStockItems] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const normalizedUnitId = activeUnitId === "null" ? null : activeUnitId;

  useEffect(() => {
    if (!normalizedUnitId && !isSuperAdmin) {
      setLowStockItems([]);
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        let query = supabase
          .from('vw_unit_stock' as never)
          .select('*');

        if (normalizedUnitId) {
          query = query.eq('unit_id', normalizedUnitId);
        } else if (!isSuperAdmin) {
          setLowStockItems([]);
          setLoading(false);
          return;
        }

        const { data, error } = await query;

        if (error) {
          // If view doesn't exist (42P01), we might need a fallback, 
          // but per instructions we expect it to exist.
          console.error('Error fetching stock alerts from view:', error);
          throw error;
        }

        // Filter for low stock
        const alerts = ((data || []) as StockAlertRow[])
          .map((item) => ({
            id: item.id || "",
            name: item.name || "",
            current_stock: Number(item.current_stock || 0),
            min_stock: Number(item.min_stock || 0),
            unit_measure: item.unit_measure || "",
          }))
          .filter((item) => item.current_stock <= item.min_stock && item.min_stock > 0);

        setLowStockItems(alerts);
      } catch (error) {
        console.error('Failed to fetch stock alerts:', error);
        // Fallback: don't crash, just show no alerts
        setLowStockItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    // Set up realtime subscription if needed later
    // const subscription = supabase...

  }, [normalizedUnitId, isSuperAdmin]);

  return {
    lowStockItems,
    critical: lowStockItems,
    count: lowStockItems.length,
    loading
  };
}
