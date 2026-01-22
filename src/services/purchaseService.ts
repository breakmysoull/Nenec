
import { supabase } from "@/lib/supabase";

export const purchaseService = {
  /**
   * Receives a purchase order, updating its status to 'entregue' and registering stock movements.
   * This calls the 'receive_purchase_order' RPC function in Supabase.
   * 
   * @param purchaseOrderId The UUID of the purchase order to receive
   */
  receivePurchaseOrder: async (purchaseOrderId: string): Promise<void> => {
    const { error } = await supabase.rpc('receive_purchase_order', {
      p_purchase_order_id: purchaseOrderId
    });

    if (error) {
      console.error('Error receiving purchase order:', error);
      throw error;
    }
  }
};
