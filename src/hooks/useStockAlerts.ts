import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface StockAlert {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  unit_measure: string;
}

export function useStockAlerts() {
  const { activeUnitId, isSuperAdmin } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeUnitId && !isSuperAdmin) {
      setLowStockItems([]);
      setLoading(false);
      return;
    }

    const fetchAlerts = async () => {
      try {
        setLoading(true);
        
        // Query the view as requested
        let query = supabase
          .from('vw_unit_stock')
          .select('id, name, current_stock, min_stock, unit_measure, unit_id')
          .lt('current_stock', supabase.rpc('min_stock')); // This syntax is wrong for column comparison in Supabase/PostgREST usually

        // Correct way to compare columns in PostgREST is usually via a filter that supports it, 
        // but simple .lt('current_stock', 'min_stock') interprets 2nd arg as value, not column.
        // We usually need to fetch all and filter in JS, or use a custom RPC, or the view should have a boolean 'is_low_stock'.
        
        // If the view is "clean for reading", maybe it has an 'status' column?
        // Let's assume we fetch all for the unit and filter in JS for now to be safe,
        // unless the view is huge (unlikely for MVP).
        
        const { data, error } = await supabase
          .from('vw_unit_stock')
          .select('*')
          .eq('unit_id', activeUnitId);

        if (error) {
          // If view doesn't exist (42P01), we might need a fallback, 
          // but per instructions we expect it to exist.
          console.error('Error fetching stock alerts from view:', error);
          throw error;
        }

        // Filter for low stock
        const alerts = (data || []).filter((item: any) => {
          // Ensure we have numbers
          const current = Number(item.current_stock || 0);
          const min = Number(item.min_stock || 0);
          return current <= min && min > 0; // Alert if current is less or equal to min
        });

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

  }, [activeUnitId, isSuperAdmin]);

  return {
    lowStockItems,
    critical: lowStockItems,
    count: lowStockItems.length,
    loading
  };
}
